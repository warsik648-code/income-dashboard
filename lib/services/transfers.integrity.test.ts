import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { CreateTransferInput } from "@/lib/validations/transfers"
import type { UpdatePendingTransferInput } from "@/lib/validations/transfers"
import {
  installVerifiedTestDatabaseUrl,
  resolveIntegrationTestDatabase,
} from "@/lib/test/integration-database"

const dbStatus = resolveIntegrationTestDatabase()

if (dbStatus.ok) {
  installVerifiedTestDatabaseUrl()
}

describe("transfer integrity database selection", () => {
  it("does not fall back to DATABASE_URL when TEST_DATABASE_URL is missing", () => {
    if (dbStatus.ok) {
      expect(dbStatus.url).toBe(process.env.TEST_DATABASE_URL?.trim())
      expect(dbStatus.url).not.toBeUndefined()
      return
    }
    expect(dbStatus.reason).toBe("missing")
  })

  it.runIf(
    Boolean(process.env.TEST_DATABASE_URL?.trim()) && !dbStatus.ok
  )("fails closed when TEST_DATABASE_URL is set but unsafe", () => {
    expect(dbStatus.ok, dbStatus.ok ? "" : dbStatus.message).toBe(true)
  })
})

describe.skipIf(!dbStatus.ok)("transfer integrity (DB)", () => {
  const suffix = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  let userId = ""
  let usdFromId = ""
  let usdToId = ""
  let tryFromId = ""
  let tryToId = ""
  let pkrFromId = ""
  let pkrToId = ""
  let prisma: typeof import("@/lib/db").prisma
  let createTransfer: typeof import("@/lib/services/transfers").createTransfer
  let updatePendingTransfer: typeof import("@/lib/services/transfers").updatePendingTransfer
  let reverseTransfer: typeof import("@/lib/services/transfers").reverseTransfer
  let TransferServiceError: typeof import("@/lib/services/transfers").TransferServiceError
  let Prisma: typeof import("@/generated/prisma/client").Prisma
  let recomputeCachedBalance: typeof import("@/lib/services/balances").recomputeCachedBalance
  let testDatabaseUrl = ""

  async function seedIncome(
    accountId: string,
    currency: string,
    amount: string,
    rate = "1"
  ) {
    const base =
      currency === "USD"
        ? amount
        : new Prisma.Decimal(amount).div(rate).toDecimalPlaces(4).toString()
    await prisma.transaction.create({
      data: {
        userId,
        accountId,
        type: "INCOME",
        amount: new Prisma.Decimal(amount),
        currency,
        exchangeRate: new Prisma.Decimal(rate),
        baseAmountUsd: new Prisma.Decimal(base),
        exchangeRateAt: new Date(),
        exchangeRateSource: currency === "USD" ? "FIXED_USD" : "MANUAL",
        transactionDate: new Date(),
        description: "Seed balance",
      },
    })
    await prisma.$transaction(async (tx) => {
      await recomputeCachedBalance(tx, accountId, currency)
    })
  }

  async function balances(ids: string[]) {
    const rows = await prisma.financialAccount.findMany({
      where: { id: { in: ids } },
    })
    return Object.fromEntries(
      rows.map((row) => [row.id, row.cachedBalance.toString()])
    )
  }

  async function ledgerBalance(accountId: string, currency: string) {
    return prisma.$transaction(async (tx) => {
      const updated = await recomputeCachedBalance(tx, accountId, currency)
      return updated.cachedBalance.toString()
    })
  }

  async function expectMatchesLedger(
    accountId: string,
    currency: string,
    cached: string | undefined
  ) {
    expect(cached).toBeDefined()
    expect(cached).toBe(await ledgerBalance(accountId, currency))
  }

  beforeAll(async () => {
    testDatabaseUrl = installVerifiedTestDatabaseUrl()
    ;({ prisma } = await import("@/lib/db"))
    ;({ recomputeCachedBalance } = await import("@/lib/services/balances"))
    ;({
      createTransfer,
      updatePendingTransfer,
      reverseTransfer,
      TransferServiceError,
    } = await import("@/lib/services/transfers"))
    ;({ Prisma } = await import("@/generated/prisma/client"))

    const user = await prisma.user.create({
      data: {
        email: `${suffix}@transfer-integrity.test`,
        name: "Transfer Integrity",
        passwordHash: "test-hash-not-used",
      },
    })
    userId = user.id

    const mk = async (name: string, currency: string) => {
      const account = await prisma.financialAccount.create({
        data: {
          userId,
          name: `${name} ${suffix}`,
          type: "OTHER",
          currency,
          assetClass: "FIAT",
          cachedBalance: new Prisma.Decimal("0"),
        },
      })
      return account.id
    }

    usdFromId = await mk("USD From", "USD")
    usdToId = await mk("USD To", "USD")
    tryFromId = await mk("TRY From", "TRY")
    tryToId = await mk("TRY To", "TRY")
    pkrFromId = await mk("PKR From", "PKR")
    pkrToId = await mk("PKR To", "PKR")

    await seedIncome(usdFromId, "USD", "1000")
    await seedIncome(usdToId, "USD", "0")
    await seedIncome(tryFromId, "TRY", "10000", "40")
    await seedIncome(tryToId, "TRY", "0", "40")
    await seedIncome(pkrFromId, "PKR", "50000", "280")
    await seedIncome(pkrToId, "PKR", "0", "280")
  }, 60_000)

  afterAll(async () => {
    if (!userId || !prisma) return
    await prisma.auditLog.deleteMany({ where: { userId } })
    await prisma.transaction.deleteMany({ where: { userId } })
    await prisma.transfer.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.financialAccount.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  function baseInput(
    from: string,
    to: string,
    overrides: Partial<CreateTransferInput> & { id?: string } = {}
  ): CreateTransferInput {
    return {
      fromAccountId: from,
      toAccountId: to,
      sourceAmount: "100",
      destinationAmount: "100",
      sourceUsdRate: "1",
      destinationUsdRate: "1",
      feeAmount: "",
      feeCurrency: "",
      feePaidSeparately: false,
      status: "COMPLETED",
      transferredAt: new Date().toISOString(),
      reference: "",
      notes: "",
      idempotencyKey: "",
      allowOverdraft: false,
      ...overrides,
    }
  }

  function pendingInput(
    id: string,
    from: string,
    to: string,
    overrides: Partial<CreateTransferInput> = {}
  ): UpdatePendingTransferInput {
    return { id, ...baseInput(from, to, overrides) }
  }

  it("uses only the verified TEST_DATABASE_URL", () => {
    expect(testDatabaseUrl).toBe(process.env.TEST_DATABASE_URL?.trim())
    expect(process.env.DATABASE_URL).toBe(testDatabaseUrl)
  })

  it("PENDING → COMPLETED without fee updates both balances", async () => {
    const before = await balances([usdFromId, usdToId])
    const { transfer } = await createTransfer(
      userId,
      baseInput(usdFromId, usdToId, {
        status: "PENDING",
        sourceAmount: "25",
        destinationAmount: "25",
        idempotencyKey: `pending-nofee-${suffix}`,
      })
    )
    expect(transfer.status).toBe("PENDING")
    expect(await balances([usdFromId, usdToId])).toEqual(before)

    await updatePendingTransfer(
      userId,
      pendingInput(transfer.id, usdFromId, usdToId, {
        status: "COMPLETED",
        sourceAmount: "25",
        destinationAmount: "25",
      })
    )

    const after = await balances([usdFromId, usdToId])
    expect(after[usdFromId]).toBe(
      new Prisma.Decimal(before[usdFromId]!).minus(25).toString()
    )
    expect(after[usdToId]).toBe(
      new Prisma.Decimal(before[usdToId]!).plus(25).toString()
    )
    await expectMatchesLedger(usdFromId, "USD", after[usdFromId])
    await expectMatchesLedger(usdToId, "USD", after[usdToId])
  })

  it("PENDING → COMPLETED with separate fee applies fee once", async () => {
    const before = await balances([usdFromId, usdToId])
    const { transfer } = await createTransfer(
      userId,
      baseInput(usdFromId, usdToId, {
        status: "PENDING",
        sourceAmount: "40",
        destinationAmount: "40",
        feeAmount: "2",
        feeCurrency: "TRY",
        feePaidSeparately: true,
        idempotencyKey: `pending-fee-${suffix}`,
      })
    )

    const completed = await updatePendingTransfer(
      userId,
      pendingInput(transfer.id, usdFromId, usdToId, {
        status: "COMPLETED",
        sourceAmount: "40",
        destinationAmount: "40",
        feeAmount: "2",
        feeCurrency: "PKR",
        feePaidSeparately: true,
      })
    )
    expect(completed.feeCurrency).toBe("USD")
    expect(completed.feePaidSeparately).toBe(true)

    const fees = await prisma.transaction.findMany({
      where: {
        transferId: completed.id,
        type: "EXPENSE",
        deletedAt: null,
      },
    })
    expect(fees).toHaveLength(1)
    expect(fees[0]?.currency).toBe("USD")
    expect(fees[0]?.amount.toString()).toBe("2")

    const after = await balances([usdFromId, usdToId])
    expect(after[usdFromId]).toBe(
      new Prisma.Decimal(before[usdFromId]!).minus(42).toString()
    )
    expect(after[usdToId]).toBe(
      new Prisma.Decimal(before[usdToId]!).plus(40).toString()
    )
    await expectMatchesLedger(usdFromId, "USD", after[usdFromId])
    await expectMatchesLedger(usdToId, "USD", after[usdToId])
  })

  it("PENDING → COMPLETED with fee reflected only in destination amount", async () => {
    const before = await balances([usdFromId, usdToId])
    const { transfer } = await createTransfer(
      userId,
      baseInput(usdFromId, usdToId, {
        status: "PENDING",
        sourceAmount: "50",
        destinationAmount: "48",
        feeAmount: "2",
        feePaidSeparately: false,
        idempotencyKey: `pending-embedded-${suffix}`,
      })
    )

    const completed = await updatePendingTransfer(
      userId,
      pendingInput(transfer.id, usdFromId, usdToId, {
        status: "COMPLETED",
        sourceAmount: "50",
        destinationAmount: "48",
        feeAmount: "2",
        feePaidSeparately: false,
      })
    )
    expect(completed.feePaidSeparately).toBe(false)

    const fees = await prisma.transaction.count({
      where: {
        transferId: completed.id,
        type: "EXPENSE",
        deletedAt: null,
      },
    })
    expect(fees).toBe(0)

    const after = await balances([usdFromId, usdToId])
    expect(after[usdFromId]).toBe(
      new Prisma.Decimal(before[usdFromId]!).minus(50).toString()
    )
    expect(after[usdToId]).toBe(
      new Prisma.Decimal(before[usdToId]!).plus(48).toString()
    )
    await expectMatchesLedger(usdFromId, "USD", after[usdFromId])
    await expectMatchesLedger(usdToId, "USD", after[usdToId])
  })

  it("duplicate completion attempt does not apply balances twice", async () => {
    const { transfer } = await createTransfer(
      userId,
      baseInput(usdFromId, usdToId, {
        status: "PENDING",
        sourceAmount: "10",
        destinationAmount: "10",
        idempotencyKey: `dup-complete-${suffix}`,
      })
    )
    await updatePendingTransfer(
      userId,
      pendingInput(transfer.id, usdFromId, usdToId, {
        status: "COMPLETED",
        sourceAmount: "10",
        destinationAmount: "10",
      })
    )
    const mid = await balances([usdFromId, usdToId])

    await expect(
      updatePendingTransfer(
        userId,
        pendingInput(transfer.id, usdFromId, usdToId, {
          status: "COMPLETED",
          sourceAmount: "10",
          destinationAmount: "10",
        })
      )
    ).rejects.toBeInstanceOf(TransferServiceError)

    expect(await balances([usdFromId, usdToId])).toEqual(mid)
  })

  it("database failure rolls back completion status and balances", async () => {
    const before = await balances([usdFromId, usdToId])
    const { transfer } = await createTransfer(
      userId,
      baseInput(usdFromId, usdToId, {
        status: "PENDING",
        sourceAmount: "15",
        destinationAmount: "15",
        idempotencyKey: `rollback-${suffix}`,
      })
    )

    await expect(
      updatePendingTransfer(
        userId,
        pendingInput(transfer.id, usdFromId, usdToId, {
          status: "COMPLETED",
          sourceAmount: "15",
          destinationAmount: "0",
        })
      )
    ).rejects.toBeTruthy()

    const still = await prisma.transfer.findFirstOrThrow({
      where: { id: transfer.id },
    })
    expect(still.status).toBe("PENDING")
    expect(await balances([usdFromId, usdToId])).toEqual(before)
  })

  it("completed transfer reversal restores both balances", async () => {
    const before = await balances([usdFromId, usdToId])
    const { transfer } = await createTransfer(
      userId,
      baseInput(usdFromId, usdToId, {
        status: "COMPLETED",
        sourceAmount: "12",
        destinationAmount: "12",
        feeAmount: "1",
        feePaidSeparately: true,
        idempotencyKey: `reverse-${suffix}`,
      })
    )
    const mid = await balances([usdFromId, usdToId])
    expect(mid[usdFromId]).not.toBe(before[usdFromId])
    await expectMatchesLedger(usdFromId, "USD", mid[usdFromId])
    await expectMatchesLedger(usdToId, "USD", mid[usdToId])

    await reverseTransfer(userId, transfer.id)
    const after = await balances([usdFromId, usdToId])
    expect(after[usdFromId]).toBe(before[usdFromId])
    expect(after[usdToId]).toBe(before[usdToId])
    await expectMatchesLedger(usdFromId, "USD", after[usdFromId])
    await expectMatchesLedger(usdToId, "USD", after[usdToId])
  })

  it("TRY/PKR separate fees store source currency and match ledger", async () => {
    const tryBefore = await balances([tryFromId, tryToId])
    const { transfer: tryTransfer } = await createTransfer(
      userId,
      baseInput(tryFromId, tryToId, {
        sourceAmount: "100",
        destinationAmount: "100",
        sourceUsdRate: "40",
        destinationUsdRate: "40",
        feeAmount: "5",
        feeCurrency: "USD",
        feePaidSeparately: true,
        feeUsdRate: "40",
        idempotencyKey: `try-fee-${suffix}`,
      })
    )
    expect(tryTransfer.feeCurrency).toBe("TRY")
    const tryFees = await prisma.transaction.findMany({
      where: { transferId: tryTransfer.id, deletedAt: null, type: "EXPENSE" },
    })
    expect(tryFees).toHaveLength(1)
    expect(tryFees[0]?.currency).toBe("TRY")
    const tryAfter = await balances([tryFromId, tryToId])
    expect(tryAfter[tryFromId]).toBe(
      new Prisma.Decimal(tryBefore[tryFromId]!).minus(105).toString()
    )
    expect(tryAfter[tryToId]).toBe(
      new Prisma.Decimal(tryBefore[tryToId]!).plus(100).toString()
    )
    await expectMatchesLedger(tryFromId, "TRY", tryAfter[tryFromId])
    await expectMatchesLedger(tryToId, "TRY", tryAfter[tryToId])

    const pkrBefore = await balances([pkrFromId, pkrToId])
    const { transfer: pkrTransfer } = await createTransfer(
      userId,
      baseInput(pkrFromId, pkrToId, {
        sourceAmount: "200",
        destinationAmount: "200",
        sourceUsdRate: "280",
        destinationUsdRate: "280",
        feeAmount: "10",
        feeCurrency: "TRY",
        feePaidSeparately: true,
        feeUsdRate: "280",
        idempotencyKey: `pkr-fee-${suffix}`,
      })
    )
    expect(pkrTransfer.feeCurrency).toBe("PKR")
    const pkrAfter = await balances([pkrFromId, pkrToId])
    expect(pkrAfter[pkrFromId]).toBe(
      new Prisma.Decimal(pkrBefore[pkrFromId]!).minus(210).toString()
    )
    expect(pkrAfter[pkrToId]).toBe(
      new Prisma.Decimal(pkrBefore[pkrToId]!).plus(200).toString()
    )
    await expectMatchesLedger(pkrFromId, "PKR", pkrAfter[pkrFromId])
    await expectMatchesLedger(pkrToId, "PKR", pkrAfter[pkrToId])
  })

  it("idempotency: same key creates one transfer; new key creates another", async () => {
    const key = `idem-${suffix}`
    const first = await createTransfer(
      userId,
      baseInput(usdFromId, usdToId, {
        sourceAmount: "3",
        destinationAmount: "3",
        idempotencyKey: key,
      })
    )
    expect(first.reused).toBe(false)

    const retry = await createTransfer(
      userId,
      baseInput(usdFromId, usdToId, {
        sourceAmount: "3",
        destinationAmount: "3",
        idempotencyKey: key,
      })
    )
    expect(retry.reused).toBe(true)
    expect(retry.transfer.id).toBe(first.transfer.id)

    const second = await createTransfer(
      userId,
      baseInput(usdFromId, usdToId, {
        sourceAmount: "3",
        destinationAmount: "3",
        idempotencyKey: `${key}-next`,
      })
    )
    expect(second.reused).toBe(false)
    expect(second.transfer.id).not.toBe(first.transfer.id)

    const count = await prisma.transfer.count({
      where: {
        userId,
        idempotencyKey: { in: [key, `${key}-next`] },
      },
    })
    expect(count).toBe(2)
  })
})
