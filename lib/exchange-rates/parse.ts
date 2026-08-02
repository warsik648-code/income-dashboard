import type {
  ExchangeRateMap,
  ExchangeRatesResult,
  ProviderLatestResponse,
} from "@/lib/exchange-rates/types"

export class ExchangeRateProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ExchangeRateProviderError"
  }
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function asIsoOrEmpty(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.trim()
  return date.toISOString()
}

/**
 * Validate ExchangeRate-API open endpoint payload and extract USD/PKR/TRY only.
 */
export function parseProviderLatestResponse(
  payload: unknown,
  fetchedAt: Date = new Date()
): Omit<ExchangeRatesResult, "isCached" | "isStale"> {
  if (!payload || typeof payload !== "object") {
    throw new ExchangeRateProviderError("Provider response is not an object")
  }

  const body = payload as ProviderLatestResponse

  if (body.result !== "success") {
    throw new ExchangeRateProviderError(
      `Provider result is not success (got ${String(body.result)})`
    )
  }

  if (!body.rates || typeof body.rates !== "object") {
    throw new ExchangeRateProviderError("Provider rates object is missing")
  }

  const ratesRaw = body.rates as Record<string, unknown>
  const usd = ratesRaw.USD
  const pkr = ratesRaw.PKR
  const tryRate = ratesRaw.TRY

  if (usd !== 1) {
    throw new ExchangeRateProviderError(
      `rates.USD must equal 1 (got ${String(usd)})`
    )
  }
  if (!isPositiveFiniteNumber(pkr)) {
    throw new ExchangeRateProviderError(
      "rates.PKR must be a positive finite number"
    )
  }
  if (!isPositiveFiniteNumber(tryRate)) {
    throw new ExchangeRateProviderError(
      "rates.TRY must be a positive finite number"
    )
  }

  const rates: ExchangeRateMap = {
    USD: 1,
    PKR: pkr,
    TRY: tryRate,
  }

  return {
    baseCurrency: "USD",
    rates,
    providerUpdatedAt: asIsoOrEmpty(body.time_last_update_utc),
    fetchedAt: fetchedAt.toISOString(),
    nextUpdateAt: asIsoOrEmpty(body.time_next_update_utc),
    source: "ExchangeRate-API",
  }
}
