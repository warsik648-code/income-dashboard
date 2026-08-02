import { Prisma } from "@/generated/prisma/client"

import { BASE_CURRENCY, isUsd, normalizeCurrencyCode } from "@/lib/money/currency"
import { assertPositiveAmount, type MoneyDecimalString } from "@/lib/money/decimal"

export type ExchangeRateSourceName =
  | "MANUAL"
  | "USER_OVERRIDE"
  | "PROVIDER"
  | "FIXED_USD"

export type FxSnapshotInput = {
  amount: MoneyDecimalString
  currency: string
  /** USD per 1 unit of original currency. Required unless currency is USD. */
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
 * Build a frozen FX snapshot.
 * exchangeRate = USD per 1 unit of original currency.
 * baseAmountUsd = amount * exchangeRate (Decimal math only).
 */
export function buildFxSnapshot(input: FxSnapshotInput): FxSnapshot {
  assertPositiveAmount(input.amount)

  const currency = normalizeCurrencyCode(input.currency)
  const amount = new Prisma.Decimal(input.amount)
  const exchangeRateAt = input.exchangeRateAt ?? new Date()

  if (isUsd(currency)) {
    return {
      amount,
      currency: BASE_CURRENCY,
      exchangeRate: new Prisma.Decimal(1),
      baseAmountUsd: amount,
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

  const baseAmountUsd = amount.mul(exchangeRate).toDecimalPlaces(4)

  return {
    amount,
    currency,
    exchangeRate,
    baseAmountUsd,
    exchangeRateAt,
    exchangeRateSource: input.exchangeRateSource ?? "MANUAL",
  }
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
