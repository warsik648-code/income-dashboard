import { Prisma } from "@/generated/prisma/client"

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
