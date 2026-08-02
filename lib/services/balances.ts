import { Prisma, type FinancialAccount } from "@/generated/prisma/client"

export class BalanceServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BalanceServiceError"
  }
}

export async function recomputeCachedBalance(
  tx: Prisma.TransactionClient,
  accountId: string,
  currency: string
) {
  const income = await tx.transaction.aggregate({
    where: {
      accountId,
      deletedAt: null,
      type: "INCOME",
      currency,
    },
    _sum: { amount: true },
  })
  const expense = await tx.transaction.aggregate({
    where: {
      accountId,
      deletedAt: null,
      type: "EXPENSE",
      currency,
    },
    _sum: { amount: true },
  })

  const incomeSum = income._sum.amount ?? new Prisma.Decimal(0)
  const expenseSum = expense._sum.amount ?? new Prisma.Decimal(0)

  return tx.financialAccount.update({
    where: { id: accountId },
    data: { cachedBalance: incomeSum.minus(expenseSum) },
  })
}

/**
 * Lock a FinancialAccount row with SELECT … FOR UPDATE, then recompute
 * cachedBalance from the ledger while that lock is held.
 */
export async function lockAndRefreshAccountBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  accountId: string,
  options?: { requireActive?: boolean }
): Promise<FinancialAccount> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "FinancialAccount"
    WHERE id = ${accountId}
      AND "userId" = ${userId}
      AND "deletedAt" IS NULL
    FOR UPDATE
  `

  if (rows.length === 0) {
    throw new BalanceServiceError("Select an active account.")
  }

  const account = await tx.financialAccount.findFirst({
    where: {
      id: accountId,
      userId,
      deletedAt: null,
    },
  })
  if (!account) {
    throw new BalanceServiceError("Select an active account.")
  }

  if (options?.requireActive !== false && account.isArchived) {
    throw new BalanceServiceError("Select an active account.")
  }

  await recomputeCachedBalance(tx, account.id, account.currency)

  return tx.financialAccount.findFirstOrThrow({
    where: { id: account.id },
  })
}

/** Lock multiple accounts in sorted id order to avoid deadlocks. */
export async function lockAndRefreshAccounts(
  tx: Prisma.TransactionClient,
  userId: string,
  accountIds: string[],
  options?: { requireActive?: boolean }
): Promise<Map<string, FinancialAccount>> {
  const uniqueSorted = [...new Set(accountIds.filter(Boolean))].sort()
  const locked = new Map<string, FinancialAccount>()

  for (const accountId of uniqueSorted) {
    locked.set(
      accountId,
      await lockAndRefreshAccountBalance(tx, userId, accountId, options)
    )
  }

  return locked
}
