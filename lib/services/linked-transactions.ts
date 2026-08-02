import type { Prisma } from "@/generated/prisma/client"

const SUBSCRIPTION_LINKED_MESSAGE =
  "This transaction is linked to a subscription renewal. Manage it from Subscriptions."

const DEBT_LINKED_MESSAGE =
  "This transaction is linked to a debt payment. Manage it from Debts."

const TRANSFER_LINKED_MESSAGE =
  "This transaction is linked to a fund transfer. Manage it from Transfers."

/**
 * Block normal edit / soft-delete / restore for transactions owned by
 * subscription renewals, debt payments, or transfers.
 */
export async function assertStandaloneMutableTransaction(
  tx: Prisma.TransactionClient,
  transaction: {
    id: string
    subscriptionId: string | null
    debtId: string | null
    transferId?: string | null
  },
  createError: (message: string) => Error
): Promise<void> {
  if (transaction.subscriptionId) {
    throw createError(SUBSCRIPTION_LINKED_MESSAGE)
  }

  if (transaction.debtId) {
    throw createError(DEBT_LINKED_MESSAGE)
  }

  if (transaction.transferId) {
    throw createError(TRANSFER_LINKED_MESSAGE)
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
