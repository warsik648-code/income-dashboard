/** Plain-text mask for contexts that cannot host React nodes (e.g. <option>). */
export function maskSensitivePlain(enabled: boolean, value: string): string {
  if (!enabled) return value
  return "••••••"
}

/** Placeholder for hidden wallet balances, differences, and timestamps. */
export const STREAMER_HIDDEN_PLACEHOLDER = "••••••••"

/**
 * Partially mask a public blockchain address for Streamer Mode display.
 * Examples: `TAHt••••••••38x`, `0x13••••C8F4`, `bc1q••••u9d`
 */
export function maskWalletAddress(address: string): string {
  const value = address.trim()
  if (!value) return ""
  if (value.length <= 10) return STREAMER_HIDDEN_PLACEHOLDER

  const isHex = value.startsWith("0x") || value.startsWith("0X")
  const prefixLen = isHex ? 4 : 4
  const suffixLen = isHex ? 4 : 3
  return `${value.slice(0, prefixLen)}••••••••${value.slice(-suffixLen)}`
}

export function maskSensitiveOrHidden(
  enabled: boolean,
  value: string | null | undefined,
  emptyFallback = "—"
): string {
  if (enabled) return STREAMER_HIDDEN_PLACEHOLDER
  if (value == null || value === "") return emptyFallback
  return value
}
