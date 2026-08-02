import { config as loadEnv } from "dotenv"

loadEnv({ path: ".env" })
loadEnv({ path: ".env.local", override: true })

// Integration tests select the DB exclusively via TEST_DATABASE_URL
// (see lib/test/integration-database.ts). They never fall back to DATABASE_URL.
