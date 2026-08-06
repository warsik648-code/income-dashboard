/**
 * In-process rate limit for forced wallet balance refreshes.
 */

type Bucket = { timestamps: number[] }

const WINDOW_MS = 60 * 1000
const MAX_REFRESHES = 10

const buckets = new Map<string, Bucket>()

function prune(bucket: Bucket, now: number) {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS)
}

export function checkWalletRefreshLimit(userId: string): {
  allowed: boolean
  retryAfterSeconds: number
} {
  const now = Date.now()
  const key = `wallet-refresh:${userId}`
  const bucket = buckets.get(key) ?? { timestamps: [] }
  prune(bucket, now)

  if (bucket.timestamps.length >= MAX_REFRESHES) {
    const oldest = bucket.timestamps[0] ?? now
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + WINDOW_MS - now) / 1000)
    )
    buckets.set(key, bucket)
    return { allowed: false, retryAfterSeconds }
  }

  buckets.set(key, bucket)
  return { allowed: true, retryAfterSeconds: 0 }
}

export function recordWalletRefresh(userId: string): void {
  const now = Date.now()
  const key = `wallet-refresh:${userId}`
  const bucket = buckets.get(key) ?? { timestamps: [] }
  prune(bucket, now)
  bucket.timestamps.push(now)
  buckets.set(key, bucket)
}

export function resetWalletRefreshLimitForTests(): void {
  buckets.clear()
}
