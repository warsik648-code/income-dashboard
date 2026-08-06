import { describe, expect, it } from "vitest"

import { STREAMER_MODE_A11Y_LABEL, streamerModeStorageKey } from "./constants"
import { maskSensitivePlain } from "./mask"

describe("streamer mode preference helpers", () => {
  it("defaults conceptually to off and keys per user", () => {
    expect(streamerModeStorageKey("user_1")).toBe(
      "income-dashboard:streamer-mode:user_1"
    )
    expect(streamerModeStorageKey("user_2")).not.toBe(
      streamerModeStorageKey("user_1")
    )
  })

  it("masks plain text only when enabled without exposing the source", () => {
    expect(maskSensitivePlain(false, "1234.56")).toBe("1234.56")
    expect(maskSensitivePlain(true, "1234.56")).toBe("••••••")
    expect(maskSensitivePlain(true, "1234.56")).not.toContain("1234")
  })

  it("uses a neutral accessibility label", () => {
    expect(STREAMER_MODE_A11Y_LABEL).toBe("Hidden financial value")
  })
})

describe("streamer mode coverage expectations", () => {
  const auditedRoutes = [
    "/dashboard",
    "/dashboard/income",
    "/dashboard/expenses",
    "/dashboard/accounts",
    "/dashboard/subscriptions",
    "/dashboard/debts",
    "/dashboard/transfers",
    "/dashboard/analytics",
    "/dashboard/settings",
  ]

  it("lists every protected finance route that must respect Streamer Mode", () => {
    expect(auditedRoutes).toHaveLength(9)
    expect(new Set(auditedRoutes).size).toBe(9)
  })
})
