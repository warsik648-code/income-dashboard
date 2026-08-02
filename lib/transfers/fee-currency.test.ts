import { describe, expect, it } from "vitest"

import {
  isMismatchedClientFeeCurrency,
  resolveTransferFeeCurrency,
} from "@/lib/transfers/fee-currency"

describe("resolveTransferFeeCurrency", () => {
  it("USD source account → fee stored as USD", () => {
    expect(
      resolveTransferFeeCurrency({ sourceCurrency: "USD", feeAmount: "2.5" })
    ).toBe("USD")
  })

  it("TRY source account → fee stored as TRY", () => {
    expect(
      resolveTransferFeeCurrency({ sourceCurrency: "TRY", feeAmount: "10" })
    ).toBe("TRY")
  })

  it("PKR source account → fee stored as PKR", () => {
    expect(
      resolveTransferFeeCurrency({ sourceCurrency: "PKR", feeAmount: "100" })
    ).toBe("PKR")
  })

  it("ignores mismatched client fee currency (server derives source)", () => {
    expect(isMismatchedClientFeeCurrency("USD", "TRY")).toBe(true)
    expect(isMismatchedClientFeeCurrency("TRY", "TRY")).toBe(false)
    // Enforcement path still returns source currency.
    expect(
      resolveTransferFeeCurrency({ sourceCurrency: "USD", feeAmount: "1" })
    ).toBe("USD")
  })

  it("returns null when there is no fee amount", () => {
    expect(
      resolveTransferFeeCurrency({ sourceCurrency: "USD", feeAmount: "0" })
    ).toBeNull()
    expect(
      resolveTransferFeeCurrency({ sourceCurrency: "USD", feeAmount: "" })
    ).toBeNull()
  })
})
