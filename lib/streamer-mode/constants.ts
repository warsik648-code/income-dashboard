/** localStorage key prefix; append `:${userId}` for per-user fallback. */
export const STREAMER_MODE_STORAGE_PREFIX = "income-dashboard:streamer-mode"

export const STREAMER_MODE_A11Y_LABEL = "Hidden financial value"

export function streamerModeStorageKey(userId: string) {
  return `${STREAMER_MODE_STORAGE_PREFIX}:${userId}`
}
