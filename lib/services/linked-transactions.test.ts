import { describe, expect, it, vi } from "vitest"

import { assertStandaloneMutableTransaction } from "@/lib/services/linked-transactions"

describe("assertStandaloneMutableTransaction", () => {
  it("blocks subscription-linked transactions", async () => {
    const tx = {
      debtPayment: { findFirst: vi.fn() },
    }

    await expect(
      assertStandaloneMutableTransaction(
        tx as never,
        { id: "tx1", subscriptionId: "sub1", debtId: null },
        (message) => new Error(message)
      )
    ).rejects.toThrow(/subscription renewal/i)

    expect(tx.debtPayment.findFirst).not.toHaveBeenCalled()
  })

  it("blocks debt-linked transactions", async () => {
    const tx = {
      debtPayment: { findFirst: vi.fn() },
    }

    await expect(
      assertStandaloneMutableTransaction(
        tx as never,
        { id: "tx1", subscriptionId: null, debtId: "debt1" },
        (message) => new Error(message)
      )
    ).rejects.toThrow(/debt payment/i)
  })

  it("blocks transactions referenced by DebtPayment", async () => {
    const tx = {
      debtPayment: {
        findFirst: vi.fn().mockResolvedValue({ id: "pay1" }),
      },
    }

    await expect(
      assertStandaloneMutableTransaction(
        tx as never,
        { id: "tx1", subscriptionId: null, debtId: null },
        (message) => new Error(message)
      )
    ).rejects.toThrow(/debt payment/i)
  })

  it("allows standalone transactions", async () => {
    const tx = {
      debtPayment: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    }

    await expect(
      assertStandaloneMutableTransaction(
        tx as never,
        { id: "tx1", subscriptionId: null, debtId: null },
        (message) => new Error(message)
      )
    ).resolves.toBeUndefined()
  })
})
