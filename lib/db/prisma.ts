import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and configure PostgreSQL."
    )
  }

  // Cap the driver pool. Default pg max=10 per warm serverless instance
  // exhausts Supabase session-mode pool_size (often 15) → EMAXCONNSESSION /
  // Prisma P2039 and a dashboard error boundary after login.
  const adapter = new PrismaPg({
    connectionString,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  })
  return new PrismaClient({ adapter })
}

/**
 * Shared Prisma client (Node runtime only — do not import from Edge).
 * Requires DATABASE_URL. Client is generated at generated/prisma.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Always reuse the client across warm serverless invocations.
globalForPrisma.prisma = prisma
