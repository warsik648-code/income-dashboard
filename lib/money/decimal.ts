/**
 * Decimal-safe money helpers.
 *
 * Rules (see Phase 2 architecture):
 * - Persist amounts as Prisma Decimal / PostgreSQL NUMERIC only.
 * - Transaction.amount is always positive; sign comes from TransactionType.
 * - Never use JavaScript number arithmetic for stored money values.
 * - Never sum across different currencies.
 *
 * Implementations land with domain services — stubs only for now.
 */

export type MoneyDecimalString = string

export function assertPositiveAmount(_value: MoneyDecimalString): void {
  throw new Error("lib/money: not implemented yet")
}

export function signedAmountForType(
  _amount: MoneyDecimalString,
  _type: "INCOME" | "EXPENSE"
): MoneyDecimalString {
  throw new Error("lib/money: not implemented yet")
}
