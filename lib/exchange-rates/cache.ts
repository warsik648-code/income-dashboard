import type { ExchangeRatesResult } from "@/lib/exchange-rates/types"
import { EXCHANGE_RATE_CACHE_FRESH_MS } from "@/lib/exchange-rates/types"

/**
 * In-memory process cache for USD→PKR/TRY rates.
 * Resets when the Node server process restarts.
 */
type CacheRecord = {
  result: ExchangeRatesResult
  storedAtMs: number
  freshUntilMs: number
}

let cache: CacheRecord | null = null
let inflight: Promise<ExchangeRatesResult> | null = null

export function getCachedExchangeRates(nowMs = Date.now()): {
  result: ExchangeRatesResult
  isFresh: boolean
} | null {
  if (!cache) return null
  const isFresh = nowMs < cache.freshUntilMs
  return {
    result: {
      ...cache.result,
      isCached: true,
      isStale: !isFresh,
    },
    isFresh,
  }
}

export function setCachedExchangeRates(
  result: Omit<ExchangeRatesResult, "isCached" | "isStale">,
  nowMs = Date.now()
): ExchangeRatesResult {
  const stored: ExchangeRatesResult = {
    ...result,
    isCached: false,
    isStale: false,
  }
  cache = {
    result: stored,
    storedAtMs: nowMs,
    freshUntilMs: nowMs + EXCHANGE_RATE_CACHE_FRESH_MS,
  }
  return stored
}

export function getInflightExchangeRateFetch() {
  return inflight
}

export function setInflightExchangeRateFetch(
  promise: Promise<ExchangeRatesResult> | null
) {
  inflight = promise
}

/** Test helper — clears in-memory cache and in-flight fetch. */
export function resetExchangeRateCacheForTests() {
  cache = null
  inflight = null
}

export function exchangeRateCacheFreshMs() {
  return EXCHANGE_RATE_CACHE_FRESH_MS
}
