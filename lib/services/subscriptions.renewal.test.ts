import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  installVerifiedTestDatabaseUrl,
  resolveIntegrationTestDatabase,
} from "@/lib/test/integration-database"

const dbStatus = resolveIntegrationTestDatabase()

if (dbStatus.ok) {
  installVerifiedTestDatabaseUrl()
}

describe.skipIf(!dbStatus.ok)("subscription renewalPeriod unique", () => {
  const suffix = `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  let userId = ""
  let accountId = ""
  let subscriptionId = ""
  let prisma: typeof import("@/lib/db").prisma
  let confirmRenewalPayment: typeof import("@/lib/services/subscriptions").confirmRenewalPayment
  let SubscriptionServiceError: typeof import("@/lib/services/subscriptions").SubscriptionServiceError
  let Prisma: typeof import("@/generated/prisma/client").Prisma

  beforeAll(async () => {
    installVerifiedTestDatabaseUrl()
    ;({ prisma } = await import("@/lib/db"))
    ;({ confirmRenewalPayment, SubscriptionServiceError } = await import(
      "@/lib/services/subscriptions"
    ))
    ;({ Prisma } = await import("@/generated/prisma/client"))
    const { ensureExpenseCategories } = await import(
      "@/lib/services/categories"
    )

    const user = await prisma.user.create({
      data: {
        email: `${suffix}@renewal.test`,
        name: "Renewal Test",
        passwordHash: "test-hash-not-used",
      },
    })
    userId = user.id
    await ensureExpenseCategories(userId)

    const account = await prisma.financialAccount.create({
      data: {
        userId,
        name: `Cash ${suffix}`,
        type: "CASH",
        currency: "USD",
        assetClass: "FIAT",
        cachedBalance: new Prisma.Decimal("100"),
      },
    })
    accountId = account.id

    await prisma.transaction.create({
      data: {
        userId,
        accountId,
        type: "INCOME",
        amount: new Prisma.Decimal("100"),
        currency: "USD",
        exchangeRate: new Prisma.Decimal("1"),
        baseAmountUsd: new Prisma.Decimal("100"),
        exchangeRateAt: new Date(),
        exchangeRateSource: "FIXED_USD",
        transactionDate: new Date(),
        description: "Seed",
      },
    })

    const ymd = new Date().toISOString().slice(0, 10)
    const sub = await prisma.subscription.create({
      data: {
        userId,
        name: `Sub ${suffix}`,
        provider: "Test",
        price: new Prisma.Decimal("10"),
        currency: "USD",
        billingFrequency: "MONTHLY",
        startDate: new Date(ymd),
        nextRenewalDate: new Date(ymd),
        accountId,
        status: "ACTIVE",
        autoRenew: true,
      },
    })
    subscriptionId = sub.id
  })

  afterAll(async () => {
    if (!userId || !prisma) return
    await prisma.auditLog.deleteMany({ where: { userId } })
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.subscription.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.financialAccount.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  it("blocks a second confirm for the same renewalPeriod via DB unique", async () => {
    const first = await confirmRenewalPayment({
      userId,
      subscriptionId,
      id: subscriptionId,
      accountId,
      exchangeRate: "",
      allowOverdraft: true,
      paymentDate: "",
    })
    expect(first.transactionId).toBeTruthy()

    const expense = await prisma.transaction.findUniqueOrThrow({
      where: { id: first.transactionId },
    })
    expect(expense.renewalPeriod).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Rewind nextRenewalDate so the same period key is attempted again.
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        nextRenewalDate: expense.renewalPeriod
          ? new Date(expense.renewalPeriod)
          : new Date(),
      },
    })

    await expect(
      confirmRenewalPayment({
        userId,
        subscriptionId,
        id: subscriptionId,
        accountId,
        exchangeRate: "",
        allowOverdraft: true,
        paymentDate: "",
      })
    ).rejects.toBeInstanceOf(SubscriptionServiceError)

    const count = await prisma.transaction.count({
      where: {
        subscriptionId,
        renewalPeriod: expense.renewalPeriod,
      },
    })
    expect(count).toBe(1)
  })
})

describe.runIf(
  Boolean(process.env.TEST_DATABASE_URL?.trim()) && !dbStatus.ok
)("subscription renewal database guard", () => {
  it("fails closed when TEST_DATABASE_URL is set but unsafe", () => {
    expect(dbStatus.ok, dbStatus.ok ? "" : dbStatus.message).toBe(true)
  })
})
