import { describe, expect, it } from "vitest"

import { hasValidSessionUserId } from "@/lib/auth/session-guards"

describe("hasValidSessionUserId", () => {
  it("rejects missing session and empty ids", () => {
    expect(hasValidSessionUserId(null)).toBe(false)
    expect(hasValidSessionUserId(undefined)).toBe(false)
    expect(hasValidSessionUserId({ user: { id: "" } })).toBe(false)
    expect(hasValidSessionUserId({ user: { id: "   " } })).toBe(false)
    expect(hasValidSessionUserId({ user: null })).toBe(false)
  })

  it("accepts a non-empty user id", () => {
    expect(hasValidSessionUserId({ user: { id: "user_123" } })).toBe(true)
  })
})
