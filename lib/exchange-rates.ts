/**
 * Server-side exchange rates (USD / PKR / TRY).
 * Browser must call GET /api/exchange-rates — never the provider directly.
 */
import "server-only"

export {
  EXCHANGE_RATE_ATTRIBUTION,
  EXCHANGE_RATE_CACHE_FRESH_MS,
  EXCHANGE_RATE_PROVIDER_URL,
  type ExchangeRateMap,
  type ExchangeRatesResult,
} from "@/lib/exchange-rates/types"

export {
  ExchangeRateProviderError,
  getExchangeRates,
} from "@/lib/exchange-rates/service"

export { parseProviderLatestResponse } from "@/lib/exchange-rates/parse"
