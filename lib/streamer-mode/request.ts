/**
 * Decide whether a server action response should update client state.
 * Stale responses (older requestId) must never overwrite a newer toggle.
 */
export function shouldApplyStreamerModeResult(input: {
  responseRequestId: number | undefined
  latestRequestId: number
}): boolean {
  if (input.responseRequestId == null) {
    return false
  }
  return input.responseRequestId === input.latestRequestId
}

/** Pure axis tick text — always a string; never used as `tick={false}`. */
export function formatStreamerAxisTick(
  enabled: boolean,
  value: string | number | null | undefined
): string {
  if (enabled) return ""
  if (value == null) return ""
  return String(value)
}
