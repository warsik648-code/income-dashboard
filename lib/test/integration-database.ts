/**
 * Isolated integration-test database selection.
 *
 * Rules:
 * - Integration tests may only use TEST_DATABASE_URL.
 * - Never fall back to DATABASE_URL.
 * - Reject URLs that lack an explicit test marker.
 * - Reject TEST_DATABASE_URL when it is identical to DATABASE_URL.
 */

export type IntegrationDatabaseStatus =
  | { ok: true; url: string }
  | {
      ok: false
      reason: "missing" | "unsafe" | "matches_production"
      message: string
    }

function normalizeConnectionString(url: string): string {
  try {
    const parsed = new URL(url)
    // Drop query noise that does not change the target database identity.
    const schema = parsed.searchParams.get("schema")
    parsed.search = ""
    if (schema) parsed.searchParams.set("schema", schema)
    parsed.hash = ""
    return parsed.toString()
  } catch {
    return url.trim()
  }
}

function databaseNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0] ?? "")
  } catch {
    return ""
  }
}

/**
 * Explicit test markers (any one is enough):
 * - database name contains "test" (e.g. income_dashboard_test)
 * - query param integration_test=1
 * - env INTEGRATION_TEST_DB_MARKER matching a substring of the URL
 */
export function hasExplicitTestMarker(url: string): boolean {
  const dbName = databaseNameFromUrl(url).toLowerCase()
  if (dbName.includes("test")) return true

  try {
    const parsed = new URL(url)
    if (parsed.searchParams.get("integration_test") === "1") return true
  } catch {
    // fall through
  }

  const marker = process.env.INTEGRATION_TEST_DB_MARKER?.trim()
  if (marker && url.includes(marker)) return true

  return false
}

export function assertSafeTestDatabaseUrl(url: string): void {
  const trimmed = url.trim()
  if (!trimmed) {
    throw new Error(
      "TEST_DATABASE_URL is empty. Configure an isolated test database."
    )
  }

  try {
    void new URL(trimmed)
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid URL.")
  }

  if (!hasExplicitTestMarker(trimmed)) {
    throw new Error(
      "Unsafe TEST_DATABASE_URL: add an explicit test marker. " +
        'Use a database name containing "test" (recommended: income_dashboard_test), ' +
        "or append ?integration_test=1, " +
        "or set INTEGRATION_TEST_DB_MARKER to a unique substring of the URL."
    )
  }

  const productionUrl = process.env.DATABASE_URL?.trim()
  if (
    productionUrl &&
    normalizeConnectionString(productionUrl) ===
      normalizeConnectionString(trimmed)
  ) {
    throw new Error(
      "Unsafe TEST_DATABASE_URL: it must not be identical to DATABASE_URL. " +
        "Point TEST_DATABASE_URL at a separate database."
    )
  }
}

/** Resolve TEST_DATABASE_URL without falling back to DATABASE_URL. */
export function resolveIntegrationTestDatabase(): IntegrationDatabaseStatus {
  const testUrl = process.env.TEST_DATABASE_URL?.trim()
  if (!testUrl) {
    return {
      ok: false,
      reason: "missing",
      message:
        "TEST_DATABASE_URL is not set. Integration tests are skipped; unit tests still run.",
    }
  }

  try {
    assertSafeTestDatabaseUrl(testUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const reason = message.includes("identical to DATABASE_URL")
      ? ("matches_production" as const)
      : ("unsafe" as const)
    return { ok: false, reason, message }
  }

  return { ok: true, url: testUrl }
}

/**
 * Install the verified test URL into DATABASE_URL for the current process so
 * the shared Prisma singleton (used by services) connects to the test DB only.
 * Clears any cached Prisma client created earlier in this process.
 */
export function installVerifiedTestDatabaseUrl(): string {
  const status = resolveIntegrationTestDatabase()
  if (!status.ok) {
    throw new Error(status.message)
  }

  process.env.DATABASE_URL = status.url

  const globalForPrisma = globalThis as unknown as { prisma?: unknown }
  globalForPrisma.prisma = undefined

  return status.url
}

export function isIntegrationTestDatabaseConfigured(): boolean {
  return resolveIntegrationTestDatabase().ok
}
