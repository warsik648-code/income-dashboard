import { afterEach, describe, expect, it } from "vitest"

import {
  assertSafeTestDatabaseUrl,
  hasExplicitTestMarker,
  resolveIntegrationTestDatabase,
} from "@/lib/test/integration-database"

const original = {
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  INTEGRATION_TEST_DB_MARKER: process.env.INTEGRATION_TEST_DB_MARKER,
}

afterEach(() => {
  process.env.TEST_DATABASE_URL = original.TEST_DATABASE_URL
  process.env.DATABASE_URL = original.DATABASE_URL
  process.env.INTEGRATION_TEST_DB_MARKER = original.INTEGRATION_TEST_DB_MARKER
})

describe("integration database safety guard", () => {
  it("never falls back to DATABASE_URL when TEST_DATABASE_URL is missing", () => {
    delete process.env.TEST_DATABASE_URL
    process.env.DATABASE_URL =
      "postgresql://postgres:pass@localhost:5432/income_dashboard"
    const status = resolveIntegrationTestDatabase()
    expect(status.ok).toBe(false)
    if (status.ok) return
    expect(status.reason).toBe("missing")
  })

  it("accepts a database name containing test", () => {
    expect(
      hasExplicitTestMarker(
        "postgresql://postgres:pass@localhost:5432/income_dashboard_test"
      )
    ).toBe(true)
    expect(() =>
      assertSafeTestDatabaseUrl(
        "postgresql://postgres:pass@localhost:5432/income_dashboard_test"
      )
    ).not.toThrow()
  })

  it("accepts integration_test=1 query marker", () => {
    expect(
      hasExplicitTestMarker(
        "postgresql://postgres:pass@localhost:5432/postgres?integration_test=1"
      )
    ).toBe(true)
  })

  it("rejects unmarked URLs", () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        "postgresql://postgres:pass@localhost:5432/income_dashboard"
      )
    ).toThrow(/explicit test marker/i)
  })

  it("rejects TEST_DATABASE_URL identical to DATABASE_URL", () => {
    const url =
      "postgresql://postgres:pass@localhost:5432/income_dashboard_test"
    process.env.DATABASE_URL = url
    process.env.TEST_DATABASE_URL = url
    const status = resolveIntegrationTestDatabase()
    expect(status.ok).toBe(false)
    if (status.ok) return
    expect(status.reason).toBe("matches_production")
  })

  it("resolves a safe distinct TEST_DATABASE_URL", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:pass@localhost:5432/income_dashboard"
    process.env.TEST_DATABASE_URL =
      "postgresql://postgres:pass@localhost:5432/income_dashboard_test"
    const status = resolveIntegrationTestDatabase()
    expect(status.ok).toBe(true)
    if (!status.ok) return
    expect(status.url).toContain("income_dashboard_test")
  })
})
