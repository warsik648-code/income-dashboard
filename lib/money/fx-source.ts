import type { ExchangeRateSourceName } from "@/lib/money/fx"

const ALLOWED: ReadonlySet<string> = new Set([
  "MANUAL",
  "USER_OVERRIDE",
  "PROVIDER",
  "FIXED_USD",
])

export function resolveExchangeRateSource(input: {
  currency: string
  exchangeRate?: string | null
  exchangeRateSource?: string | null
}): ExchangeRateSourceName {
  if (input.currency === "USD") return "FIXED_USD"
  const fromForm = input.exchangeRateSource?.trim()
  if (fromForm && ALLOWED.has(fromForm) && fromForm !== "FIXED_USD") {
    return fromForm as ExchangeRateSourceName
  }
  return input.exchangeRate?.trim() ? "USER_OVERRIDE" : "MANUAL"
}
