import { assertSupportedCurrency } from "@/lib/money"

/**
 * Transfer fee currency is always the source account's native currency.
 * Client-submitted feeCurrency must never be trusted for ledger writes.
 */
export function resolveTransferFeeCurrency(input: {
  sourceCurrency: string
  feeAmount: string | number
}): string | null {
  const amount =
    typeof input.feeAmount === "number"
      ? input.feeAmount
      : Number(String(input.feeAmount).trim() || "0")
  if (!Number.isFinite(amount) || amount <= 0) return null
  return assertSupportedCurrency(input.sourceCurrency)
}

/** True when a client feeCurrency differs from the enforced source currency. */
export function isMismatchedClientFeeCurrency(
  sourceCurrency: string,
  clientFeeCurrency?: string | null
): boolean {
  const client = clientFeeCurrency?.trim()
  if (!client) return false
  try {
    return (
      assertSupportedCurrency(client) !==
      assertSupportedCurrency(sourceCurrency)
    )
  } catch {
    return true
  }
}
