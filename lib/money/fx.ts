import { Prisma } from "@/generated/prisma/client"

import {
  assertSupportedCurrency,
  BASE_CURRENCY,
  isUsd,
  normalizeCurrencyCode,
} from "@/lib/money/currency"
import { assertPositiveAmount, type MoneyDecimalString } from "@/lib/money/decimal"

export type ExchangeRateSourceName =
  | "MANUAL"
  | "USER_OVERRIDE"
  | "PROVIDER"
  | "FIXED_USD"

export type FxSnapshotInput = {
  amount: MoneyDecimalString
  currency: string
  /**
   * Units of original currency per 1 USD (provider format).
   * Required unless currency is USD. Example: PKR per USD, TRY per USD.
   */
  exchangeRate?: MoneyDecimalString
  exchangeRateAt?: Date
  exchangeRateSource?: ExchangeRateSourceName
}

export type FxSnapshot = {
  amount: Prisma.Decimal
  currency: string
  exchangeRate: Prisma.Decimal
  baseAmountUsd: Prisma.Decimal
  exchangeRateAt: Date
  exchangeRateSource: ExchangeRateSourceName
}

/**
 * Convert an original-currency amount to USD using units-per-USD rate.
 * USD: amount
 * PKR/TRY: amount / exchangeRate
 */
export function convertToBaseUsd(
  amount: MoneyDecimalString | Prisma.Decimal,
  currency: string,
  exchangeRate?: MoneyDecimalString | Prisma.Decimal
): Prisma.Decimal {
  const code = assertSupportedCurrency(currency)
  const amt = amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount)

  if (isUsd(code)) {
    return amt.toDecimalPlaces(4)
  }

  if (exchangeRate === undefined || exchangeRate === "") {
    throw new Error("exchangeRate is required for non-USD currencies")
  }

  const rate =
    exchangeRate instanceof Prisma.Decimal
      ? exchangeRate
      : new Prisma.Decimal(exchangeRate)

  if (!rate.isFinite() || rate.lte(0)) {
    throw new Error("exchangeRate must be greater than zero")
  }

  return amt.div(rate).toDecimalPlaces(4)
}

/**
 * Build a frozen FX snapshot.
 * exchangeRate = units of original currency per 1 USD.
 * baseAmountUsd = amount / exchangeRate (Decimal math only).
 */
export function buildFxSnapshot(input: FxSnapshotInput): FxSnapshot {
  assertPositiveAmount(input.amount)

  const currency = assertSupportedCurrency(input.currency)
  const amount = new Prisma.Decimal(input.amount)
  const exchangeRateAt = input.exchangeRateAt ?? new Date()

  if (isUsd(currency)) {
    return {
      amount,
      currency: BASE_CURRENCY,
      exchangeRate: new Prisma.Decimal(1),
      baseAmountUsd: amount.toDecimalPlaces(4),
      exchangeRateAt,
      exchangeRateSource: "FIXED_USD",
    }
  }

  if (input.exchangeRate === undefined || input.exchangeRate === "") {
    throw new Error("exchangeRate is required for non-USD currencies")
  }

  assertPositiveAmount(input.exchangeRate)
  const exchangeRate = new Prisma.Decimal(input.exchangeRate)

  if (exchangeRate.lte(0)) {
    throw new Error("exchangeRate must be greater than zero")
  }

  const baseAmountUsd = convertToBaseUsd(amount, currency, exchangeRate)

  return {
    amount,
    currency,
    exchangeRate,
    baseAmountUsd,
    exchangeRateAt,
    exchangeRateSource: input.exchangeRateSource ?? "MANUAL",
  }
}

/** True when amount, currency, and rate match — preserve frozen USD snapshot fields. */
export function isSameFrozenFx(
  existing: {
    amount: Prisma.Decimal
    currency: string
    exchangeRate: Prisma.Decimal
  },
  next: Pick<FxSnapshot, "amount" | "currency" | "exchangeRate">
): boolean {
  return (
    existing.amount.equals(next.amount) &&
    normalizeCurrencyCode(existing.currency) ===
      normalizeCurrencyCode(next.currency) &&
    existing.exchangeRate.equals(next.exchangeRate)
  )
}

/** v1 safety rule: transaction currency must match the account native currency. */
export function assertTransactionCurrencyMatchesAccount(
  transactionCurrency: string,
  accountCurrency: string
): void {
  if (
    normalizeCurrencyCode(transactionCurrency) !==
    normalizeCurrencyCode(accountCurrency)
  ) {
    throw new Error(
      "Transaction currency must match the financial account currency (v1)"
    )
  }
}
