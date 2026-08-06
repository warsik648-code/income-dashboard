import { describe, expect, it } from "vitest"

import { decideAuthorized } from "@/lib/auth/authorized"

describe("decideAuthorized", () => {
  it("allows /login for guests and logged-in users (no middleware bounce)", () => {
    expect(decideAuthorized({ pathname: "/login", isLoggedIn: false })).toBe(
      true
    )
    expect(decideAuthorized({ pathname: "/login", isLoggedIn: true })).toBe(
      true
    )
    expect(
      decideAuthorized({ pathname: "/login/", isLoggedIn: true })
    ).toBe(true)
  })

  it("requires login for /dashboard once", () => {
    expect(
      decideAuthorized({ pathname: "/dashboard", isLoggedIn: false })
    ).toBe(false)
    expect(
      decideAuthorized({ pathname: "/dashboard/expenses", isLoggedIn: false })
    ).toBe(false)
    expect(
      decideAuthorized({ pathname: "/dashboard", isLoggedIn: true })
    ).toBe(true)
  })

  it("sends root / to login or dashboard without looping through login", () => {
    expect(decideAuthorized({ pathname: "/", isLoggedIn: false })).toEqual({
      redirectTo: "/login",
    })
    expect(decideAuthorized({ pathname: "/", isLoggedIn: true })).toEqual({
      redirectTo: "/dashboard",
    })
  })
})
