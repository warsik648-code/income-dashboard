import type { PaymentMethod, Transaction } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import {
  buildFxSnapshot,
  isSameFrozenFx,
  type MoneyDecimalString,
} from "@/lib/money"
import { resolveExchangeRateSource } from "@/lib/money/fx-source"
import { writeAuditLog } from "@/lib/services/audit"
import {
  BalanceServiceError,
  lockAndRefreshAccountBalance,
  lockAndRefreshAccounts,
  recomputeCachedBalance,
} from "@/lib/services/balances"
import { assertStandaloneMutableTransaction } from "@/lib/services/linked-transactions"
import type {
  CreateIncomeInput,
  UpdateIncomeInput,
} from "@/lib/validations/income"

export class IncomeServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "IncomeServiceError"
  }
}

export type IncomeListItem = Transaction & {
  account: {
    id: string
    name: string
    type: string
    currency: string
  }
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parsePaymentMethod(value?: string | null): PaymentMethod | null {
  if (!value) return null
  return value as PaymentMethod
}

function mapBalanceError(error: unknown): never {
  if (error instanceof BalanceServiceError) {
    throw new IncomeServiceError(error.message)
  }
  throw error
}

export async function listIncome(userId: string): Promise<IncomeListItem[]> {
  return prisma.transaction.findMany({
    where: {
      userId,
      type: "INCOME",
      deletedAt: null,
      NOT: { description: "Opening balance" },
    },
    include: {
      account: {
        select: { id: true, name: true, type: true, currency: true },
      },
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  })
}

export async function createIncome(
  userId: string,
  input: CreateIncomeInput
): Promise<Transaction> {
  const transactionDate = new Date(input.transactionDate)

  return prisma.$transaction(async (tx) => {
    let account
    try {
      account = await lockAndRefreshAccountBalance(tx, userId, input.accountId)
    } catch (error) {
      mapBalanceError(error)
    }

    if (account.currency !== "USD" && !input.exchangeRate?.trim()) {
      throw new IncomeServiceError(
        "Exchange rate (currency units per 1 USD) is required for non-USD accounts."
      )
    }

    const fx = buildFxSnapshot({
      amount: input.amount as MoneyDecimalString,
      currency: account.currency,
      exchangeRate: input.exchangeRate?.trim() || undefined,
      exchangeRateSource: resolveExchangeRateSource({
        currency: account.currency,
        exchangeRate: input.exchangeRate,
        exchangeRateSource: input.exchangeRateSource,
      }),
    })

    const created = await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        type: "INCOME",
        amount: fx.amount,
        currency: fx.currency,
        exchangeRate: fx.exchangeRate,
        baseAmountUsd: fx.baseAmountUsd,
        exchangeRateAt: fx.exchangeRateAt,
        exchangeRateSource: fx.exchangeRateSource,
        transactionDate,
        description: input.description.trim(),
        counterparty: emptyToNull(input.counterparty),
        notes: emptyToNull(input.notes),
        paymentMethod: parsePaymentMethod(input.paymentMethod),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Transaction",
      entityId: created.id,
      action: "CREATE",
      before: null,
      after: created,
      reason: "Income entry created",
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
      reason: "Balance after income create",
    })

    return created
  })
}

export async function updateIncome(
  userId: string,
  input: UpdateIncomeInput
): Promise<Transaction> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: {
        id: input.id,
        userId,
        type: "INCOME",
        deletedAt: null,
      },
    })
    if (!existing) {
      throw new IncomeServiceError("Income entry not found.")
    }
    if (existing.description === "Opening balance") {
      throw new IncomeServiceError(
        "Opening balance entries are managed from Accounts."
      )
    }

    await assertStandaloneMutableTransaction(
      tx,
      existing,
      (message) => new IncomeServiceError(message)
    )

    let locked
    try {
      locked = await lockAndRefreshAccounts(tx, userId, [
        existing.accountId,
        input.accountId,
      ])
    } catch (error) {
      mapBalanceError(error)
    }

    const account = locked.get(input.accountId)
    if (!account) {
      throw new IncomeServiceError("Select an active account.")
    }

    if (account.currency !== "USD" && !input.exchangeRate?.trim()) {
      throw new IncomeServiceError(
        "Exchange rate (currency units per 1 USD) is required for non-USD accounts."
      )
    }

    const fx = buildFxSnapshot({
      amount: input.amount as MoneyDecimalString,
      currency: account.currency,
      exchangeRate: input.exchangeRate?.trim() || undefined,
      exchangeRateSource: resolveExchangeRateSource({
        currency: account.currency,
        exchangeRate: input.exchangeRate,
        exchangeRateSource: input.exchangeRateSource,
      }),
    })

    const preserveFx = isSameFrozenFx(existing, fx)

    const updated = await tx.transaction.update({
      where: { id: existing.id },
      data: {
        accountId: account.id,
        amount: fx.amount,
        currency: fx.currency,
        exchangeRate: preserveFx ? existing.exchangeRate : fx.exchangeRate,
        baseAmountUsd: preserveFx ? existing.baseAmountUsd : fx.baseAmountUsd,
        exchangeRateAt: preserveFx ? existing.exchangeRateAt : fx.exchangeRateAt,
        exchangeRateSource: preserveFx
          ? existing.exchangeRateSource
          : fx.exchangeRateSource,
        transactionDate: new Date(input.transactionDate),
        description: input.description.trim(),
        counterparty: emptyToNull(input.counterparty),
        notes: emptyToNull(input.notes),
        paymentMethod: parsePaymentMethod(input.paymentMethod),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Transaction",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Income entry updated",
    })

    for (const accountId of new Set([existing.accountId, account.id])) {
      const acct = locked.get(accountId)
      if (!acct) continue
      await recomputeCachedBalance(tx, acct.id, acct.currency)
    }

    return updated
  })
}

export async function softDeleteIncome(
  userId: string,
  incomeId: string
): Promise<Transaction> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: {
        id: incomeId,
        userId,
        type: "INCOME",
        deletedAt: null,
      },
    })
    if (!existing) {
      throw new IncomeServiceError("Income entry not found.")
    }
    if (existing.description === "Opening balance") {
      throw new IncomeServiceError(
        "Opening balance entries are managed from Accounts."
      )
    }

    await assertStandaloneMutableTransaction(
      tx,
      existing,
      (message) => new IncomeServiceError(message)
    )

    let account
    try {
      account = await lockAndRefreshAccountBalance(
        tx,
        userId,
        existing.accountId,
        { requireActive: false }
      )
    } catch (error) {
      mapBalanceError(error)
    }

    const deleted = await tx.transaction.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Transaction",
      entityId: deleted.id,
      action: "SOFT_DELETE",
      before: existing,
      after: deleted,
      reason: "Income entry soft-deleted",
    })

    await recomputeCachedBalance(tx, account.id, account.currency)

    return deleted
  })
}
