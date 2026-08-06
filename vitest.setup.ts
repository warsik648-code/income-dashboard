import { config as loadEnv } from "dotenv"
import { vi } from "vitest"

// Allow importing server-only modules under Vitest (Node).
vi.mock("server-only", () => ({}))

loadEnv({ path: ".env" })
loadEnv({ path: ".env.local", override: true })

// Snapshot the app/production URL before integration env is loaded or tests
// temporarily point process.env.DATABASE_URL at the test database.
if (process.env.DATABASE_URL?.trim() && !process.env.PRODUCTION_DATABASE_URL) {
  process.env.PRODUCTION_DATABASE_URL = process.env.DATABASE_URL.trim()
}

// Integration credentials live here — never overwrite production .env file.
loadEnv({ path: ".env.integration", override: true })

// Integration tests select the DB exclusively via TEST_DATABASE_URL
// (see lib/test/integration-database.ts). They never fall back to DATABASE_URL.
