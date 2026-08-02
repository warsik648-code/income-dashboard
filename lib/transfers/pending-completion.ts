import type { TransferStatus } from "@/generated/prisma/client"

/**
 * Side-effect plan for updatePendingTransfer.
 * COMPLETED must always recompute both account balances.
 */
export function pendingTransferCompletionPlan(input: {
  status: TransferStatus | string
  feePaidSeparately: boolean
}): {
  upsertSeparateFee: boolean
  softDeleteFeeExpenses: boolean
  recomputeBalances: boolean
} {
  if (input.status === "COMPLETED") {
    return {
      upsertSeparateFee: input.feePaidSeparately,
      softDeleteFeeExpenses: !input.feePaidSeparately,
      recomputeBalances: true,
    }
  }
  return {
    upsertSeparateFee: false,
    softDeleteFeeExpenses: true,
    recomputeBalances: false,
  }
}
