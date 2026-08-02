import { afterEach, describe, expect, it, vi } from "vitest"

import {
  resetExchangeRateCacheForTests,
  setCachedExchangeRates,
} from "@/lib/exchange-rates/cache"
import { parseProviderLatestResponse } from "@/lib/exchange-rates/parse"
import { getExchangeRates } from "@/lib/exchange-rates/service"
import {
  buildFxSnapshot,
  isSameFrozenFx,
  previewBaseAmountUsd,
} from "@/lib/money"
import { Prisma } from "@/generated/prisma/client"

function validProviderBody(overrides: Record<string, unknown> = {}) {
  return {
    result: "success",
    time_last_update_utc: "Sun, 02 Aug 2026 00:00:00 +0000",
    time_next_update_utc: "Mon, 03 Aug 2026 00:00:00 +0000",
    base_code: "USD",
    rates: {
      USD: 1,
      PKR: 278.5,
      TRY: 40.2,
      EUR: 0.92,
    },
    ...overrides,
  }
}

afterEach(() => {
  resetExchangeRateCacheForTests()
  vi.restoreAllMocks()
})

describe("parseProviderLatestResponse", () => {
  it("accepts a valid provider response and keeps only USD/PKR/TRY", () => {
    const parsed = parseProviderLatestResponse(validProviderBody())
    expect(parsed.rates).toEqual({ USD: 1, PKR: 278.5, TRY: 40.2 })
    expect(parsed.baseCurrency).toBe("USD")
    expect(parsed.source).toBe("ExchangeRate-API")
    expect(parsed.providerUpdatedAt).toBeTruthy()
  })

  it("rejects invalid provider result", () => {
    expect(() =>
      parseProviderLatestResponse(validProviderBody({ result: "error" }))
    ).toThrow(/not success/)
  })

  it("rejects missing PKR rate", () => {
    expect(() =>
      parseProviderLatestResponse(
        validProviderBody({
          rates: { USD: 1, TRY: 40.2 },
        })
      )
    ).toThrow(/PKR/)
  })

  it("rejects missing TRY rate", () => {
    expect(() =>
      parseProviderLatestResponse(
        validProviderBody({
          rates: { USD: 1, PKR: 278.5 },
        })
      )
    ).toThrow(/TRY/)
  })

  it("rejects non-1 USD rate", () => {
    expect(() =>
      parseProviderLatestResponse(
        validProviderBody({
          rates: { USD: 1.01, PKR: 278.5, TRY: 40.2 },
        })
      )
    ).toThrow(/USD/)
  })
})

describe("getExchangeRates cache + failures", () => {
  it("uses fresh cache without calling the provider", async () => {
    setCachedExchangeRates({
      baseCurrency: "USD",
      rates: { USD: 1, PKR: 100, TRY: 30 },
      providerUpdatedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      nextUpdateAt: "",
      source: "ExchangeRate-API",
    })

    const fetchImpl = vi.fn()
    const result = await getExchangeRates({ fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result.isCached).toBe(true)
    expect(result.isStale).toBe(false)
    expect(result.rates.PKR).toBe(100)
  })

  it("falls back to stale cache when provider fails", async () => {
    setCachedExchangeRates({
      baseCurrency: "USD",
      rates: { USD: 1, PKR: 100, TRY: 30 },
      providerUpdatedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      nextUpdateAt: "",
      source: "ExchangeRate-API",
    })

    // Expire freshness by rewriting cache timestamps via private path:
    // forceRefresh bypasses freshness and will attempt provider.
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"))
    const result = await getExchangeRates({ forceRefresh: true, fetchImpl })
    expect(result.isStale).toBe(true)
    expect(result.isCached).toBe(true)
    expect(result.rates.PKR).toBe(100)
  })

  it("fails clearly when provider fails and no cache exists", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"))
    await expect(getExchangeRates({ fetchImpl })).rejects.toThrow(/network down|failed/i)
  })

  it("surfaces provider timeout", async () => {
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((_resolve, reject) => {
          const error = new Error("Aborted")
          error.name = "AbortError"
          reject(error)
        })
    )
    await expect(
      getExchangeRates({ fetchImpl, timeoutMs: 1 })
    ).rejects.toThrow(/timed out/i)
  })

  it("fetches and caches a valid provider response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validProviderBody(),
    })
    const result = await getExchangeRates({ fetchImpl })
    expect(result.rates.TRY).toBe(40.2)
    expect(result.isCached).toBe(false)
    expect(result.isStale).toBe(false)

    const fetchAgain = vi.fn()
    const cached = await getExchangeRates({ fetchImpl: fetchAgain })
    expect(fetchAgain).not.toHaveBeenCalled()
    expect(cached.isCached).toBe(true)
    expect(cached.rates.PKR).toBe(278.5)
  })
})

describe("FX conversion format (units per 1 USD)", () => {
  it("keeps USD amount unchanged", () => {
    const fx = buildFxSnapshot({ amount: "12.5", currency: "USD" })
    expect(fx.exchangeRate.toString()).toBe("1")
    expect(fx.baseAmountUsd.toString()).toBe("12.5")
    expect(fx.exchangeRateSource).toBe("FIXED_USD")
  })

  it("converts PKR to USD by division", () => {
    const fx = buildFxSnapshot({
      amount: "278.5",
      currency: "PKR",
      exchangeRate: "278.5",
      exchangeRateSource: "PROVIDER",
    })
    expect(fx.baseAmountUsd.toString()).toBe("1")
    expect(previewBaseAmountUsd("557", "PKR", "278.5")).toBe("2")
  })

  it("converts TRY to USD by division", () => {
    const fx = buildFxSnapshot({
      amount: "80.4",
      currency: "TRY",
      exchangeRate: "40.2",
      exchangeRateSource: "PROVIDER",
    })
    expect(fx.baseAmountUsd.toString()).toBe("2")
  })

  it("stores manual override source and rate exactly", () => {
    const fx = buildFxSnapshot({
      amount: "100",
      currency: "TRY",
      exchangeRate: "33.3333",
      exchangeRateSource: "USER_OVERRIDE",
    })
    expect(fx.exchangeRate.toString()).toBe("33.3333")
    expect(fx.exchangeRateSource).toBe("USER_OVERRIDE")
    expect(fx.baseAmountUsd.toString()).toBe("3")
  })

  it("does not replace a saved rate when amount+rate unchanged", () => {
    const existing = {
      amount: new Prisma.Decimal("100"),
      currency: "TRY",
      exchangeRate: new Prisma.Decimal("40"),
      baseAmountUsd: new Prisma.Decimal("2.5"),
    }
    const next = buildFxSnapshot({
      amount: "100",
      currency: "TRY",
      exchangeRate: "40",
      exchangeRateSource: "PROVIDER",
    })
    expect(isSameFrozenFx(existing, next)).toBe(true)
    expect(next.baseAmountUsd.toString()).toBe("2.5")
  })

  it("recalculates only when rate is explicitly changed (use today’s rate)", () => {
    const existing = {
      amount: new Prisma.Decimal("100"),
      currency: "TRY",
      exchangeRate: new Prisma.Decimal("40"),
    }
    const withToday = buildFxSnapshot({
      amount: "100",
      currency: "TRY",
      exchangeRate: "50",
      exchangeRateSource: "PROVIDER",
    })
    expect(isSameFrozenFx(existing, withToday)).toBe(false)
    expect(withToday.baseAmountUsd.toString()).toBe("2")
  })

  it("never invents a rate for non-USD without input", () => {
    expect(() =>
      buildFxSnapshot({ amount: "10", currency: "PKR" })
    ).toThrow(/required/)
  })
})
