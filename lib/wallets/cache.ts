/**
 * Server-side in-memory cache for live wallet balances (3 minutes).
 * Resets when the process restarts.
 */

import type { BalanceFetchResult } from "@/lib/wallets/types"

export const WALLET_BALANCE_CACHE_TTL_MS = 3 * 60 * 1000

type CacheEntry = {
  result: BalanceFetchResult
  storedAtMs: number
}

const cache = new Map<string, CacheEntry>()

export function walletBalanceCacheKey(
  userId: string,
  integrationId: string
): string {
  return `wallet-balance:${userId}:${integrationId}`
}

export function getCachedWalletBalance(
  userId: string,
  integrationId: string,
  nowMs: number = Date.now()
): BalanceFetchResult | null {
  const key = walletBalanceCacheKey(userId, integrationId)
  const entry = cache.get(key)
  if (!entry) return null
  if (nowMs - entry.storedAtMs >= WALLET_BALANCE_CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.result
}

export function setCachedWalletBalance(
  userId: string,
  integrationId: string,
  result: BalanceFetchResult,
  nowMs: number = Date.now()
): void {
  cache.set(walletBalanceCacheKey(userId, integrationId), {
    result,
    storedAtMs: nowMs,
  })
}

export function clearCachedWalletBalance(
  userId: string,
  integrationId: string
): void {
  cache.delete(walletBalanceCacheKey(userId, integrationId))
}

export function resetWalletBalanceCacheForTests(): void {
  cache.clear()
}
