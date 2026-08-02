import Decimal from "decimal.js"

import { BASE_CURRENCY, isSupportedCurrency, isUsd } from "@/lib/money/currency"

/**
 * Client-safe USD preview using Decimal.js (not JS floats).
 * Rate format: units of currency per 1 USD.
 */
export function previewBaseAmountUsd(
  amount: string,
  currency: string,
  exchangeRate: string
): string | null {
  const trimmedAmount = amount.trim()
  const trimmedRate = exchangeRate.trim()
  if (!trimmedAmount || !/^\d+(\.\d+)?$/.test(trimmedAmount)) return null
  if (!isSupportedCurrency(currency)) return null

  try {
    const amt = new Decimal(trimmedAmount)
    if (!amt.isFinite() || amt.lte(0)) return null

    if (isUsd(currency)) {
      return amt.toDecimalPlaces(4).toString()
    }

    if (!trimmedRate || !/^\d+(\.\d+)?$/.test(trimmedRate)) return null
    const rate = new Decimal(trimmedRate)
    if (!rate.isFinite() || rate.lte(0)) return null

    return amt.div(rate).toDecimalPlaces(4).toString()
  } catch {
    return null
  }
}

export function formatRateLabel(currency: string, rate: string): string {
  if (isUsd(currency)) return `1 ${BASE_CURRENCY} = 1 ${BASE_CURRENCY}`
  return `1 ${BASE_CURRENCY} = ${rate} ${currency}`
}
