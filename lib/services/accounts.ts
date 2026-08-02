import {
  Prisma,
  type AccountType,
  type AssetClass,
  type FinancialAccount,
} from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import {
  assertTransactionCurrencyMatchesAccount,
  buildFxSnapshot,
  normalizeCurrencyCode,
  type MoneyDecimalString,
} from "@/lib/money"
import { writeAuditLog } from "@/lib/services/audit"
import { recomputeCachedBalance } from "@/lib/services/balances"
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "@/lib/validations/accounts"

export class AccountServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AccountServiceError"
  }
}

export type AccountListItem = FinancialAccount

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function listAccounts(
  userId: string,
  options?: { includeArchived?: boolean }
): Promise<AccountListItem[]> {
  return prisma.financialAccount.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(options?.includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ isArchived: "asc" }, { type: "asc" }, { name: "asc" }],
  })
}

/** Active (non-archived) accounts for selectors elsewhere in the app. */
export async function listSelectableAccounts(userId: string) {
  return listAccounts(userId, { includeArchived: false })
}

export async function createAccount(
  userId: string,
  input: CreateAccountInput
): Promise<FinancialAccount> {
  const currency = normalizeCurrencyCode(input.currency)
  const name = input.name.trim()
  const startingBalance = input.startingBalance?.trim()

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.financialAccount.findFirst({
      where: {
        userId,
        type: input.type as AccountType,
        name,
        deletedAt: null,
      },
    })
    if (duplicate) {
      throw new AccountServiceError(
        "An account with this type and name already exists."
      )
    }

    const created = await tx.financialAccount.create({
      data: {
        userId,
        name,
        type: input.type as AccountType,
        assetClass: input.assetClass as AssetClass,
        currency,
        institution: emptyToNull(input.institution),
        notes: emptyToNull(input.notes),
        cachedBalance: new Prisma.Decimal(0),
        isArchived: false,
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "FinancialAccount",
      entityId: created.id,
      action: "CREATE",
      before: null,
      after: created,
      reason: "Account created",
    })

    if (startingBalance) {
      assertTransactionCurrencyMatchesAccount(currency, created.currency)

      const fx = buildFxSnapshot({
        amount: startingBalance as MoneyDecimalString,
        currency,
        exchangeRate: input.exchangeRate?.trim() || undefined,
        exchangeRateSource:
          currency === "USD"
            ? "FIXED_USD"
            : input.exchangeRate?.trim()
              ? "USER_OVERRIDE"
              : "MANUAL",
      })

      const openingTx = await tx.transaction.create({
        data: {
          userId,
          accountId: created.id,
          type: "INCOME",
          amount: fx.amount,
          currency: fx.currency,
          exchangeRate: fx.exchangeRate,
          baseAmountUsd: fx.baseAmountUsd,
          exchangeRateAt: fx.exchangeRateAt,
          exchangeRateSource: fx.exchangeRateSource,
          transactionDate: new Date(),
          description: "Opening balance",
          notes: "System-generated opening balance for new account",
        },
      })

      await writeAuditLog(tx, {
        userId,
        entityType: "Transaction",
        entityId: openingTx.id,
        action: "CREATE",
        before: null,
        after: openingTx,
        reason: "Opening balance",
      })

      const updated = await recomputeCachedBalance(tx, created.id, currency)

      await writeAuditLog(tx, {
        userId,
        entityType: "FinancialAccount",
        entityId: created.id,
        action: "UPDATE",
        before: created,
        after: updated,
        reason: "Cached balance after opening balance",
      })

      return updated
    }

    return created
  })
}

export async function updateAccount(
  userId: string,
  input: UpdateAccountInput
): Promise<FinancialAccount> {
  const name = input.name.trim()

  return prisma.$transaction(async (tx) => {
    const existing = await tx.financialAccount.findFirst({
      where: { id: input.id, userId, deletedAt: null },
    })
    if (!existing) {
      throw new AccountServiceError("Account not found.")
    }

    const clash = await tx.financialAccount.findFirst({
      where: {
        userId,
        type: existing.type,
        name,
        deletedAt: null,
        NOT: { id: existing.id },
      },
    })
    if (clash) {
      throw new AccountServiceError(
        "An account with this type and name already exists."
      )
    }

    const updated = await tx.financialAccount.update({
      where: { id: existing.id },
      data: {
        name,
        institution: emptyToNull(input.institution),
        notes: emptyToNull(input.notes),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "FinancialAccount",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Account details updated",
    })

    return updated
  })
}

export async function archiveAccount(
  userId: string,
  accountId: string
): Promise<FinancialAccount> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.financialAccount.findFirst({
      where: { id: accountId, userId, deletedAt: null },
    })
    if (!existing) {
      throw new AccountServiceError("Account not found.")
    }
    if (existing.isArchived) {
      return existing
    }

    const activeSubscription = await tx.subscription.findFirst({
      where: {
        userId,
        accountId,
        deletedAt: null,
        status: { in: ["ACTIVE", "TRIAL"] },
      },
      select: { id: true, name: true },
    })

    if (activeSubscription) {
      throw new AccountServiceError(
        `Cannot archive while linked to active subscription “${activeSubscription.name}”. Reassign or cancel that subscription first.`
      )
    }

    const updated = await tx.financialAccount.update({
      where: { id: existing.id },
      data: { isArchived: true },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "FinancialAccount",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Account archived",
    })

    return updated
  })
}

export async function unarchiveAccount(
  userId: string,
  accountId: string
): Promise<FinancialAccount> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.financialAccount.findFirst({
      where: { id: accountId, userId, deletedAt: null },
    })
    if (!existing) {
      throw new AccountServiceError("Account not found.")
    }
    if (!existing.isArchived) {
      return existing
    }

    const updated = await tx.financialAccount.update({
      where: { id: existing.id },
      data: { isArchived: false },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "FinancialAccount",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Account restored from archive",
    })

    return updated
  })
}
