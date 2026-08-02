import { describe, expect, it } from "vitest"

import { pendingTransferCompletionPlan } from "@/lib/transfers/pending-completion"

describe("pendingTransferCompletionPlan", () => {
  it("PENDING → COMPLETED without fee recomputes balances", () => {
    expect(
      pendingTransferCompletionPlan({
        status: "COMPLETED",
        feePaidSeparately: false,
      })
    ).toEqual({
      upsertSeparateFee: false,
      softDeleteFeeExpenses: true,
      recomputeBalances: true,
    })
  })

  it("PENDING → COMPLETED with separate fee upserts fee and recomputes", () => {
    expect(
      pendingTransferCompletionPlan({
        status: "COMPLETED",
        feePaidSeparately: true,
      })
    ).toEqual({
      upsertSeparateFee: true,
      softDeleteFeeExpenses: false,
      recomputeBalances: true,
    })
  })

  it("staying PENDING does not recompute balances", () => {
    expect(
      pendingTransferCompletionPlan({
        status: "PENDING",
        feePaidSeparately: true,
      })
    ).toEqual({
      upsertSeparateFee: false,
      softDeleteFeeExpenses: true,
      recomputeBalances: false,
    })
  })
})
