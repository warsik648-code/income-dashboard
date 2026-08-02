/** Dashboard reporting base currency — never overwrite original transaction amounts. */
export const BASE_CURRENCY = "USD" as const

export type BaseCurrency = typeof BASE_CURRENCY

/**
 * Only currencies the app supports for accounts, debts, filters, and FX.
 * Exchange rates convert these to USD (base/reporting currency).
 */
export const SUPPORTED_CURRENCIES = ["USD", "PKR", "TRY"] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

/** @deprecated Use SUPPORTED_CURRENCIES — all supported codes are fiat. */
export const SUPPORTED_FIAT = SUPPORTED_CURRENCIES

export type SupportedFiat = SupportedCurrency

export function isUsd(currency: string): boolean {
  return currency.trim().toUpperCase() === BASE_CURRENCY
}

export function normalizeCurrencyCode(currency: string): string {
  return currency.trim().toUpperCase()
}

export function isSupportedCurrency(
  currency: string
): currency is SupportedCurrency {
  const code = normalizeCurrencyCode(currency)
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code)
}

export function assertSupportedCurrency(currency: string): SupportedCurrency {
  const code = normalizeCurrencyCode(currency)
  if (!isSupportedCurrency(code)) {
    throw new Error(
      `Unsupported currency “${code}”. Allowed: ${SUPPORTED_CURRENCIES.join(", ")}`
    )
  }
  return code
}
