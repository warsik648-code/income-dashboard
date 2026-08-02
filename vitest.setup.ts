import { config as loadEnv } from "dotenv"

loadEnv({ path: ".env" })
loadEnv({ path: ".env.local", override: true })
