import type { Prisma } from "@/generated/prisma/client"

const SUBSCRIPTION_LINKED_MESSAGE =
  "This transaction is linked to a subscription renewal. Manage it from Subscriptions."

const DEBT_LINKED_MESSAGE =
  "This transaction is linked to a debt payment. Manage it from Debts."

/**
 * Block normal edit / soft-delete / restore for transactions owned by
 * subscription renewals or debt payments. Those must go through their
 * owning services so renewal/debt state cannot desync.
 */
export async function assertStandaloneMutableTransaction(
  tx: Prisma.TransactionClient,
  transaction: {
    id: string
    subscriptionId: string | null
    debtId: string | null
  },
  createError: (message: string) => Error
): Promise<void> {
  if (transaction.subscriptionId) {
    throw createError(SUBSCRIPTION_LINKED_MESSAGE)
  }

  if (transaction.debtId) {
    throw createError(DEBT_LINKED_MESSAGE)
  }

  const debtPayment = await tx.debtPayment.findFirst({
    where: {
      transactionId: transaction.id,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (debtPayment) {
    throw createError(DEBT_LINKED_MESSAGE)
  }
}
