import { beforeEach, describe, expect, it } from "vitest"

import {
  WALLET_BALANCE_CACHE_TTL_MS,
  getCachedWalletBalance,
  resetWalletBalanceCacheForTests,
  setCachedWalletBalance,
} from "@/lib/wallets/cache"

describe("wallet balance cache", () => {
  beforeEach(() => {
    resetWalletBalanceCacheForTests()
  })

  it("returns cached response within 3 minutes", () => {
    const now = 1_000_000
    setCachedWalletBalance(
      "user1",
      "int1",
      {
        balance: "12.5",
        decimals: 6,
        fetchedAt: new Date(now),
      },
      now
    )
    const hit = getCachedWalletBalance("user1", "int1", now + 60_000)
    expect(hit?.balance).toBe("12.5")
  })

  it("expires after TTL", () => {
    const now = 1_000_000
    setCachedWalletBalance(
      "user1",
      "int1",
      {
        balance: "1",
        decimals: 8,
        fetchedAt: new Date(now),
      },
      now
    )
    const miss = getCachedWalletBalance(
      "user1",
      "int1",
      now + WALLET_BALANCE_CACHE_TTL_MS + 1
    )
    expect(miss).toBeNull()
  })
})
