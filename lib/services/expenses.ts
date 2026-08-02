import {
  Prisma,
  type PaymentMethod,
  type Transaction,
} from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import { buildFxSnapshot, type MoneyDecimalString } from "@/lib/money"
import { writeAuditLog } from "@/lib/services/audit"
import { recomputeCachedBalance } from "@/lib/services/balances"
import type {
  CreateExpenseInput,
  ExpenseFilters,
  UpdateExpenseInput,
} from "@/lib/validations/expenses"

export class ExpenseServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ExpenseServiceError"
  }
}

export type ExpenseListItem = Transaction & {
  account: {
    id: string
    name: string
    type: string
    currency: string
  }
  category: {
    id: string
    name: string
  } | null
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
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
    throw new ExpenseServiceError("Select an active account.")
  }
  return account
}

async function getOwnedExpenseCategory(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  categoryId: string
) {
  const category = await client.category.findFirst({
    where: {
      id: categoryId,
      userId,
      kind: "EXPENSE",
      deletedAt: null,
    },
  })
  if (!category) {
    throw new ExpenseServiceError("Select a valid expense category.")
  }
  return category
}

async function assertSufficientBalance(
  tx: Prisma.TransactionClient,
  account: { id: string; currency: string; cachedBalance: Prisma.Decimal },
  amount: Prisma.Decimal,
  options: {
    allowOverdraft?: boolean
    ignoreExpenseId?: string
  }
) {
  let available = account.cachedBalance

  if (options.ignoreExpenseId) {
    const existing = await tx.transaction.findFirst({
      where: {
        id: options.ignoreExpenseId,
        accountId: account.id,
        type: "EXPENSE",
        deletedAt: null,
      },
    })
    if (existing) {
      available = available.plus(existing.amount)
    }
  }

  if (amount.gt(available) && !options.allowOverdraft) {
    throw new ExpenseServiceError(
      `Insufficient balance. Available ${available.toString()} ${account.currency}. Enable “Allow overdraft” to continue.`
    )
  }
}

function buildExpenseFx(
  amount: string,
  currency: string,
  exchangeRate?: string
) {
  if (currency !== "USD" && !exchangeRate?.trim()) {
    throw new ExpenseServiceError(
      "Exchange rate (USD per 1 unit) is required for non-USD accounts."
    )
  }

  return buildFxSnapshot({
    amount: amount as MoneyDecimalString,
    currency,
    exchangeRate: exchangeRate?.trim() || undefined,
    exchangeRateSource:
      currency === "USD"
        ? "FIXED_USD"
        : exchangeRate?.trim()
          ? "USER_OVERRIDE"
          : "MANUAL",
  })
}

export async function listExpenses(
  userId: string,
  filters: ExpenseFilters = {}
): Promise<ExpenseListItem[]> {
  const includeDeleted = filters.deleted === "1"
  const from = filters.from ? new Date(filters.from) : undefined
  const to = filters.to ? new Date(filters.to) : undefined

  return prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      deletedAt: includeDeleted ? { not: null } : null,
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.paymentMethod
        ? { paymentMethod: filters.paymentMethod }
        : {}),
      ...(filters.currency ? { currency: filters.currency } : {}),
      ...(from || to
        ? {
            transactionDate: {
              ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
              ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      account: {
        select: { id: true, name: true, type: true, currency: true },
      },
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  })
}

export async function createExpense(
  userId: string,
  input: CreateExpenseInput
): Promise<Transaction> {
  const account = await getOwnedActiveAccount(prisma, userId, input.accountId)
  await getOwnedExpenseCategory(prisma, userId, input.categoryId)
  const fx = buildExpenseFx(input.amount, account.currency, input.exchangeRate)

  return prisma.$transaction(async (tx) => {
    await assertSufficientBalance(tx, account, fx.amount, {
      allowOverdraft: input.allowOverdraft,
    })

    const created = await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        categoryId: input.categoryId,
        type: "EXPENSE",
        amount: fx.amount,
        currency: fx.currency,
        exchangeRate: fx.exchangeRate,
        baseAmountUsd: fx.baseAmountUsd,
        exchangeRateAt: fx.exchangeRateAt,
        exchangeRateSource: fx.exchangeRateSource,
        transactionDate: new Date(input.transactionDate),
        description: input.description.trim(),
        counterparty: input.counterparty.trim(),
        notes: emptyToNull(input.notes),
        paymentMethod: input.paymentMethod as PaymentMethod,
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Transaction",
      entityId: created.id,
      action: "CREATE",
      before: null,
      after: created,
      reason: input.allowOverdraft
        ? "Expense created with overdraft override"
        : "Expense created",
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
      reason: "Balance after expense create",
    })

    return created
  })
}

export async function updateExpense(
  userId: string,
  input: UpdateExpenseInput
): Promise<Transaction> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: {
        id: input.id,
        userId,
        type: "EXPENSE",
        deletedAt: null,
      },
    })
    if (!existing) {
      throw new ExpenseServiceError("Expense not found.")
    }

    const account = await getOwnedActiveAccount(tx, userId, input.accountId)
    await getOwnedExpenseCategory(tx, userId, input.categoryId)
    const fx = buildExpenseFx(input.amount, account.currency, input.exchangeRate)

    await assertSufficientBalance(tx, account, fx.amount, {
      allowOverdraft: input.allowOverdraft,
      ignoreExpenseId: existing.id,
    })

    const updated = await tx.transaction.update({
      where: { id: existing.id },
      data: {
        accountId: account.id,
        categoryId: input.categoryId,
        amount: fx.amount,
        currency: fx.currency,
        exchangeRate: fx.exchangeRate,
        baseAmountUsd: fx.baseAmountUsd,
        exchangeRateAt: fx.exchangeRateAt,
        exchangeRateSource: fx.exchangeRateSource,
        transactionDate: new Date(input.transactionDate),
        description: input.description.trim(),
        counterparty: input.counterparty.trim(),
        notes: emptyToNull(input.notes),
        paymentMethod: input.paymentMethod as PaymentMethod,
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Transaction",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: input.allowOverdraft
        ? "Expense updated with overdraft override"
        : "Expense updated",
    })

    const touched = new Set([existing.accountId, account.id])
    for (const accountId of touched) {
      const acct = await tx.financialAccount.findFirstOrThrow({
        where: { id: accountId },
      })
      await recomputeCachedBalance(tx, acct.id, acct.currency)
    }

    return updated
  })
}

export async function softDeleteExpense(
  userId: string,
  expenseId: string
): Promise<Transaction> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: {
        id: expenseId,
        userId,
        type: "EXPENSE",
        deletedAt: null,
      },
    })
    if (!existing) {
      throw new ExpenseServiceError("Expense not found.")
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
      reason: "Expense soft-deleted",
    })

    const account = await tx.financialAccount.findFirstOrThrow({
      where: { id: existing.accountId },
    })
    await recomputeCachedBalance(tx, account.id, account.currency)

    return deleted
  })
}

export async function restoreExpense(
  userId: string,
  expenseId: string,
  options?: { allowOverdraft?: boolean }
): Promise<Transaction> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: {
        id: expenseId,
        userId,
        type: "EXPENSE",
        deletedAt: { not: null },
      },
    })
    if (!existing) {
      throw new ExpenseServiceError("Deleted expense not found.")
    }

    const account = await getOwnedActiveAccount(tx, userId, existing.accountId)

    await assertSufficientBalance(tx, account, existing.amount, {
      allowOverdraft: options?.allowOverdraft,
    })

    const restored = await tx.transaction.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Transaction",
      entityId: restored.id,
      action: "RESTORE",
      before: existing,
      after: restored,
      reason: options?.allowOverdraft
        ? "Expense restored with overdraft override"
        : "Expense restored",
    })

    await recomputeCachedBalance(tx, account.id, account.currency)

    return restored
  })
}
