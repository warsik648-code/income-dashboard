/**
 * Explicit UTC instant helpers for blockchain provider timestamps.
 *
 * Documented units per provider:
 * - TronGrid: Unix **milliseconds** when present
 * - mempool.space (Bitcoin): Unix **seconds**
 * - Ethereum JSON-RPC block timestamp: Unix **seconds** (hex)
 * - BlockCypher (Litecoin): Unix **seconds** (or ISO-8601 with Z/offset)
 *
 * Never use ambiguous `new Date(nonIsoString)` for provider clock fields.
 */

/** Convert Unix epoch seconds → UTC Date. */
export function utcFromUnixSeconds(seconds: number): Date {
  if (!Number.isFinite(seconds)) {
    throw new Error("Invalid Unix seconds timestamp")
  }
  return new Date(seconds * 1000)
}

/** Convert Unix epoch milliseconds → UTC Date (do not multiply again). */
export function utcFromUnixMilliseconds(milliseconds: number): Date {
  if (!Number.isFinite(milliseconds)) {
    throw new Error("Invalid Unix milliseconds timestamp")
  }
  return new Date(milliseconds)
}

/**
 * Parse an ISO-8601 instant that includes Z or a numeric offset.
 * Rejects date-only and offset-less local strings.
 */
export function utcFromIsoInstant(value: string): Date {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    throw new Error("Expected ISO-8601 datetime")
  }
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    throw new Error("ISO datetime must include Z or an offset")
  }
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid ISO instant")
  }
  return date
}

/** Ethereum/JSON-RPC hex quantity (seconds) → UTC Date. */
export function utcFromHexUnixSeconds(hex: string): Date {
  const cleaned = hex.trim().toLowerCase().replace(/^0x/, "")
  if (!/^[0-9a-f]+$/.test(cleaned)) {
    throw new Error("Invalid hex Unix seconds")
  }
  const seconds = Number.parseInt(cleaned, 16)
  return utcFromUnixSeconds(seconds)
}
