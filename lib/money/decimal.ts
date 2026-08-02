import { Prisma } from "@/generated/prisma/client"

/**
 * Decimal-safe money helpers.
 *
 * - Persist amounts as Prisma Decimal / PostgreSQL NUMERIC only.
 * - Transaction.amount is always positive; sign comes from TransactionType.
 * - Never use JavaScript number arithmetic for stored money values.
 * - Never sum original amounts across different currencies.
 */

export type MoneyDecimalString = string

export function assertPositiveAmount(value: MoneyDecimalString): void {
  let decimal: Prisma.Decimal
  try {
    decimal = new Prisma.Decimal(value)
  } catch {
    throw new Error("Amount must be a valid decimal string")
  }

  if (!decimal.isFinite() || decimal.lte(0)) {
    throw new Error("Amount must be a positive decimal")
  }
}

export function toDecimal(value: MoneyDecimalString | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value)
}

export function signedAmountForType(
  amount: MoneyDecimalString,
  type: "INCOME" | "EXPENSE"
): Prisma.Decimal {
  assertPositiveAmount(amount)
  const decimal = toDecimal(amount)
  return type === "EXPENSE" ? decimal.neg() : decimal
}
