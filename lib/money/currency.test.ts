import { describe, expect, it } from "vitest"

import {
  assertSupportedCurrency,
  BASE_CURRENCY,
  buildFxSnapshot,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/money"

describe("supported currencies", () => {
  it("only allows USD, PKR, and TRY", () => {
    expect([...SUPPORTED_CURRENCIES]).toEqual(["USD", "PKR", "TRY"])
    expect(BASE_CURRENCY).toBe("USD")
    expect(isSupportedCurrency("pkr")).toBe(true)
    expect(isSupportedCurrency("USDT")).toBe(false)
    expect(isSupportedCurrency("EUR")).toBe(false)
    expect(() => assertSupportedCurrency("EUR")).toThrow(/Unsupported currency/)
  })

  it("freezes FX snapshot as amount / units-per-USD rate", () => {
    const fx = buildFxSnapshot({
      amount: "100",
      currency: "TRY",
      exchangeRate: "40",
    })
    expect(fx.currency).toBe("TRY")
    expect(fx.exchangeRate.toString()).toBe("40")
    expect(fx.baseAmountUsd.toString()).toBe("2.5")
  })

  it("uses FIXED_USD rate of 1 for USD", () => {
    const fx = buildFxSnapshot({ amount: "12.5", currency: "USD" })
    expect(fx.exchangeRate.toString()).toBe("1")
    expect(fx.baseAmountUsd.toString()).toBe("12.5")
    expect(fx.exchangeRateSource).toBe("FIXED_USD")
  })
})
