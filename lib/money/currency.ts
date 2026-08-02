/** Dashboard reporting base currency — never overwrite original transaction amounts. */
export const BASE_CURRENCY = "USD" as const

export type BaseCurrency = typeof BASE_CURRENCY

/** Common fiat codes; Zod allowlists may extend this over time. */
export const SUPPORTED_FIAT = [
  "USD",
  "TRY",
  "PKR",
  "EUR",
  "GBP",
  "AED",
  "SAR",
] as const

export type SupportedFiat = (typeof SUPPORTED_FIAT)[number]

/** Common crypto / stablecoin codes for CRYPTO assetClass accounts. */
export const SUPPORTED_CRYPTO = [
  "BTC",
  "ETH",
  "USDT",
  "USDC",
  "BNB",
] as const

export type SupportedCrypto = (typeof SUPPORTED_CRYPTO)[number]

export function isUsd(currency: string): boolean {
  return currency.trim().toUpperCase() === BASE_CURRENCY
}

export function normalizeCurrencyCode(currency: string): string {
  return currency.trim().toUpperCase()
}
