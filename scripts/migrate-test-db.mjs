#!/usr/bin/env node
/**
 * Apply Prisma migrations to the isolated TEST database only.
 *
 * Loads .env.integration (and optionally .env for production comparison).
 * Never writes to .env. Never uses production DATABASE_URL as the migrate target.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { config as loadEnv } from "dotenv"

const root = resolve(import.meta.dirname, "..")

// Load production .env first only so we can refuse identical URLs.
loadEnv({ path: resolve(root, ".env") })
const productionDatabaseUrl = process.env.DATABASE_URL?.trim() || ""

// Clear so production values cannot leak into the migrate target.
delete process.env.DATABASE_URL
delete process.env.DIRECT_URL

const integrationPath = resolve(root, ".env.integration")
if (!existsSync(integrationPath)) {
  console.error(
    "Missing .env.integration. Copy .env.integration.example and paste the test project URLs."
  )
  process.exit(1)
}

loadEnv({ path: integrationPath, override: true })

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
const testDirectUrl = process.env.TEST_DIRECT_URL?.trim()

if (!testDatabaseUrl) {
  console.error("TEST_DATABASE_URL is required in .env.integration.")
  process.exit(1)
}

function normalize(url) {
  try {
    const parsed = new URL(url)
    const schema = parsed.searchParams.get("schema")
    parsed.search = ""
    if (schema) parsed.searchParams.set("schema", schema)
    parsed.hash = ""
    return parsed.toString()
  } catch {
    return url.trim()
  }
}

function hasMarker(url) {
  try {
    const parsed = new URL(url)
    const dbName = decodeURIComponent(
      parsed.pathname.replace(/^\//, "").split("/")[0] ?? ""
    ).toLowerCase()
    if (dbName.includes("test")) return true
    if (parsed.searchParams.get("integration_test") === "1") return true
    if (parsed.username.toLowerCase().includes("test")) return true
    if (parsed.hostname.toLowerCase().includes("test")) return true
  } catch {
    return false
  }
  const marker = process.env.INTEGRATION_TEST_DB_MARKER?.trim()
  return Boolean(marker && url.includes(marker))
}

if (!hasMarker(testDatabaseUrl)) {
  console.error(
    "Unsafe TEST_DATABASE_URL: add ?integration_test=1, or set INTEGRATION_TEST_DB_MARKER to the test project ref."
  )
  process.exit(1)
}

if (
  productionDatabaseUrl &&
  normalize(productionDatabaseUrl) === normalize(testDatabaseUrl)
) {
  console.error(
    "Refusing to migrate: TEST_DATABASE_URL is identical to production DATABASE_URL."
  )
  process.exit(1)
}

if (
  testDirectUrl &&
  productionDatabaseUrl &&
  normalize(productionDatabaseUrl) === normalize(testDirectUrl)
) {
  console.error(
    "Refusing to migrate: TEST_DIRECT_URL is identical to production DATABASE_URL."
  )
  process.exit(1)
}

// Prefer direct URL for migrations (Supabase pooler is not ideal for migrate).
const migrateUrl = testDirectUrl || testDatabaseUrl
process.env.DATABASE_URL = migrateUrl

// Redact credentials in logs.
try {
  const parsed = new URL(migrateUrl)
  console.log(
    `Migrating test database host=${parsed.hostname} db=${parsed.pathname.replace(/^\//, "")} user=${parsed.username}`
  )
} catch {
  console.log("Migrating test database (URL parsed with redaction).")
}

const result = spawnSync(
  "pnpm",
  ["exec", "prisma", "migrate", "deploy"],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  }
)

process.exit(result.status ?? 1)
