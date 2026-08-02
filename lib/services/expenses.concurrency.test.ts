import { afterAll, beforeAll, describe, expect, it } from "vitest"

const hasDb = Boolean(process.env.DATABASE_URL?.trim())

describe.skipIf(!hasDb)("expense concurrency / balance lock", () => {
  const suffix = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  let userId = ""
  let accountId = ""
  let categoryId = ""
  let prisma: typeof import("@/lib/db").prisma
  let createExpense: typeof import("@/lib/services/expenses").createExpense
  let ExpenseServiceError: typeof import("@/lib/services/expenses").ExpenseServiceError
  let Prisma: typeof import("@/generated/prisma/client").Prisma

  beforeAll(async () => {
    ;({ prisma } = await import("@/lib/db"))
    ;({ createExpense, ExpenseServiceError } = await import(
      "@/lib/services/expenses"
    ))
    ;({ Prisma } = await import("@/generated/prisma/client"))
    const { ensureExpenseCategories } = await import(
      "@/lib/services/categories"
    )

    const user = await prisma.user.create({
      data: {
        email: `${suffix}@concurrency.test`,
        name: "Concurrency Test",
        passwordHash: "test-hash-not-used",
      },
    })
    userId = user.id

    const categories = await ensureExpenseCategories(userId)
    const category = categories[0]
    if (!category) throw new Error("Missing expense category")
    categoryId = category.id

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
        description: "Seed balance",
      },
    })
  })

  afterAll(async () => {
    if (!userId || !prisma) return
    await prisma.auditLog.deleteMany({ where: { userId } })
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.financialAccount.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  it("prevents concurrent expenses from overdrawing the account", async () => {
    const today = new Date().toISOString().slice(0, 10)
    const payload = {
      accountId,
      categoryId,
      amount: "80",
      transactionDate: today,
      description: "Concurrent spend",
      counterparty: "Test",
      paymentMethod: "CASH" as const,
      notes: "",
      allowOverdraft: false,
    }

    const results = await Promise.allSettled([
      createExpense(userId, payload),
      createExpense(userId, { ...payload, description: "Concurrent spend B" }),
    ])

    const fulfilled = results.filter((r) => r.status === "fulfilled")
    const rejected = results.filter((r) => r.status === "rejected")

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const rejection = rejected[0]
    expect(rejection?.status).toBe("rejected")
    if (rejection?.status === "rejected") {
      const message = String(rejection.reason?.message ?? rejection.reason)
      // Prefer domain insufficient-balance; lock-wait/timeout under FOR UPDATE
      // also safely prevents a double spend on a remote/slow DB.
      const ok =
        rejection.reason instanceof ExpenseServiceError ||
        /insufficient balance|expired transaction|timeout|could not serialize/i.test(
          message
        )
      expect(ok).toBe(true)
    }

    const account = await prisma.financialAccount.findFirstOrThrow({
      where: { id: accountId },
    })
    expect(account.cachedBalance.toString()).toBe("20")

    const expenses = await prisma.transaction.count({
      where: {
        userId,
        accountId,
        type: "EXPENSE",
        deletedAt: null,
      },
    })
    expect(expenses).toBe(1)
  })
})
