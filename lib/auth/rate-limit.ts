/**
 * In-process sliding-window rate limiter for login attempts.
 * Suitable for a single Node process. Before multi-instance production,
 * replace with shared Redis/Upstash rate limiting.
 */

type Bucket = {
  timestamps: number[]
}

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

const buckets = new Map<string, Bucket>()

function prune(bucket: Bucket, now: number) {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS)
}

export function getLoginRateLimitKey(ip: string, email: string): string {
  const normalizedEmail = email.trim().toLowerCase()
  return `${ip}|${normalizedEmail}`
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean
  retryAfterSeconds: number
} {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { timestamps: [] }
  prune(bucket, now)

  if (bucket.timestamps.length >= MAX_ATTEMPTS) {
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

export function recordLoginAttempt(key: string): void {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { timestamps: [] }
  prune(bucket, now)
  bucket.timestamps.push(now)
  buckets.set(key, bucket)
}

export function clearLoginRateLimit(key: string): void {
  buckets.delete(key)
}
