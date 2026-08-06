import { describe, expect, it } from "vitest"

import { isSafeHttpsLogoUrl } from "@/lib/subscriptions/logo-url"

describe("isSafeHttpsLogoUrl", () => {
  it("accepts allowlisted https hosts used by saved subscriptions", () => {
    expect(
      isSafeHttpsLogoUrl("https://upload.wikimedia.org/wikipedia/commons/a/a.png")
    ).toBe(true)
    expect(
      isSafeHttpsLogoUrl("https://images.seeklogo.com/logo-png/43/1/openai.png")
    ).toBe(true)
    expect(
      isSafeHttpsLogoUrl("https://encrypted-tbn0.gstatic.com/images?q=tbn:x")
    ).toBe(true)
    expect(isSafeHttpsLogoUrl("https://uxwing.com/wp-content/x.png")).toBe(true)
    expect(isSafeHttpsLogoUrl("https://logo.clearbit.com/openai.com")).toBe(
      true
    )
  })

  it("rejects missing, non-https, and unknown hosts", () => {
    expect(isSafeHttpsLogoUrl(null)).toBe(false)
    expect(isSafeHttpsLogoUrl("")).toBe(false)
    expect(isSafeHttpsLogoUrl("http://upload.wikimedia.org/x.png")).toBe(false)
    expect(isSafeHttpsLogoUrl("https://evil.example/logo.png")).toBe(false)
  })
})
