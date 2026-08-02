import { Prisma } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import { getAnalytics } from "@/lib/services/analytics"
import { listAccounts } from "@/lib/services/accounts"
import { listDebts, summarizeDebts } from "@/lib/services/debts"
import {
  listSubscriptions,
  summarizeSubscriptions,
} from "@/lib/services/subscriptions"

const OPENING_BALANCE_DESCRIPTION = "Opening balance"

export type DashboardAccountCard = {
  id: string
  name: string
  type: string
  assetClass: string
  currency: string
  institution: string | null
  balance: string
  balanceUsd: string | null
  exchangeRate: string | null
}

export type DashboardActivityItem = {
  id: string
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  description: string
  amount: string
  currency: string
  amountUsd: string
  transactionDate: string
  accountName: string
  isOpeningBalance: boolean
}

export type DashboardResult = {
  summary: {
    totalBalanceUsd: string | null
    balanceCoverageNote: string | null
    incomeTodayUsd: string
    expensesTodayUsd: string
    netThisMonthUsd: string
    owedToMeByCurrency: Array<{ currency: string; amount: string }>
    iOweByCurrency: Array<{ currency: string; amount: string }>
  }
  accounts: DashboardAccountCard[]
  chart30d: Array<{
    period: string
    label: string
    incomeUsd: string
    expensesUsd: string
  }>
  recentActivity: DashboardActivityItem[]
  subscriptions: {
    dueCount: number
    due: Array<{
      id: string
      name: string
      price: string
      currency: string
      nextRenewalDate: string
    }>
    upcoming: Array<{
      id: string
      name: string
      price: string
      currency: string
      nextRenewalDate: string
    }>
    monthlyByCurrency: Array<{ currency: string; amount: string }>
  }
  debts: {
    owedToMeByCurrency: Array<{ currency: string; amount: string }>
    iOweByCurrency: Array<{ currency: string; amount: string }>
    activePreview: Array<{
      id: string
      personName: string
      direction: string
      remainingAmount: string
      currency: string
      status: string
    }>
  }
}

function toMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(4).toString()
}

/** Latest known units-per-USD rate per currency from non-deleted transactions. */
async function latestExchangeRatesByCurrency(userId: string) {
  const rows = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    select: {
      currency: true,
      exchangeRate: true,
      transactionDate: true,
      createdAt: true,
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  })

  const rates = new Map<string, Prisma.Decimal>()
  for (const row of rows) {
    if (!rates.has(row.currency)) {
      rates.set(row.currency, row.exchangeRate)
    }
  }
  if (!rates.has("USD")) {
    rates.set("USD", new Prisma.Decimal(1))
  }
  return rates
}

export async function getDashboard(userId: string): Promise<DashboardResult> {
  const [
    accounts,
    rates,
    today,
    thisMonth,
    last30,
    subscriptions,
    debts,
    recent,
    recentTransfers,
  ] = await Promise.all([
    listAccounts(userId, { includeArchived: false }),
    latestExchangeRatesByCurrency(userId),
    getAnalytics(userId, { preset: "today" }),
    getAnalytics(userId, { preset: "this_month" }),
    getAnalytics(userId, { preset: "last_30_days" }),
    listSubscriptions(userId),
    listDebts(userId),
    prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        description: { not: OPENING_BALANCE_DESCRIPTION },
      },
      include: {
        account: { select: { name: true } },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    prisma.transfer.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ["COMPLETED", "PENDING"] },
      },
      include: {
        fromAccount: { select: { name: true } },
        toAccount: { select: { name: true } },
      },
      orderBy: [{ transferredAt: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ])

  const accountCards: DashboardAccountCard[] = accounts.map((account) => {
    const rate =
      account.currency === "USD"
        ? new Prisma.Decimal(1)
        : (rates.get(account.currency) ?? null)
    const balanceUsd = rate
      ? account.cachedBalance.div(rate).toDecimalPlaces(4)
      : null
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      assetClass: account.assetClass,
      currency: account.currency,
      institution: account.institution,
      balance: account.cachedBalance.toString(),
      balanceUsd: balanceUsd ? toMoney(balanceUsd) : null,
      exchangeRate: rate ? rate.toString() : null,
    }
  })

  let totalBalanceUsd: Prisma.Decimal | null = new Prisma.Decimal(0)
  let missingRateCount = 0
  for (const card of accountCards) {
    if (card.balanceUsd == null) {
      missingRateCount += 1
      continue
    }
    totalBalanceUsd = totalBalanceUsd.plus(card.balanceUsd)
  }
  if (accountCards.length === 0) {
    totalBalanceUsd = null
  }

  const subSummary = summarizeSubscriptions(subscriptions)
  const debtSummary = summarizeDebts(debts)
  const activeDebts = debts
    .filter(
      (d) =>
        !d.deletedAt &&
        d.status !== "PAID" &&
        d.status !== "WRITTEN_OFF" &&
        d.remainingAmount.gt(0)
    )
    .slice(0, 3)

  return {
    summary: {
      totalBalanceUsd:
        totalBalanceUsd == null ? null : toMoney(totalBalanceUsd),
      balanceCoverageNote:
        missingRateCount > 0
          ? `${missingRateCount} account${missingRateCount === 1 ? "" : "s"} omitted from USD total (no FX rate yet)`
          : null,
      incomeTodayUsd: today.summary.totalIncomeUsd,
      expensesTodayUsd: today.summary.totalExpensesUsd,
      netThisMonthUsd: thisMonth.summary.netCashFlowUsd,
      owedToMeByCurrency: debtSummary.owedToMeByCurrency,
      iOweByCurrency: debtSummary.iOweByCurrency,
    },
    accounts: accountCards,
    chart30d: last30.incomeVsExpenses.map((row) => ({
      period: row.period,
      label: row.label,
      incomeUsd: row.incomeUsd,
      expensesUsd: row.expensesUsd,
    })),
    recentActivity: [
      ...recent.map((txn) => ({
        id: txn.id,
        type: txn.type as "INCOME" | "EXPENSE",
        description: txn.description,
        amount: txn.amount.toString(),
        currency: txn.currency,
        amountUsd: txn.baseAmountUsd.toDecimalPlaces(4).toString(),
        transactionDate: txn.transactionDate.toISOString(),
        accountName: txn.account.name,
        isOpeningBalance: txn.description === OPENING_BALANCE_DESCRIPTION,
      })),
      ...recentTransfers.map((transfer) => ({
        id: transfer.id,
        type: "TRANSFER" as const,
        description: `Transfer: ${transfer.fromAccount.name} → ${transfer.toAccount.name}`,
        amount: transfer.sourceAmount.toString(),
        currency: transfer.sourceCurrency,
        amountUsd: transfer.sourceBaseAmountUsd.toDecimalPlaces(4).toString(),
        transactionDate: transfer.transferredAt.toISOString(),
        accountName: `${transfer.fromAccount.name} → ${transfer.toAccount.name}`,
        isOpeningBalance: false,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime()
      )
      .slice(0, 12),
    subscriptions: {
      dueCount: subSummary.dueCount,
      due: subSummary.due.slice(0, 5).map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price.toString(),
        currency: item.currency,
        nextRenewalDate: item.nextRenewalDate.toISOString(),
      })),
      upcoming: subSummary.upcoming.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price.toString(),
        currency: item.currency,
        nextRenewalDate: item.nextRenewalDate.toISOString(),
      })),
      monthlyByCurrency: subSummary.monthlyByCurrency,
    },
    debts: {
      owedToMeByCurrency: debtSummary.owedToMeByCurrency,
      iOweByCurrency: debtSummary.iOweByCurrency,
      activePreview: activeDebts.map((debt) => ({
        id: debt.id,
        personName: debt.personName,
        direction: debt.direction,
        remainingAmount: debt.remainingAmount.toString(),
        currency: debt.currency,
        status: debt.status,
      })),
    },
  }
}
