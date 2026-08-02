import Decimal from "decimal.js"

import {
  assertSupportedCurrency,
  isUsd,
  type SupportedCurrency,
} from "@/lib/money/currency"

export type TransferRatePair = {
  /** Units of PKR per 1 USD */
  PKR: string
  /** Units of TRY per 1 USD */
  TRY: string
}

/**
 * Suggest destination amount using units-per-USD rates (Decimal.js).
 * @param displayDecimals UI rounding (default 2). Pass null to keep full Decimal precision.
 */
export function suggestDestinationAmount(input: {
  sourceAmount: string
  sourceCurrency: string
  destinationCurrency: string
  rates: TransferRatePair
  displayDecimals?: number | null
}): string | null {
  const source = assertSupportedCurrency(input.sourceCurrency)
  const dest = assertSupportedCurrency(input.destinationCurrency)
  const decimals =
    input.displayDecimals === undefined ? 2 : input.displayDecimals
  try {
    const amount = new Decimal(input.sourceAmount.trim())
    if (!amount.isFinite() || amount.lte(0)) return null

    if (source === dest) {
      return decimals === null
        ? amount.toString()
        : amount.toDecimalPlaces(decimals).toFixed(decimals)
    }

    const pkr = new Decimal(input.rates.PKR)
    const tryRate = new Decimal(input.rates.TRY)
    if (!pkr.isFinite() || pkr.lte(0) || !tryRate.isFinite() || tryRate.lte(0)) {
      return null
    }

    const toUsd = (value: Decimal, currency: SupportedCurrency) => {
      if (isUsd(currency)) return value
      if (currency === "PKR") return value.div(pkr)
      return value.div(tryRate)
    }

    const fromUsd = (usd: Decimal, currency: SupportedCurrency) => {
      if (isUsd(currency)) return usd
      if (currency === "PKR") return usd.mul(pkr)
      return usd.mul(tryRate)
    }

    const converted = fromUsd(toUsd(amount, source), dest)
    if (decimals === null) return converted.toString()
    return converted.toDecimalPlaces(decimals).toFixed(decimals)
  } catch {
    return null
  }
}

/** True when both PKR and TRY provider rates are usable positive numbers. */
export function hasValidTransferRates(rates: TransferRatePair | null | undefined) {
  if (!rates) return false
  try {
    const pkr = new Decimal(rates.PKR)
    const tryRate = new Decimal(rates.TRY)
    return pkr.isFinite() && pkr.gt(0) && tryRate.isFinite() && tryRate.gt(0)
  } catch {
    return false
  }
}

/**
 * Effective rate in provider style where possible:
 * - same currency → 1
 * - involves USD → non-USD units per 1 USD
 * - TRY↔PKR → destination units per 1 source unit
 */
export function computeEffectiveExchangeRate(input: {
  sourceAmount: string
  sourceCurrency: string
  destinationAmount: string
  destinationCurrency: string
}): string | null {
  const source = assertSupportedCurrency(input.sourceCurrency)
  const dest = assertSupportedCurrency(input.destinationCurrency)
  try {
    const srcAmt = new Decimal(input.sourceAmount)
    const destAmt = new Decimal(input.destinationAmount)
    if (!srcAmt.isFinite() || srcAmt.lte(0)) return null
    if (!destAmt.isFinite() || destAmt.lte(0)) return null

    if (source === dest) return "1"

    if (isUsd(source) && !isUsd(dest)) {
      return destAmt.div(srcAmt).toDecimalPlaces(12).toString()
    }
    if (!isUsd(source) && isUsd(dest)) {
      return srcAmt.div(destAmt).toDecimalPlaces(12).toString()
    }

    // TRY ↔ PKR: destination per 1 source
    return destAmt.div(srcAmt).toDecimalPlaces(12).toString()
  } catch {
    return null
  }
}

/** USD units-per-USD rate for a currency given provider rates + optional override. */
export function unitsPerUsdForCurrency(
  currency: string,
  rates: TransferRatePair,
  override?: string | null
): string {
  const code = assertSupportedCurrency(currency)
  if (isUsd(code)) return "1"
  if (override?.trim()) return override.trim()
  if (code === "PKR") return rates.PKR
  return rates.TRY
}
