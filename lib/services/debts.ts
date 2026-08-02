import {
  Prisma,
  type Debt,
  type DebtDirection,
  type DebtPayment,
  type DebtStatus,
  type PaymentMethod,
} from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import {
  buildFxSnapshot,
  normalizeCurrencyCode,
  type MoneyDecimalString,
} from "@/lib/money"
import { writeAuditLog } from "@/lib/services/audit"
import { recomputeCachedBalance } from "@/lib/services/balances"
import { ensureExpenseCategories } from "@/lib/services/categories"
import type {
  CreateDebtInput,
  DebtFilters,
  RecordDebtPaymentInput,
  UpdateDebtInput,
} from "@/lib/validations/debts"

export class DebtServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DebtServiceError"
  }
}

export type DebtListItem = Debt & {
  paidAmount: string
  account: {
    id: string
    name: string
    currency: string
    cachedBalance: Prisma.Decimal
  } | null
  payments: Array<{
    id: string
    amount: Prisma.Decimal
    currency: string
    paymentDate: Date
    notes: string | null
    transactionId: string | null
    deletedAt: Date | null
  }>
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseOptionalDate(value?: string | null) {
  if (!value?.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new DebtServiceError("Invalid date.")
  }
  return date
}

function statusFromAmounts(
  original: Prisma.Decimal,
  remaining: Prisma.Decimal,
  current?: DebtStatus
): DebtStatus {
  if (current === "WRITTEN_OFF" && remaining.gt(0)) return "WRITTEN_OFF"
  if (remaining.lte(0)) return "PAID"
  if (remaining.lt(original)) return "PARTIALLY_PAID"
  return "OPEN"
}

function buildDebtFx(
  amount: string,
  currency: string,
  exchangeRate?: string
) {
  const code = normalizeCurrencyCode(currency)
  if (code !== "USD" && !exchangeRate?.trim()) {
    throw new DebtServiceError(
      "Exchange rate (USD per 1 unit) is required for non-USD debts."
    )
  }
  return buildFxSnapshot({
    amount: amount as MoneyDecimalString,
    currency: code,
    exchangeRate: exchangeRate?.trim() || undefined,
    exchangeRateSource:
      code === "USD"
        ? "FIXED_USD"
        : exchangeRate?.trim()
          ? "USER_OVERRIDE"
          : "MANUAL",
  })
}

async function getOwnedActiveAccount(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  accountId: string
) {
  const account = await client.financialAccount.findFirst({
    where: {
      id: accountId,
      userId,
      deletedAt: null,
      isArchived: false,
    },
  })
  if (!account) {
    throw new DebtServiceError("Select an active account.")
  }
  return account
}

async function sumActivePayments(
  client: Prisma.TransactionClient | typeof prisma,
  debtId: string
) {
  const aggregate = await client.debtPayment.aggregate({
    where: { debtId, deletedAt: null },
    _sum: { amount: true },
  })
  return aggregate._sum.amount ?? new Prisma.Decimal(0)
}

export async function listDebts(
  userId: string,
  filters: DebtFilters = {}
): Promise<DebtListItem[]> {
  const includeDeleted = filters.deleted === "1"
  const rows = await prisma.debt.findMany({
    where: {
      userId,
      deletedAt: includeDeleted ? { not: null } : null,
      ...(filters.direction ? { direction: filters.direction } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.currency
        ? { currency: normalizeCurrencyCode(filters.currency) }
        : {}),
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          currency: true,
          cachedBalance: true,
        },
      },
      payments: {
        where: { deletedAt: null },
        orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          amount: true,
          currency: true,
          paymentDate: true,
          notes: true,
          transactionId: true,
          deletedAt: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  })

  return rows.map((row) => {
    const paid = row.payments.reduce(
      (sum, payment) => sum.plus(payment.amount),
      new Prisma.Decimal(0)
    )
    return {
      ...row,
      paidAmount: paid.toDecimalPlaces(4).toString(),
    }
  })
}

export function summarizeDebts(items: DebtListItem[]) {
  const owedToMe = new Map<string, Prisma.Decimal>()
  const iOwe = new Map<string, Prisma.Decimal>()

  for (const item of items) {
    if (item.deletedAt) continue
    if (item.status === "PAID" || item.status === "WRITTEN_OFF") continue
    if (item.remainingAmount.lte(0)) continue

    const map = item.direction === "LENT_OUT" ? owedToMe : iOwe
    const current = map.get(item.currency) ?? new Prisma.Decimal(0)
    map.set(item.currency, current.plus(item.remainingAmount))
  }

  const toRows = (map: Map<string, Prisma.Decimal>) =>
    [...map.entries()]
      .map(([currency, amount]) => ({
        currency,
        amount: amount.toDecimalPlaces(4).toString(),
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency))

  return {
    owedToMeByCurrency: toRows(owedToMe),
    iOweByCurrency: toRows(iOwe),
    openCount: items.filter(
      (item) =>
        !item.deletedAt &&
        item.status !== "PAID" &&
        item.status !== "WRITTEN_OFF"
    ).length,
  }
}

export async function createDebt(
  userId: string,
  input: CreateDebtInput
): Promise<Debt> {
  const currency = normalizeCurrencyCode(input.currency)
  const fx = buildDebtFx(input.originalAmount, currency, input.exchangeRate)

  let accountId: string | null = null
  if (input.accountId?.trim()) {
    const account = await getOwnedActiveAccount(
      prisma,
      userId,
      input.accountId.trim()
    )
    if (account.currency !== currency) {
      throw new DebtServiceError(
        "Linked account currency must match the debt currency."
      )
    }
    accountId = account.id
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.debt.create({
      data: {
        userId,
        accountId,
        personName: input.personName.trim(),
        direction: input.direction as DebtDirection,
        originalAmount: fx.amount,
        remainingAmount: fx.amount,
        currency: fx.currency,
        exchangeRate: fx.exchangeRate,
        baseAmountUsd: fx.baseAmountUsd,
        exchangeRateAt: fx.exchangeRateAt,
        exchangeRateSource: fx.exchangeRateSource,
        dueDate: parseOptionalDate(input.dueDate),
        status: (input.status ?? "OPEN") as DebtStatus,
        notes: emptyToNull(input.notes),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Debt",
      entityId: created.id,
      action: "CREATE",
      before: null,
      after: created,
      reason: "Debt created",
    })

    return created
  })
}

export async function updateDebt(
  userId: string,
  input: UpdateDebtInput
): Promise<Debt> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.debt.findFirst({
      where: { id: input.id, userId, deletedAt: null },
    })
    if (!existing) {
      throw new DebtServiceError("Debt not found.")
    }

    const currency = normalizeCurrencyCode(input.currency)
    const paid = await sumActivePayments(tx, existing.id)

    if (currency !== existing.currency && paid.gt(0)) {
      throw new DebtServiceError(
        "Cannot change currency after payments have been recorded."
      )
    }

    const fx = buildDebtFx(
      input.originalAmount,
      currency,
      input.exchangeRate ||
        (currency === existing.currency
          ? existing.exchangeRate.toString()
          : undefined)
    )

    if (paid.gt(fx.amount)) {
      throw new DebtServiceError(
        `Original amount cannot be less than paid amount (${paid.toString()} ${currency}).`
      )
    }

    let accountId: string | null = null
    if (input.accountId?.trim()) {
      const account = await getOwnedActiveAccount(
        tx,
        userId,
        input.accountId.trim()
      )
      if (account.currency !== currency) {
        throw new DebtServiceError(
          "Linked account currency must match the debt currency."
        )
      }
      accountId = account.id
    }

    const remaining = fx.amount.minus(paid).toDecimalPlaces(4)
    const nextStatus =
      input.status === "WRITTEN_OFF"
        ? ("WRITTEN_OFF" as DebtStatus)
        : statusFromAmounts(fx.amount, remaining)

    const updated = await tx.debt.update({
      where: { id: existing.id },
      data: {
        accountId,
        personName: input.personName.trim(),
        direction: input.direction as DebtDirection,
        originalAmount: fx.amount,
        remainingAmount: remaining,
        currency: fx.currency,
        exchangeRate: fx.exchangeRate,
        baseAmountUsd: fx.baseAmountUsd,
        exchangeRateAt: fx.exchangeRateAt,
        exchangeRateSource: fx.exchangeRateSource,
        dueDate: parseOptionalDate(input.dueDate),
        status: nextStatus,
        notes: emptyToNull(input.notes),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Debt",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Debt updated",
    })

    return updated
  })
}

export async function recordDebtPayment(
  userId: string,
  input: RecordDebtPaymentInput
): Promise<{ debt: Debt; payment: DebtPayment }> {
  const debtPreview = await prisma.debt.findFirst({
    where: { id: input.debtId, userId, deletedAt: null },
  })
  if (!debtPreview) {
    throw new DebtServiceError("Debt not found.")
  }

  let expenseCategoryId: string | null = null
  if (
    input.accountId?.trim() &&
    debtPreview.direction === "OWED_BY_ME"
  ) {
    const categories = await ensureExpenseCategories(userId)
    expenseCategoryId =
      categories.find((c) => c.name === "Debt repayment")?.id ??
      categories[0]?.id ??
      null
    if (!expenseCategoryId) {
      throw new DebtServiceError("Expense categories are missing.")
    }
  }

  return prisma.$transaction(async (tx) => {
    const debt = await tx.debt.findFirst({
      where: { id: input.debtId, userId, deletedAt: null },
    })
    if (!debt) {
      throw new DebtServiceError("Debt not found.")
    }
    if (debt.status === "WRITTEN_OFF") {
      throw new DebtServiceError("Cannot record payments on a written-off debt.")
    }
    if (debt.remainingAmount.lte(0) || debt.status === "PAID") {
      throw new DebtServiceError("This debt is already fully paid.")
    }

    const amount = input.markFullyPaid
      ? debt.remainingAmount
      : new Prisma.Decimal(input.amount!.trim())

    if (amount.lte(0)) {
      throw new DebtServiceError("Payment amount must be greater than zero.")
    }
    if (amount.gt(debt.remainingAmount)) {
      throw new DebtServiceError(
        `Payment exceeds remaining balance (${debt.remainingAmount.toString()} ${debt.currency}).`
      )
    }

    const paymentFx = buildDebtFx(
      amount.toString(),
      debt.currency,
      input.exchangeRate ||
        (debt.currency === "USD" ? undefined : debt.exchangeRate.toString())
    )

    let transactionId: string | null = null
    const accountId = input.accountId?.trim()

    if (accountId) {
      const account = await getOwnedActiveAccount(tx, userId, accountId)
      if (account.currency !== debt.currency) {
        throw new DebtServiceError(
          "Payment account currency must match the debt currency."
        )
      }

      if (debt.direction === "OWED_BY_ME") {
        if (paymentFx.amount.gt(account.cachedBalance) && !input.allowOverdraft) {
          throw new DebtServiceError(
            `Insufficient balance. Available ${account.cachedBalance.toString()} ${account.currency}. Enable overdraft to continue.`
          )
        }

        const expense = await tx.transaction.create({
          data: {
            userId,
            accountId: account.id,
            categoryId: expenseCategoryId!,
            debtId: debt.id,
            type: "EXPENSE",
            amount: paymentFx.amount,
            currency: paymentFx.currency,
            exchangeRate: paymentFx.exchangeRate,
            baseAmountUsd: paymentFx.baseAmountUsd,
            exchangeRateAt: paymentFx.exchangeRateAt,
            exchangeRateSource: paymentFx.exchangeRateSource,
            transactionDate: new Date(input.paymentDate),
            description: `Debt payment to ${debt.personName}`,
            counterparty: debt.personName,
            paymentMethod: "OTHER" as PaymentMethod,
            notes: emptyToNull(input.notes) ?? "Debt payment",
          },
        })
        transactionId = expense.id

        await writeAuditLog(tx, {
          userId,
          entityType: "Transaction",
          entityId: expense.id,
          action: "CREATE",
          before: null,
          after: expense,
          reason: "Debt payment expense created",
        })

        const updatedAccount = await recomputeCachedBalance(
          tx,
          account.id,
          account.currency
        )
        await writeAuditLog(tx, {
          userId,
          entityType: "FinancialAccount",
          entityId: account.id,
          action: "UPDATE",
          before: account,
          after: updatedAccount,
          reason: "Balance after debt payment expense",
        })
      } else {
        // LENT_OUT — money received
        const income = await tx.transaction.create({
          data: {
            userId,
            accountId: account.id,
            debtId: debt.id,
            type: "INCOME",
            amount: paymentFx.amount,
            currency: paymentFx.currency,
            exchangeRate: paymentFx.exchangeRate,
            baseAmountUsd: paymentFx.baseAmountUsd,
            exchangeRateAt: paymentFx.exchangeRateAt,
            exchangeRateSource: paymentFx.exchangeRateSource,
            transactionDate: new Date(input.paymentDate),
            description: `Debt repayment from ${debt.personName}`,
            counterparty: debt.personName,
            paymentMethod: "OTHER" as PaymentMethod,
            notes: emptyToNull(input.notes) ?? "Debt repayment received",
          },
        })
        transactionId = income.id

        await writeAuditLog(tx, {
          userId,
          entityType: "Transaction",
          entityId: income.id,
          action: "CREATE",
          before: null,
          after: income,
          reason: "Debt repayment income created",
        })

        const updatedAccount = await recomputeCachedBalance(
          tx,
          account.id,
          account.currency
        )
        await writeAuditLog(tx, {
          userId,
          entityType: "FinancialAccount",
          entityId: account.id,
          action: "UPDATE",
          before: account,
          after: updatedAccount,
          reason: "Balance after debt repayment income",
        })
      }
    }

    const payment = await tx.debtPayment.create({
      data: {
        debtId: debt.id,
        amount: paymentFx.amount,
        currency: paymentFx.currency,
        exchangeRate: paymentFx.exchangeRate,
        baseAmountUsd: paymentFx.baseAmountUsd,
        exchangeRateAt: paymentFx.exchangeRateAt,
        exchangeRateSource: paymentFx.exchangeRateSource,
        paymentDate: new Date(input.paymentDate),
        notes: emptyToNull(input.notes),
        transactionId,
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "DebtPayment",
      entityId: payment.id,
      action: "CREATE",
      before: null,
      after: payment,
      reason: input.markFullyPaid
        ? "Debt marked fully paid"
        : "Debt payment recorded",
    })

    const remaining = debt.remainingAmount.minus(paymentFx.amount).toDecimalPlaces(4)
    const updatedDebt = await tx.debt.update({
      where: { id: debt.id },
      data: {
        remainingAmount: remaining,
        status: statusFromAmounts(debt.originalAmount, remaining),
        ...(accountId ? { accountId } : {}),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Debt",
      entityId: updatedDebt.id,
      action: "UPDATE",
      before: debt,
      after: updatedDebt,
      reason: input.markFullyPaid
        ? "Debt remaining cleared after full payment"
        : "Debt remaining updated after payment",
    })

    return { debt: updatedDebt, payment }
  })
}

export async function markDebtFullyPaid(
  userId: string,
  input: Omit<RecordDebtPaymentInput, "amount" | "markFullyPaid"> & {
    amount?: string
  }
) {
  return recordDebtPayment(userId, {
    ...input,
    amount: input.amount ?? "",
    markFullyPaid: true,
  })
}

export async function softDeleteDebt(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.debt.findFirst({
      where: { id, userId, deletedAt: null },
    })
    if (!existing) {
      throw new DebtServiceError("Debt not found.")
    }

    const deleted = await tx.debt.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Debt",
      entityId: deleted.id,
      action: "SOFT_DELETE",
      before: existing,
      after: deleted,
      reason: "Debt soft-deleted; payment history preserved",
    })

    return deleted
  })
}

export async function restoreDebt(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.debt.findFirst({
      where: { id, userId, deletedAt: { not: null } },
    })
    if (!existing) {
      throw new DebtServiceError("Deleted debt not found.")
    }

    const restored = await tx.debt.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Debt",
      entityId: restored.id,
      action: "RESTORE",
      before: existing,
      after: restored,
      reason: "Debt restored",
    })

    return restored
  })
}
