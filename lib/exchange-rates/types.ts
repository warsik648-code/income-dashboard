import type { SupportedCurrency } from "@/lib/money/currency"

export type ExchangeRateMap = Record<SupportedCurrency, number>

export type ExchangeRatesResult = {
  baseCurrency: "USD"
  rates: ExchangeRateMap
  providerUpdatedAt: string
  fetchedAt: string
  nextUpdateAt: string
  source: "ExchangeRate-API"
  isCached: boolean
  isStale: boolean
}

export type ProviderLatestResponse = {
  result?: unknown
  time_last_update_utc?: unknown
  time_next_update_utc?: unknown
  base_code?: unknown
  rates?: unknown
}

export const EXCHANGE_RATE_PROVIDER_URL =
  "https://open.er-api.com/v6/latest/USD" as const

export const EXCHANGE_RATE_CACHE_FRESH_MS = 12 * 60 * 60 * 1000

export const EXCHANGE_RATE_ATTRIBUTION = {
  label: "Rates by ExchangeRate-API",
  href: "https://www.exchangerate-api.com",
} as const
