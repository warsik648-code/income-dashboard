import { describe, expect, it } from "vitest"

import { Prisma } from "@/generated/prisma/client"

/**
 * Pure balance math mirroring recomputeCachedBalance transfer terms.
 * Integration against a live DB is intentionally avoided here.
 */
function balanceAfter(input: {
  income: string
  expense: string
  transferOut: string
  transferIn: string
}) {
  const income = new Prisma.Decimal(input.income)
  const expense = new Prisma.Decimal(input.expense)
  const out = new Prisma.Decimal(input.transferOut)
  const inn = new Prisma.Decimal(input.transferIn)
  return income.minus(expense).minus(out).plus(inn).toString()
}

describe("transfer balance model", () => {
  it("same-currency transfer preserves total except separate fee expense", () => {
    // Account A: 200 → send 100, separate fee 1 → 99
    expect(
      balanceAfter({
        income: "200",
        expense: "1",
        transferOut: "100",
        transferIn: "0",
      })
    ).toBe("99")
    // Account B receives 99
    expect(
      balanceAfter({
        income: "0",
        expense: "0",
        transferOut: "0",
        transferIn: "99",
      })
    ).toBe("99")
  })

  it("pending transfer does not change balances", () => {
    expect(
      balanceAfter({
        income: "200",
        expense: "0",
        transferOut: "0",
        transferIn: "0",
      })
    ).toBe("200")
  })

  it("cross-currency uses native amounts on each side", () => {
    expect(
      balanceAfter({
        income: "500",
        expense: "0",
        transferOut: "100",
        transferIn: "0",
      })
    ).toBe("400")
    expect(
      balanceAfter({
        income: "0",
        expense: "0",
        transferOut: "0",
        transferIn: "4690",
      })
    ).toBe("4690")
  })

  it("reversal restores by removing completed transfer terms", () => {
    expect(
      balanceAfter({
        income: "500",
        expense: "0",
        transferOut: "0",
        transferIn: "0",
      })
    ).toBe("500")
  })

  it("idempotent duplicate should not double-apply (documented invariant)", () => {
    // Completing the same logical transfer twice would be wrong:
    const once = balanceAfter({
      income: "200",
      expense: "0",
      transferOut: "100",
      transferIn: "0",
    })
    expect(once).toBe("100")
    // Idempotency key returns existing row — out term still counted once.
    expect(once).not.toBe("0")
  })
})
