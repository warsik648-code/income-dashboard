import {
  Prisma,
  type BillingFrequency,
  type PaymentMethod,
  type Subscription,
  type SubscriptionStatus,
} from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import {
  advanceRenewalDate,
  monthlyEquivalent,
  renewalPeriodKey,
} from "@/lib/money/billing"
import { parseAppDateTimeLocal, parseCalendarDate } from "@/lib/time"
import {
  getSubscriptionDisplayState,
  isSubscriptionDue,
} from "@/lib/money/subscription-due"
import { buildFxSnapshot, type MoneyDecimalString } from "@/lib/money"
import { resolveExchangeRateSource } from "@/lib/money/fx-source"
import { writeAuditLog } from "@/lib/services/audit"
import {
  BalanceServiceError,
  lockAndRefreshAccountBalance,
  recomputeCachedBalance,
} from "@/lib/services/balances"
import { ensureExpenseCategories } from "@/lib/services/categories"
import type {
  ConfirmPaidInput,
  CreateSubscriptionInput,
  SubscriptionFilters,
  UpdateSubscriptionInput,
} from "@/lib/validations/subscriptions"

export class SubscriptionServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SubscriptionServiceError"
  }
}

export type ConfirmRenewalPaymentInput = ConfirmPaidInput & {
  userId: string
  subscriptionId: string
}

export type ConfirmRenewalPaymentResult = {
  transactionId: string
  subscriptionId: string
  nextRenewalDate: Date
}

export type SubscriptionListItem = Subscription & {
  account: {
    id: string
    name: string
    currency: string
    cachedBalance: Prisma.Decimal
  }
  category: { id: string; name: string } | null
  displayState: ReturnType<typeof getSubscriptionDisplayState>
  isDue: boolean
  monthlyEquivalent: string
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseCalendarField(value: string) {
  try {
    return parseCalendarDate(value)
  } catch {
    throw new SubscriptionServiceError("Invalid date.")
  }
}

function parseOptionalCalendarField(value?: string | null) {
  if (!value?.trim()) return null
  return parseCalendarField(value)
}

function parsePaymentInstant(value: string) {
  try {
    // datetime-local from confirm-paid → Europe/Istanbul wall time
    if (value.includes("T")) return parseAppDateTimeLocal(value)
    return parseCalendarDate(value)
  } catch {
    throw new SubscriptionServiceError("Invalid date.")
  }
}

function parseCustomDays(frequency: string, raw?: string | null) {
  if (frequency !== "CUSTOM") return null
  const days = Number(raw)
  if (!Number.isInteger(days) || days <= 0) {
    throw new SubscriptionServiceError(
      "Custom interval days must be a positive whole number."
    )
  }
  return days
}

async function getOwnedActiveAccount(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  accountId: string
) {
  const account = await client.financialAccount.findFirst({
    where: {
      id: accountId,
      userId,
      deletedAt: null,
      isArchived: false,
    },
  })
  if (!account) {
    throw new SubscriptionServiceError("Select an active payment account.")
  }
  return account
}

export async function listSubscriptions(
  userId: string,
  filters: SubscriptionFilters = {}
): Promise<SubscriptionListItem[]> {
  const includeDeleted = filters.deleted === "1"
  const rows = await prisma.subscription.findMany({
    where: {
      userId,
      deletedAt: includeDeleted ? { not: null } : null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.currency ? { currency: filters.currency } : {}),
      ...(filters.billingFrequency
        ? { billingFrequency: filters.billingFrequency }
        : {}),
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          currency: true,
          cachedBalance: true,
        },
      },
      category: { select: { id: true, name: true } },
    },
    orderBy: [{ nextRenewalDate: "asc" }, { name: "asc" }],
  })

  return rows.map((row) => {
    const dueInput = {
      status: row.status,
      nextRenewalDate: row.nextRenewalDate,
      endDate: row.endDate,
      deletedAt: row.deletedAt,
    }
    return {
      ...row,
      displayState: getSubscriptionDisplayState(dueInput),
      isDue: isSubscriptionDue(dueInput),
      monthlyEquivalent: monthlyEquivalent(
        row.price,
        row.billingFrequency,
        row.customIntervalDays
      ).toString(),
    }
  })
}

export function summarizeSubscriptions(items: SubscriptionListItem[]) {
  const activeItems = items.filter(
    (item) =>
      !item.deletedAt &&
      (item.status === "ACTIVE" || item.status === "TRIAL")
  )
  const due = activeItems.filter((item) => item.isDue)
  const upcoming = activeItems
    .filter((item) => !item.isDue)
    .slice()
    .sort(
      (a, b) => a.nextRenewalDate.getTime() - b.nextRenewalDate.getTime()
    )
    .slice(0, 5)

  const monthlyByCurrency = new Map<string, Prisma.Decimal>()
  for (const item of activeItems) {
    const current =
      monthlyByCurrency.get(item.currency) ?? new Prisma.Decimal(0)
    monthlyByCurrency.set(
      item.currency,
      current.plus(item.monthlyEquivalent)
    )
  }

  return {
    activeCount: activeItems.length,
    dueCount: due.length,
    due,
    upcoming,
    monthlyByCurrency: [...monthlyByCurrency.entries()]
      .map(([currency, amount]) => ({
        currency,
        amount: amount.toDecimalPlaces(4).toString(),
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency)),
  }
}

export async function createSubscription(
  userId: string,
  input: CreateSubscriptionInput
): Promise<Subscription> {
  const account = await getOwnedActiveAccount(prisma, userId, input.accountId)
  const currency = account.currency

  if (input.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: input.categoryId,
        userId,
        deletedAt: null,
      },
    })
    if (!category) {
      throw new SubscriptionServiceError("Select a valid category.")
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.subscription.create({
      data: {
        userId,
        name: input.name.trim(),
        provider: input.provider.trim(),
        logoUrl: emptyToNull(input.logoUrl),
        price: new Prisma.Decimal(input.price),
        currency,
        billingFrequency: input.billingFrequency as BillingFrequency,
        customIntervalDays: parseCustomDays(
          input.billingFrequency,
          input.customIntervalDays
        ),
        startDate: parseCalendarField(input.startDate),
        nextRenewalDate: parseCalendarField(input.nextRenewalDate),
        endDate: parseOptionalCalendarField(input.endDate),
        accountId: account.id,
        categoryId: emptyToNull(input.categoryId),
        paymentMethod: emptyToNull(input.paymentMethod) as PaymentMethod | null,
        status: (input.status ?? "ACTIVE") as SubscriptionStatus,
        autoRenew: input.autoRenew ?? true,
        notes: emptyToNull(input.notes),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Subscription",
      entityId: row.id,
      action: "CREATE",
      before: null,
      after: row,
      reason: "Subscription created",
    })

    return row
  })

  return created
}

export async function updateSubscription(
  userId: string,
  input: UpdateSubscriptionInput
): Promise<Subscription> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findFirst({
      where: { id: input.id, userId, deletedAt: null },
    })
    if (!existing) {
      throw new SubscriptionServiceError("Subscription not found.")
    }

    const account = await getOwnedActiveAccount(tx, userId, input.accountId)

    const updated = await tx.subscription.update({
      where: { id: existing.id },
      data: {
        name: input.name.trim(),
        provider: input.provider.trim(),
        logoUrl: emptyToNull(input.logoUrl),
        price: new Prisma.Decimal(input.price),
        currency: account.currency,
        billingFrequency: input.billingFrequency as BillingFrequency,
        customIntervalDays: parseCustomDays(
          input.billingFrequency,
          input.customIntervalDays
        ),
        startDate: parseCalendarField(input.startDate),
        nextRenewalDate: parseCalendarField(input.nextRenewalDate),
        endDate: parseOptionalCalendarField(input.endDate),
        accountId: account.id,
        categoryId: emptyToNull(input.categoryId),
        paymentMethod: emptyToNull(input.paymentMethod) as PaymentMethod | null,
        status: input.status as SubscriptionStatus,
        autoRenew: input.autoRenew ?? existing.autoRenew,
        notes: emptyToNull(input.notes),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Subscription",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Subscription updated",
    })

    return updated
  })
}

async function setStatus(
  userId: string,
  id: string,
  status: SubscriptionStatus,
  reason: string,
  extra?: { endDate?: Date | null }
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findFirst({
      where: { id, userId, deletedAt: null },
    })
    if (!existing) {
      throw new SubscriptionServiceError("Subscription not found.")
    }

    const updated = await tx.subscription.update({
      where: { id: existing.id },
      data: {
        status,
        ...(extra?.endDate !== undefined ? { endDate: extra.endDate } : {}),
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Subscription",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason,
    })

    return updated
  })
}

export async function pauseSubscription(userId: string, id: string) {
  return setStatus(userId, id, "PAUSED", "Subscription paused")
}

export async function resumeSubscription(userId: string, id: string) {
  return setStatus(userId, id, "ACTIVE", "Subscription resumed")
}

export async function cancelSubscription(input: {
  userId: string
  subscriptionId: string
  endDate?: Date
  reason?: string
}) {
  return setStatus(
    input.userId,
    input.subscriptionId,
    "CANCELLED",
    input.reason ?? "Subscription cancelled",
    { endDate: input.endDate ?? new Date() }
  )
}

export async function softDeleteSubscription(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findFirst({
      where: { id, userId, deletedAt: null },
    })
    if (!existing) {
      throw new SubscriptionServiceError("Subscription not found.")
    }

    const deleted = await tx.subscription.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Subscription",
      entityId: deleted.id,
      action: "SOFT_DELETE",
      before: existing,
      after: deleted,
      reason:
        "Subscription archived. Linked renewal expenses stay in the ledger (cash already moved); they cannot be edited from Expenses.",
    })

    return deleted
  })
}

export async function restoreSubscription(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findFirst({
      where: { id, userId, deletedAt: { not: null } },
    })
    if (!existing) {
      throw new SubscriptionServiceError("Deleted subscription not found.")
    }

    const restored = await tx.subscription.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Subscription",
      entityId: restored.id,
      action: "RESTORE",
      before: existing,
      after: restored,
      reason: "Subscription restored",
    })

    return restored
  })
}

export async function confirmRenewalPayment(
  input: ConfirmRenewalPaymentInput
): Promise<ConfirmRenewalPaymentResult> {
  const userId = input.userId
  const subscriptionId = input.subscriptionId

  // Keep category ensure outside the money transaction (avoids long locks / timeouts).
  const categories = await ensureExpenseCategories(userId)
  const subscriptionCategory =
    categories.find((c) => c.name === "Subscription") ?? categories[0]
  if (!subscriptionCategory) {
    throw new SubscriptionServiceError("Expense categories are missing.")
  }

  return prisma.$transaction(
    async (tx) => {
    // Lock subscription row first to serialize renewal confirms.
    const lockedSub = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Subscription"
      WHERE id = ${subscriptionId}
        AND "userId" = ${userId}
        AND "deletedAt" IS NULL
      FOR UPDATE
    `
    if (lockedSub.length === 0) {
      throw new SubscriptionServiceError("Subscription not found.")
    }

    const subscription = await tx.subscription.findFirst({
      where: { id: subscriptionId, userId, deletedAt: null },
    })
    if (!subscription) {
      throw new SubscriptionServiceError("Subscription not found.")
    }
    if (
      subscription.status !== "ACTIVE" &&
      subscription.status !== "TRIAL"
    ) {
      throw new SubscriptionServiceError(
        "Only active or trial subscriptions can be confirmed as paid."
      )
    }

    const accountId = input.accountId?.trim() || subscription.accountId
    let account
    try {
      account = await lockAndRefreshAccountBalance(tx, userId, accountId)
    } catch (error) {
      if (error instanceof BalanceServiceError) {
        throw new SubscriptionServiceError(error.message)
      }
      throw error
    }

    if (account.currency !== subscription.currency) {
      throw new SubscriptionServiceError(
        "Payment account currency must match the subscription currency."
      )
    }

    const periodKey = renewalPeriodKey(subscription.nextRenewalDate)
    const duplicate = await tx.transaction.findFirst({
      where: {
        subscriptionId: subscription.id,
        renewalPeriod: periodKey,
      },
      select: { id: true },
    })
    if (duplicate) {
      throw new SubscriptionServiceError(
        `This renewal period (${periodKey}) was already confirmed.`
      )
    }

    if (account.currency !== "USD" && !input.exchangeRate?.trim()) {
      throw new SubscriptionServiceError(
        "Exchange rate (currency units per 1 USD) is required for non-USD subscriptions."
      )
    }

    const fx = buildFxSnapshot({
      amount: subscription.price.toString() as MoneyDecimalString,
      currency: subscription.currency,
      exchangeRate: input.exchangeRate?.trim() || undefined,
      exchangeRateSource: resolveExchangeRateSource({
        currency: account.currency,
        exchangeRate: input.exchangeRate,
        exchangeRateSource: input.exchangeRateSource,
      }),
    })

    if (fx.amount.gt(account.cachedBalance) && !input.allowOverdraft) {
      throw new SubscriptionServiceError(
        `Insufficient balance. Available ${account.cachedBalance.toString()} ${account.currency}. Enable overdraft to continue.`
      )
    }

    const paymentDate = input.paymentDate?.trim()
      ? parsePaymentInstant(input.paymentDate)
      : new Date()

    let expense
    try {
      expense = await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          categoryId: subscription.categoryId ?? subscriptionCategory.id,
          subscriptionId: subscription.id,
          renewalPeriod: periodKey,
          type: "EXPENSE",
          amount: fx.amount,
          currency: fx.currency,
          exchangeRate: fx.exchangeRate,
          baseAmountUsd: fx.baseAmountUsd,
          exchangeRateAt: fx.exchangeRateAt,
          exchangeRateSource: fx.exchangeRateSource,
          transactionDate: paymentDate,
          description: `${subscription.name} renewal`,
          counterparty: subscription.provider,
          paymentMethod:
            subscription.paymentMethod ??
            ("OTHER" as PaymentMethod),
          notes: `Subscription renewal (${periodKey})`,
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new SubscriptionServiceError(
          `This renewal period (${periodKey}) was already confirmed.`
        )
      }
      throw error
    }

    await writeAuditLog(tx, {
      userId,
      entityType: "Transaction",
      entityId: expense.id,
      action: "CREATE",
      before: null,
      after: expense,
      reason: `Subscription renewal confirmed (${periodKey})`,
    })

    const nextRenewalDate = advanceRenewalDate(
      subscription.nextRenewalDate,
      subscription.billingFrequency,
      subscription.customIntervalDays
    )

    const updatedSub = await tx.subscription.update({
      where: { id: subscription.id },
      data: { nextRenewalDate },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Subscription",
      entityId: updatedSub.id,
      action: "UPDATE",
      before: subscription,
      after: updatedSub,
      reason: `Renewal confirmed; next date advanced from ${periodKey}`,
    })

    const updatedAccount = await recomputeCachedBalance(
      tx,
      account.id,
      account.currency
    )

    await writeAuditLog(tx, {
      userId,
      entityType: "FinancialAccount",
      entityId: account.id,
      action: "UPDATE",
      before: account,
      after: updatedAccount,
      reason: "Balance after subscription renewal",
    })

    return {
      transactionId: expense.id,
      subscriptionId: subscription.id,
      nextRenewalDate,
    }
  },
    { timeout: 20_000 }
  )
}

/** @deprecated use confirmRenewalPayment with ConfirmPaidInput shape */
export async function confirmPaid(
  userId: string,
  input: ConfirmPaidInput
) {
  return confirmRenewalPayment({
    ...input,
    userId,
    subscriptionId: input.id,
  })
}
