import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"
import { hashPassword } from "../lib/auth/password"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`${name} is required to seed the owner account.`)
  }
  return value.trim()
}

async function main() {
  const email = requireEnv("OWNER_EMAIL").toLowerCase()
  const password = requireEnv("OWNER_PASSWORD")

  if (password.length < 12) {
    throw new Error("OWNER_PASSWORD must be at least 12 characters.")
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.")
  }

  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  try {
    const existingCount = await prisma.user.count({
      where: { deletedAt: null },
    })

    if (existingCount > 0) {
      console.log("Owner already exists — seed aborted (no changes).")
      return
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "Owner",
      },
    })

    console.log("Owner account created.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error"
  // Never log env values or password material
  console.error("Seed failed:", message)
  process.exitCode = 1
})
