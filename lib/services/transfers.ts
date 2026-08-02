import {
  Prisma,
  type Transfer,
  type TransferStatus,
} from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import {
  assertSupportedCurrency,
  buildFxSnapshot,
  convertToBaseUsd,
  isUsd,
  type MoneyDecimalString,
} from "@/lib/money"
import {
  computeEffectiveExchangeRate,
  suggestDestinationAmount,
} from "@/lib/money/transfer-fx"
import { writeAuditLog } from "@/lib/services/audit"
import {
  BalanceServiceError,
  lockAndRefreshAccounts,
  recomputeCachedBalance,
} from "@/lib/services/balances"
import { TRANSFER_FEES_CATEGORY } from "@/lib/services/transfer-constants"
import { resolveTransferFeeCurrency } from "@/lib/transfers/fee-currency"
import { pendingTransferCompletionPlan } from "@/lib/transfers/pending-completion"
import type {
  CreateTransferInput,
  TransferFilters,
  UpdatePendingTransferInput,
  UpdateTransferMetaInput,
} from "@/lib/validations/transfers"

export { TRANSFER_FEES_CATEGORY } from "@/lib/services/transfer-constants"

export class TransferServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TransferServiceError"
  }
}

export type TransferListItem = Transfer & {
  fromAccount: { id: string; name: string; currency: string }
  toAccount: { id: string; name: string; currency: string }
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function mapBalanceError(error: unknown): never {
  if (error instanceof BalanceServiceError) {
    throw new TransferServiceError(error.message)
  }
  throw error
}

function requirePositiveDecimal(value: string, label: string): Prisma.Decimal {
  try {
    const d = new Prisma.Decimal(value)
    if (!d.isFinite() || d.lte(0)) {
      throw new TransferServiceError(`${label} must be greater than zero.`)
    }
    return d
  } catch (error) {
    if (error instanceof TransferServiceError) throw error
    throw new TransferServiceError(`${label} must be a valid amount.`)
  }
}

async function getTransferFeesCategoryId(
  tx: Prisma.TransactionClient,
  userId: string
) {
  const existing = await tx.category.findUnique({
    where: {
      userId_kind_name: {
        userId,
        kind: "EXPENSE",
        name: TRANSFER_FEES_CATEGORY,
      },
    },
  })
  if (existing && !existing.deletedAt) return existing.id
  if (existing) {
    const restored = await tx.category.update({
      where: { id: existing.id },
      data: { deletedAt: null, isSystem: true },
    })
    return restored.id
  }
  const created = await tx.category.create({
    data: {
      userId,
      kind: "EXPENSE",
      name: TRANSFER_FEES_CATEGORY,
      isSystem: true,
    },
  })
  return created.id
}

type SnapshotParts = {
  sourceAmount: Prisma.Decimal
  destinationAmount: Prisma.Decimal
  sourceCurrency: string
  destinationCurrency: string
  suggestedExchangeRate: Prisma.Decimal | null
  effectiveExchangeRate: Prisma.Decimal
  suggestedDestinationAmount: Prisma.Decimal | null
  sourceBaseAmountUsd: Prisma.Decimal
  destinationBaseAmountUsd: Prisma.Decimal
  feeAmount: Prisma.Decimal
  feeCurrency: string | null
  feeBaseAmountUsd: Prisma.Decimal | null
  feePaidSeparately: boolean
}

function buildSnapshots(
  input: CreateTransferInput,
  fromCurrency: string,
  toCurrency: string
): SnapshotParts {
  const sourceCurrency = assertSupportedCurrency(fromCurrency)
  const destinationCurrency = assertSupportedCurrency(toCurrency)
  const sourceAmount = requirePositiveDecimal(input.sourceAmount, "Source amount")
  const destinationAmount = requirePositiveDecimal(
    input.destinationAmount,
    "Destination amount"
  )

  const pkrRate =
    sourceCurrency === "PKR"
      ? input.sourceUsdRate?.trim()
      : destinationCurrency === "PKR"
        ? input.destinationUsdRate?.trim()
        : input.sourceUsdRate?.trim() || input.destinationUsdRate?.trim()
  const tryRate =
    sourceCurrency === "TRY"
      ? input.sourceUsdRate?.trim()
      : destinationCurrency === "TRY"
        ? input.destinationUsdRate?.trim()
        : input.destinationUsdRate?.trim() || input.sourceUsdRate?.trim()

  const ratePair = {
    PKR: pkrRate && Number(pkrRate) > 0 ? pkrRate : "1",
    TRY: tryRate && Number(tryRate) > 0 ? tryRate : "1",
  }

  const sourceUsdRate = isUsd(sourceCurrency)
    ? "1"
    : sourceCurrency === "PKR"
      ? ratePair.PKR
      : ratePair.TRY
  const destinationUsdRate = isUsd(destinationCurrency)
    ? "1"
    : destinationCurrency === "PKR"
      ? ratePair.PKR
      : ratePair.TRY

  if (!isUsd(sourceCurrency) && !(Number(sourceUsdRate) > 0)) {
    throw new TransferServiceError(
      "A valid USD rate is required for the source currency."
    )
  }
  if (!isUsd(destinationCurrency) && !(Number(destinationUsdRate) > 0)) {
    throw new TransferServiceError(
      "A valid USD rate is required for the destination currency."
    )
  }

  const suggested = input.suggestedDestinationAmount?.trim()
    ? new Prisma.Decimal(input.suggestedDestinationAmount)
    : (() => {
        const s = suggestDestinationAmount({
          sourceAmount: sourceAmount.toString(),
          sourceCurrency,
          destinationCurrency,
          rates: ratePair,
        })
        return s ? new Prisma.Decimal(s) : null
      })()

  const effective =
    input.effectiveExchangeRate?.trim() ||
    computeEffectiveExchangeRate({
      sourceAmount: sourceAmount.toString(),
      sourceCurrency,
      destinationAmount: destinationAmount.toString(),
      destinationCurrency,
    })

  if (!effective || Number(effective) <= 0) {
    throw new TransferServiceError("Could not determine a valid effective rate.")
  }

  const feeRaw = input.feeAmount?.trim() || "0"
  const feeAmount = new Prisma.Decimal(feeRaw || "0")
  if (feeAmount.lt(0)) {
    throw new TransferServiceError("Fee cannot be negative.")
  }

  const feePaidSeparately = Boolean(input.feePaidSeparately) && feeAmount.gt(0)
  // Always derive from source account — never trust client feeCurrency.
  const feeCurrency = resolveTransferFeeCurrency({
    sourceCurrency,
    feeAmount: feeAmount.toString(),
  })

  let feeBaseAmountUsd: Prisma.Decimal | null = null
  if (feeAmount.gt(0) && feeCurrency) {
    const feeRate = isUsd(feeCurrency)
      ? "1"
      : input.feeUsdRate?.trim() || sourceUsdRate
    feeBaseAmountUsd = convertToBaseUsd(
      feeAmount,
      feeCurrency,
      feeRate as MoneyDecimalString
    )
  }

  return {
    sourceAmount,
    destinationAmount,
    sourceCurrency,
    destinationCurrency,
    suggestedExchangeRate: input.suggestedExchangeRate?.trim()
      ? new Prisma.Decimal(input.suggestedExchangeRate)
      : sourceCurrency === destinationCurrency
        ? new Prisma.Decimal(1)
        : null,
    effectiveExchangeRate: new Prisma.Decimal(effective),
    suggestedDestinationAmount: suggested,
    sourceBaseAmountUsd: convertToBaseUsd(
      sourceAmount,
      sourceCurrency,
      sourceUsdRate as MoneyDecimalString
    ),
    destinationBaseAmountUsd: convertToBaseUsd(
      destinationAmount,
      destinationCurrency,
      destinationUsdRate as MoneyDecimalString
    ),
    feeAmount,
    feeCurrency,
    feeBaseAmountUsd,
    feePaidSeparately,
  }
}

export type CreateTransferResult = {
  transfer: Transfer
  /** True when an existing transfer was returned for the same idempotency key. */
  reused: boolean
}

async function upsertFeeExpense(
  tx: Prisma.TransactionClient,
  userId: string,
  transferId: string,
  fromAccountId: string,
  parts: SnapshotParts,
  transferredAt: Date
) {
  const existing = await tx.transaction.findFirst({
    where: { transferId, deletedAt: null, type: "EXPENSE" },
  })

  if (!parts.feePaidSeparately || !parts.feeCurrency || parts.feeAmount.lte(0)) {
    if (existing) {
      await tx.transaction.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      })
    }
    return
  }

  const categoryId = await getTransferFeesCategoryId(tx, userId)
  const feeRate = isUsd(parts.feeCurrency)
    ? "1"
    : parts.feeBaseAmountUsd && parts.feeAmount.gt(0)
      ? parts.feeAmount.div(parts.feeBaseAmountUsd).toString()
      : undefined

  const fx = buildFxSnapshot({
    amount: parts.feeAmount.toString() as MoneyDecimalString,
    currency: parts.feeCurrency,
    exchangeRate: feeRate as MoneyDecimalString | undefined,
    exchangeRateSource: isUsd(parts.feeCurrency) ? "FIXED_USD" : "USER_OVERRIDE",
    exchangeRateAt: transferredAt,
  })

  if (existing) {
    await tx.transaction.update({
      where: { id: existing.id },
      data: {
        accountId: fromAccountId,
        categoryId,
        amount: fx.amount,
        currency: fx.currency,
        exchangeRate: fx.exchangeRate,
        baseAmountUsd: fx.baseAmountUsd,
        exchangeRateAt: fx.exchangeRateAt,
        exchangeRateSource: fx.exchangeRateSource,
        transactionDate: transferredAt,
        description: "Transfer fee",
        notes: `Fee for transfer ${transferId}`,
        deletedAt: null,
      },
    })
    return
  }

  await tx.transaction.create({
    data: {
      userId,
      accountId: fromAccountId,
      categoryId,
      type: "EXPENSE",
      amount: fx.amount,
      currency: fx.currency,
      exchangeRate: fx.exchangeRate,
      baseAmountUsd: fx.baseAmountUsd,
      exchangeRateAt: fx.exchangeRateAt,
      exchangeRateSource: fx.exchangeRateSource,
      transactionDate: transferredAt,
      description: "Transfer fee",
      notes: `Fee for transfer ${transferId}`,
      transferId,
      paymentMethod: "OTHER",
    },
  })
}

async function softDeleteFeeExpenses(
  tx: Prisma.TransactionClient,
  transferId: string
) {
  await tx.transaction.updateMany({
    where: { transferId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
}

export async function listTransfers(
  userId: string,
  filters: TransferFilters = {}
): Promise<TransferListItem[]> {
  return prisma.transfer.findMany({
    where: {
      userId,
      deletedAt: filters.deleted === "1" ? { not: null } : null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.fromAccountId ? { fromAccountId: filters.fromAccountId } : {}),
      ...(filters.toAccountId ? { toAccountId: filters.toAccountId } : {}),
    },
    include: {
      fromAccount: { select: { id: true, name: true, currency: true } },
      toAccount: { select: { id: true, name: true, currency: true } },
    },
    orderBy: [{ transferredAt: "desc" }, { createdAt: "desc" }],
  })
}

export async function createTransfer(
  userId: string,
  input: CreateTransferInput
): Promise<CreateTransferResult> {
  const transferredAt = new Date(input.transferredAt)
  const status = input.status as TransferStatus
  const idempotencyKey = emptyToNull(input.idempotencyKey)

  return prisma.$transaction(
    async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.transfer.findUnique({
          where: {
            userId_idempotencyKey: { userId, idempotencyKey },
          },
        })
        if (existing && !existing.deletedAt) {
          return { transfer: existing, reused: true }
        }
      }

      let locked
      try {
        locked = await lockAndRefreshAccounts(tx, userId, [
          input.fromAccountId,
          input.toAccountId,
        ])
      } catch (error) {
        mapBalanceError(error)
      }

      const from = locked.get(input.fromAccountId)
      const to = locked.get(input.toAccountId)
      if (!from || !to) {
        throw new TransferServiceError("Select active source and destination accounts.")
      }
      if (from.id === to.id) {
        throw new TransferServiceError(
          "Source and destination accounts must be different."
        )
      }

      const parts = buildSnapshots(input, from.currency, to.currency)

      if (status === "COMPLETED") {
        const required = parts.feePaidSeparately
          ? parts.sourceAmount.plus(parts.feeAmount)
          : parts.sourceAmount
        if (required.gt(from.cachedBalance) && !input.allowOverdraft) {
          throw new TransferServiceError(
            `Insufficient balance on ${from.name}. Available ${from.cachedBalance.toString()} ${from.currency}.`
          )
        }
      }

      let created: Transfer
      try {
        created = await tx.transfer.create({
          data: {
            userId,
            fromAccountId: from.id,
            toAccountId: to.id,
            sourceAmount: parts.sourceAmount,
            sourceCurrency: parts.sourceCurrency,
            destinationAmount: parts.destinationAmount,
            destinationCurrency: parts.destinationCurrency,
            suggestedExchangeRate: parts.suggestedExchangeRate,
            effectiveExchangeRate: parts.effectiveExchangeRate,
            suggestedDestinationAmount: parts.suggestedDestinationAmount,
            sourceBaseAmountUsd: parts.sourceBaseAmountUsd,
            destinationBaseAmountUsd: parts.destinationBaseAmountUsd,
            feeAmount: parts.feeAmount,
            feeCurrency: parts.feeCurrency,
            feeBaseAmountUsd: parts.feeBaseAmountUsd,
            feePaidSeparately: parts.feePaidSeparately,
            status,
            transferredAt,
            reference: emptyToNull(input.reference),
            notes: emptyToNull(input.notes),
            idempotencyKey,
            completedAt: status === "COMPLETED" ? new Date() : null,
          },
        })
      } catch (error) {
        if (
          idempotencyKey &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const existing = await tx.transfer.findUnique({
            where: {
              userId_idempotencyKey: { userId, idempotencyKey },
            },
          })
          if (existing && !existing.deletedAt) {
            return { transfer: existing, reused: true }
          }
        }
        throw error
      }

      if (status === "COMPLETED" && parts.feePaidSeparately) {
        await upsertFeeExpense(
          tx,
          userId,
          created.id,
          from.id,
          parts,
          transferredAt
        )
      }

      if (status === "COMPLETED") {
        await recomputeCachedBalance(tx, from.id, from.currency)
        await recomputeCachedBalance(tx, to.id, to.currency)
      }

      await writeAuditLog(tx, {
        userId,
        entityType: "Transfer",
        entityId: created.id,
        action: "CREATE",
        before: null,
        after: created,
        reason: `Transfer ${status.toLowerCase()}`,
      })

      return { transfer: created, reused: false }
    },
    { timeout: 20_000 }
  )
}

export async function updatePendingTransfer(
  userId: string,
  input: UpdatePendingTransferInput
): Promise<Transfer> {
  return prisma.$transaction(
    async (tx) => {
    const existing = await tx.transfer.findFirst({
      where: { id: input.id, userId, deletedAt: null },
    })
    if (!existing) throw new TransferServiceError("Transfer not found.")
    if (existing.status !== "PENDING") {
      throw new TransferServiceError(
        "Only pending transfers can be fully edited. Use reverse for completed transfers."
      )
    }

    let locked
    try {
      locked = await lockAndRefreshAccounts(tx, userId, [
        input.fromAccountId,
        input.toAccountId,
      ])
    } catch (error) {
      mapBalanceError(error)
    }
    const from = locked.get(input.fromAccountId)
    const to = locked.get(input.toAccountId)
    if (!from || !to) {
      throw new TransferServiceError("Select active source and destination accounts.")
    }

    const parts = buildSnapshots(input, from.currency, to.currency)
    const status = input.status as TransferStatus
    const transferredAt = new Date(input.transferredAt)

    if (status === "COMPLETED") {
      const required = parts.feePaidSeparately
        ? parts.sourceAmount.plus(parts.feeAmount)
        : parts.sourceAmount
      if (required.gt(from.cachedBalance) && !input.allowOverdraft) {
        throw new TransferServiceError(
          `Insufficient balance on ${from.name}. Available ${from.cachedBalance.toString()} ${from.currency}.`
        )
      }
    }

    const plan = pendingTransferCompletionPlan({
      status,
      feePaidSeparately: parts.feePaidSeparately,
    })

    // Conditional update prevents a concurrent second completion from applying twice.
    const touched = await tx.transfer.updateMany({
      where: { id: existing.id, userId, status: "PENDING", deletedAt: null },
      data: {
        fromAccountId: from.id,
        toAccountId: to.id,
        sourceAmount: parts.sourceAmount,
        sourceCurrency: parts.sourceCurrency,
        destinationAmount: parts.destinationAmount,
        destinationCurrency: parts.destinationCurrency,
        suggestedExchangeRate: parts.suggestedExchangeRate,
        effectiveExchangeRate: parts.effectiveExchangeRate,
        suggestedDestinationAmount: parts.suggestedDestinationAmount,
        sourceBaseAmountUsd: parts.sourceBaseAmountUsd,
        destinationBaseAmountUsd: parts.destinationBaseAmountUsd,
        feeAmount: parts.feeAmount,
        feeCurrency: parts.feeCurrency,
        feeBaseAmountUsd: parts.feeBaseAmountUsd,
        feePaidSeparately: parts.feePaidSeparately,
        status,
        transferredAt,
        reference: emptyToNull(input.reference),
        notes: emptyToNull(input.notes),
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    })
    if (touched.count !== 1) {
      throw new TransferServiceError(
        "Transfer is no longer pending and cannot be completed again."
      )
    }

    const updated = await tx.transfer.findFirstOrThrow({
      where: { id: existing.id, userId },
    })

    if (plan.upsertSeparateFee) {
      await upsertFeeExpense(
        tx,
        userId,
        updated.id,
        from.id,
        parts,
        transferredAt
      )
    } else if (plan.softDeleteFeeExpenses) {
      await softDeleteFeeExpenses(tx, updated.id)
    }

    if (plan.recomputeBalances) {
      await recomputeCachedBalance(tx, from.id, from.currency)
      await recomputeCachedBalance(tx, to.id, to.currency)
    }

    await writeAuditLog(tx, {
      userId,
      entityType: "Transfer",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason:
        status === "COMPLETED"
          ? "Pending transfer completed — balances recomputed"
          : "Pending transfer updated",
    })

    return updated
    },
    { timeout: 20_000 }
  )
}

export async function updateTransferMeta(
  userId: string,
  input: UpdateTransferMetaInput
): Promise<Transfer> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transfer.findFirst({
      where: { id: input.id, userId, deletedAt: null },
    })
    if (!existing) throw new TransferServiceError("Transfer not found.")

    const updated = await tx.transfer.update({
      where: { id: existing.id },
      data: {
        reference: emptyToNull(input.reference),
        notes: emptyToNull(input.notes),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Transfer",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Transfer notes/reference updated (balances unchanged)",
    })

    return updated
  })
}

/** Reverse a COMPLETED transfer: restores balances and soft-deletes fee expense. */
export async function reverseTransfer(
  userId: string,
  transferId: string
): Promise<Transfer> {
  return prisma.$transaction(
    async (tx) => {
    const existing = await tx.transfer.findFirst({
      where: { id: transferId, userId, deletedAt: null },
    })
    if (!existing) throw new TransferServiceError("Transfer not found.")
    if (existing.status !== "COMPLETED") {
      throw new TransferServiceError("Only completed transfers can be reversed.")
    }

    let locked
    try {
      locked = await lockAndRefreshAccounts(tx, userId, [
        existing.fromAccountId,
        existing.toAccountId,
      ])
    } catch (error) {
      mapBalanceError(error)
    }

    const updated = await tx.transfer.update({
      where: { id: existing.id },
      data: {
        status: "REVERSED",
        reversedAt: new Date(),
      },
    })

    await softDeleteFeeExpenses(tx, existing.id)

    const from = locked.get(existing.fromAccountId)
    const to = locked.get(existing.toAccountId)
    if (from) await recomputeCachedBalance(tx, from.id, from.currency)
    if (to) await recomputeCachedBalance(tx, to.id, to.currency)

    await writeAuditLog(tx, {
      userId,
      entityType: "Transfer",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Transfer reversed — balances restored",
    })

    return updated
    },
    { timeout: 20_000 }
  )
}

export async function cancelPendingTransfer(
  userId: string,
  transferId: string
): Promise<Transfer> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transfer.findFirst({
      where: { id: transferId, userId, deletedAt: null },
    })
    if (!existing) throw new TransferServiceError("Transfer not found.")
    if (existing.status !== "PENDING") {
      throw new TransferServiceError("Only pending transfers can be cancelled.")
    }

    const updated = await tx.transfer.update({
      where: { id: existing.id },
      data: { status: "CANCELLED" },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Transfer",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Pending transfer cancelled",
    })

    return updated
  })
}
