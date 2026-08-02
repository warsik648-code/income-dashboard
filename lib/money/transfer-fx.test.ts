import { describe, expect, it } from "vitest"

import {
  computeEffectiveExchangeRate,
  hasValidTransferRates,
  suggestDestinationAmount,
} from "@/lib/money/transfer-fx"

const rates = { PKR: "280", TRY: "47.54776" }

describe("transfer FX suggestions", () => {
  it("keeps same-currency destination equal to source (2 dp)", () => {
    expect(
      suggestDestinationAmount({
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationCurrency: "USD",
        rates,
      })
    ).toBe("100.00")
  })

  it("suggests USD → TRY rounded to 2 dp", () => {
    expect(
      suggestDestinationAmount({
        sourceAmount: "50",
        sourceCurrency: "USD",
        destinationCurrency: "TRY",
        rates,
      })
    ).toBe("2377.39")
  })

  it("suggests USD → PKR", () => {
    expect(
      suggestDestinationAmount({
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationCurrency: "PKR",
        rates,
      })
    ).toBe("28000.00")
  })

  it("suggests TRY → USD", () => {
    expect(
      suggestDestinationAmount({
        sourceAmount: "4754.776",
        sourceCurrency: "TRY",
        destinationCurrency: "USD",
        rates,
      })
    ).toBe("100.00")
  })

  it("suggests TRY → PKR via USD", () => {
    expect(
      suggestDestinationAmount({
        sourceAmount: "47.54776",
        sourceCurrency: "TRY",
        destinationCurrency: "PKR",
        rates,
      })
    ).toBe("280.00")
  })

  it("returns null without usable rates", () => {
    expect(
      suggestDestinationAmount({
        sourceAmount: "50",
        sourceCurrency: "USD",
        destinationCurrency: "TRY",
        rates: { PKR: "0", TRY: "0" },
      })
    ).toBeNull()
    expect(hasValidTransferRates({ PKR: "1", TRY: "40" })).toBe(true)
    expect(hasValidTransferRates({ PKR: "0", TRY: "40" })).toBe(false)
  })

  it("computes effective USD→TRY rate from actual destination", () => {
    expect(
      computeEffectiveExchangeRate({
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationAmount: "4690",
        destinationCurrency: "TRY",
      })
    ).toBe("46.9")
  })

  it("computes effective same-currency rate as 1", () => {
    expect(
      computeEffectiveExchangeRate({
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationAmount: "99",
        destinationCurrency: "USD",
      })
    ).toBe("1")
  })
})
