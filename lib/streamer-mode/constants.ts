/** localStorage key prefix; append `:${userId}` for per-user fallback. */
export const STREAMER_MODE_STORAGE_PREFIX = "income-dashboard:streamer-mode"

export const STREAMER_MODE_A11Y_LABEL = "Hidden financial value"

export function streamerModeStorageKey(userId: string) {
  return `${STREAMER_MODE_STORAGE_PREFIX}:${userId}`
}

/** Persist explicit strings only — never rely on Boolean(stored). */
export function serializeStreamerMode(enabled: boolean): "true" | "false" {
  return enabled ? "true" : "false"
}

export function parseStreamerModeStored(stored: string | null): boolean | null {
  if (stored === "true") return true
  if (stored === "false") return false
  // Legacy keys from the first Streamer Mode ship.
  if (stored === "1") return true
  if (stored === "0") return false
  return null
}
