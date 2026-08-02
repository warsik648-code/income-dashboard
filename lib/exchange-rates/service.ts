import {
  getCachedExchangeRates,
  getInflightExchangeRateFetch,
  setCachedExchangeRates,
  setInflightExchangeRateFetch,
} from "@/lib/exchange-rates/cache"
import {
  ExchangeRateProviderError,
  parseProviderLatestResponse,
} from "@/lib/exchange-rates/parse"
import {
  EXCHANGE_RATE_PROVIDER_URL,
  type ExchangeRatesResult,
} from "@/lib/exchange-rates/types"

export type FetchExchangeRatesOptions = {
  /** Bypass fresh cache and hit the provider (refresh button). */
  forceRefresh?: boolean
  /** Injected fetch for tests. */
  fetchImpl?: typeof fetch
  /** Provider request timeout in ms. */
  timeoutMs?: number
}

async function fetchFromProvider(
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<Omit<ExchangeRatesResult, "isCached" | "isStale">> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(EXCHANGE_RATE_PROVIDER_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new ExchangeRateProviderError(
        `Provider HTTP ${response.status}`
      )
    }

    const json: unknown = await response.json()
    return parseProviderLatestResponse(json, new Date())
  } catch (error) {
    if (error instanceof ExchangeRateProviderError) throw error
    if (error instanceof Error && error.name === "AbortError") {
      throw new ExchangeRateProviderError("Provider request timed out")
    }
    throw new ExchangeRateProviderError(
      error instanceof Error ? error.message : "Provider request failed"
    )
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Get USD/PKR/TRY rates with a 12h in-memory cache.
 * On provider failure, returns the last successful cache marked stale when available.
 */
export async function getExchangeRates(
  options: FetchExchangeRatesOptions = {}
): Promise<ExchangeRatesResult> {
  const forceRefresh = options.forceRefresh === true
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 8_000
  const now = Date.now()

  if (!forceRefresh) {
    const cached = getCachedExchangeRates(now)
    if (cached?.isFresh) {
      return cached.result
    }
  }

  const existingInflight = getInflightExchangeRateFetch()
  if (existingInflight) {
    return existingInflight
  }

  const promise = (async () => {
    try {
      const fresh = await fetchFromProvider(fetchImpl, timeoutMs)
      return setCachedExchangeRates(fresh, Date.now())
    } catch (error) {
      const fallback = getCachedExchangeRates(Date.now())
      if (fallback) {
        // Provider failed — reuse last success and always mark stale.
        return {
          ...fallback.result,
          isCached: true,
          isStale: true,
        }
      }
      throw error
    } finally {
      setInflightExchangeRateFetch(null)
    }
  })()

  setInflightExchangeRateFetch(promise)
  return promise
}

export { ExchangeRateProviderError }
