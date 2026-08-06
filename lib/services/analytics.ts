import { Prisma, type TransactionType } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import {
  addAppCalendarDays,
  appDayRangeFromCalendarDate,
  appPeriodKey,
  endOfAppDayMs,
  formatAppCalendarDate,
  startOfAppDay,
  startOfAppMonth,
  startOfAppWeek,
  startOfAppYear,
  zonedWallTimeToUtc,
} from "@/lib/time"
import type {
  AnalyticsFilters,
  AnalyticsPreset,
} from "@/lib/validations/analytics"

const OPENING_BALANCE_DESCRIPTION = "Opening balance"

export type AnalyticsRange = {
  preset: AnalyticsPreset
  from: string
  to: string
  bucket: "day" | "month"
  dayCount: number
}

export type AnalyticsSummary = {
  totalIncomeUsd: string
  totalExpensesUsd: string
  netCashFlowUsd: string
  savingsRate: string | null
  transactionCount: number
  averageDailyIncomeUsd: string
  averageDailySpendingUsd: string
}

export type CurrencyBreakdownRow = {
  currency: string
  income: string
  expenses: string
  net: string
}

export type NamedAmount = {
  name: string
  amountUsd: string
}

export type PeriodFlow = {
  period: string
  label: string
  incomeUsd: string
  expensesUsd: string
  netUsd: string
}

export type SavingsPoint = {
  period: string
  label: string
  periodNetUsd: string
  cumulativeNetUsd: string
}

export type LargestEntry = {
  id: string
  description: string
  counterparty: string | null
  amount: string
  currency: string
  amountUsd: string
  transactionDate: string
  accountName: string
}

export type AnalyticsResult = {
  range: AnalyticsRange
  summary: AnalyticsSummary
  byCurrency: CurrencyBreakdownRow[]
  incomeVsExpenses: PeriodFlow[]
  netCashFlow: Array<{ period: string; label: string; netUsd: string }>
  spendingByCategory: NamedAmount[]
  incomeByCategory: NamedAmount[]
  spendingByAccount: NamedAmount[]
  incomeByAccount: NamedAmount[]
  monthlyComparison: PeriodFlow[]
  savingsTrend: SavingsPoint[]
  topExpenseCategories: NamedAmount[]
  largestIncome: LargestEntry[]
  largestExpenses: LargestEntry[]
  periodBreakdown: PeriodFlow[]
  hasData: boolean
}

type AnalyticsTxn = {
  id: string
  type: TransactionType
  amount: Prisma.Decimal
  currency: string
  baseAmountUsd: Prisma.Decimal
  transactionDate: Date
  description: string
  counterparty: string | null
  account: { id: string; name: string }
  category: { id: string; name: string; kind: TransactionType } | null
}

/** All analytics ranges use Europe/Istanbul civil days, returned as UTC instants. */
function resolveRange(filters: AnalyticsFilters): {
  from: Date
  to: Date
  preset: AnalyticsPreset
} {
  const now = new Date()
  const preset = filters.preset ?? "this_month"

  switch (preset) {
    case "today":
      return { preset, from: startOfAppDay(now), to: endOfAppDayMs(now) }
    case "this_week":
      return { preset, from: startOfAppWeek(now), to: endOfAppDayMs(now) }
    case "this_month":
      return {
        preset,
        from: startOfAppMonth(now),
        to: endOfAppDayMs(now),
      }
    case "last_30_days":
      return {
        preset,
        from: startOfAppDay(addAppCalendarDays(now, -29)),
        to: endOfAppDayMs(now),
      }
    case "this_year":
      return {
        preset,
        from: startOfAppYear(now),
        to: endOfAppDayMs(now),
      }
    case "custom": {
      const fromRange = appDayRangeFromCalendarDate(filters.from!)
      const toRange = appDayRangeFromCalendarDate(filters.to!)
      return { preset, from: fromRange.start, to: toRange.end }
    }
    default:
      return {
        preset: "this_month",
        from: startOfAppMonth(now),
        to: endOfAppDayMs(now),
      }
  }
}

function dayCountInclusive(from: Date, to: Date) {
  const start = startOfAppDay(from).getTime()
  const end = startOfAppDay(to).getTime()
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1)
}

function chooseBucket(from: Date, to: Date): "day" | "month" {
  return dayCountInclusive(from, to) <= 45 ? "day" : "month"
}

function periodKey(date: Date, bucket: "day" | "month") {
  return appPeriodKey(date, bucket)
}

function periodLabel(key: string, bucket: "day" | "month") {
  if (bucket === "month") {
    const [y, m] = key.split("-")
    return formatAppCalendarDate(
      new Date(Date.UTC(Number(y), Number(m) - 1, 1)),
      { month: "short", year: "numeric" }
    )
  }
  const [y, m, d] = key.split("-")
  return formatAppCalendarDate(
    new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))),
    { month: "short", day: "numeric" }
  )
}

function enumeratePeriods(from: Date, to: Date, bucket: "day" | "month") {
  const keys: string[] = []
  if (bucket === "month") {
    let cursor = startOfAppMonth(from)
    const end = startOfAppMonth(to)
    while (cursor.getTime() <= end.getTime()) {
      keys.push(periodKey(cursor, "month"))
      const key = appPeriodKey(cursor, "month")
      const [y, m] = key.split("-").map(Number)
      const nextMonth = m === 12 ? 1 : m! + 1
      const nextYear = m === 12 ? y! + 1 : y!
      cursor = zonedWallTimeToUtc({
        year: nextYear,
        month: nextMonth,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      })
    }
    return keys
  }

  let cursor = startOfAppDay(from)
  const end = startOfAppDay(to)
  while (cursor.getTime() <= end.getTime()) {
    keys.push(periodKey(cursor, "day"))
    cursor = startOfAppDay(addAppCalendarDays(cursor, 1))
  }
  return keys
}

function dec(value?: Prisma.Decimal | null) {
  return value ?? new Prisma.Decimal(0)
}

function toMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(4).toString()
}

function addToMap(
  map: Map<string, Prisma.Decimal>,
  key: string,
  amount: Prisma.Decimal
) {
  map.set(key, (map.get(key) ?? new Prisma.Decimal(0)).plus(amount))
}

function mapToNamedAmounts(
  map: Map<string, Prisma.Decimal>,
  limit?: number
): NamedAmount[] {
  const rows = [...map.entries()]
    .map(([name, amountUsd]) => ({ name, amountUsd: toMoney(amountUsd) }))
    .sort((a, b) =>
      new Prisma.Decimal(b.amountUsd).comparedTo(a.amountUsd)
    )
  return limit ? rows.slice(0, limit) : rows
}

function incomeSourceLabel(txn: AnalyticsTxn) {
  if (txn.category?.name) return txn.category.name
  if (txn.counterparty?.trim()) return txn.counterparty.trim()
  return txn.description.trim() || "Uncategorized"
}

function expenseCategoryLabel(txn: AnalyticsTxn) {
  return txn.category?.name ?? "Uncategorized"
}

export async function getAnalytics(
  userId: string,
  filters: AnalyticsFilters
): Promise<AnalyticsResult> {
  const { from, to, preset } = resolveRange(filters)
  const bucket = chooseBucket(from, to)
  const days = dayCountInclusive(from, to)

  const incomeCategoryId = filters.incomeCategoryId?.trim() || undefined
  const expenseCategoryId = filters.expenseCategoryId?.trim() || undefined
  const accountId = filters.accountId?.trim() || undefined
  const currency = filters.currency?.trim() || undefined

  const typeOr: Prisma.TransactionWhereInput[] = []
  if (incomeCategoryId || expenseCategoryId) {
    typeOr.push(
      incomeCategoryId
        ? { type: "INCOME", categoryId: incomeCategoryId }
        : { type: "INCOME" }
    )
    typeOr.push(
      expenseCategoryId
        ? { type: "EXPENSE", categoryId: expenseCategoryId }
        : { type: "EXPENSE" }
    )
  }

  const transactions = (await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      description: { not: OPENING_BALANCE_DESCRIPTION },
      transactionDate: { gte: from, lte: to },
      ...(accountId ? { accountId } : {}),
      ...(currency ? { currency } : {}),
      ...(typeOr.length > 0 ? { OR: typeOr } : {}),
    },
    select: {
      id: true,
      type: true,
      amount: true,
      currency: true,
      baseAmountUsd: true,
      transactionDate: true,
      description: true,
      counterparty: true,
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, kind: true } },
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  })) as AnalyticsTxn[]

  let totalIncomeUsd = new Prisma.Decimal(0)
  let totalExpensesUsd = new Prisma.Decimal(0)

  const currencyIncome = new Map<string, Prisma.Decimal>()
  const currencyExpense = new Map<string, Prisma.Decimal>()
  const spendByCategory = new Map<string, Prisma.Decimal>()
  const incomeByCategory = new Map<string, Prisma.Decimal>()
  const spendByAccount = new Map<string, Prisma.Decimal>()
  const incomeByAccount = new Map<string, Prisma.Decimal>()

  const periodIncome = new Map<string, Prisma.Decimal>()
  const periodExpense = new Map<string, Prisma.Decimal>()
  const monthIncome = new Map<string, Prisma.Decimal>()
  const monthExpense = new Map<string, Prisma.Decimal>()

  for (const txn of transactions) {
    const usd = dec(txn.baseAmountUsd)
    const period = periodKey(txn.transactionDate, bucket)
    const month = periodKey(txn.transactionDate, "month")

    if (txn.type === "INCOME") {
      totalIncomeUsd = totalIncomeUsd.plus(usd)
      addToMap(currencyIncome, txn.currency, txn.amount)
      addToMap(incomeByCategory, incomeSourceLabel(txn), usd)
      addToMap(incomeByAccount, txn.account.name, usd)
      addToMap(periodIncome, period, usd)
      addToMap(monthIncome, month, usd)
    } else {
      totalExpensesUsd = totalExpensesUsd.plus(usd)
      addToMap(currencyExpense, txn.currency, txn.amount)
      addToMap(spendByCategory, expenseCategoryLabel(txn), usd)
      addToMap(spendByAccount, txn.account.name, usd)
      addToMap(periodExpense, period, usd)
      addToMap(monthExpense, month, usd)
    }
  }

  const netCashFlowUsd = totalIncomeUsd.minus(totalExpensesUsd)
  const savingsRate = totalIncomeUsd.gt(0)
    ? netCashFlowUsd.div(totalIncomeUsd).mul(100).toDecimalPlaces(2).toString()
    : null

  const periods = enumeratePeriods(from, to, bucket)
  const incomeVsExpenses: PeriodFlow[] = periods.map((period) => {
    const income = periodIncome.get(period) ?? new Prisma.Decimal(0)
    const expenses = periodExpense.get(period) ?? new Prisma.Decimal(0)
    return {
      period,
      label: periodLabel(period, bucket),
      incomeUsd: toMoney(income),
      expensesUsd: toMoney(expenses),
      netUsd: toMoney(income.minus(expenses)),
    }
  })

  const monthKeys = enumeratePeriods(from, to, "month")
  const monthlyComparison: PeriodFlow[] = monthKeys.map((period) => {
    const income = monthIncome.get(period) ?? new Prisma.Decimal(0)
    const expenses = monthExpense.get(period) ?? new Prisma.Decimal(0)
    return {
      period,
      label: periodLabel(period, "month"),
      incomeUsd: toMoney(income),
      expensesUsd: toMoney(expenses),
      netUsd: toMoney(income.minus(expenses)),
    }
  })

  let cumulative = new Prisma.Decimal(0)
  const savingsTrend: SavingsPoint[] = incomeVsExpenses.map((row) => {
    const periodNet = new Prisma.Decimal(row.netUsd)
    cumulative = cumulative.plus(periodNet)
    return {
      period: row.period,
      label: row.label,
      periodNetUsd: row.netUsd,
      cumulativeNetUsd: toMoney(cumulative),
    }
  })

  const currencies = new Set([
    ...currencyIncome.keys(),
    ...currencyExpense.keys(),
  ])
  const byCurrency: CurrencyBreakdownRow[] = [...currencies]
    .sort()
    .map((code) => {
      const income = currencyIncome.get(code) ?? new Prisma.Decimal(0)
      const expenses = currencyExpense.get(code) ?? new Prisma.Decimal(0)
      return {
        currency: code,
        income: toMoney(income),
        expenses: toMoney(expenses),
        net: toMoney(income.minus(expenses)),
      }
    })

  const largestIncome = transactions
    .filter((t) => t.type === "INCOME")
    .slice()
    .sort((a, b) => b.baseAmountUsd.comparedTo(a.baseAmountUsd))
    .slice(0, 8)
    .map(
      (t): LargestEntry => ({
        id: t.id,
        description: t.description,
        counterparty: t.counterparty,
        amount: t.amount.toString(),
        currency: t.currency,
        amountUsd: toMoney(t.baseAmountUsd),
        transactionDate: t.transactionDate.toISOString(),
        accountName: t.account.name,
      })
    )

  const largestExpenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .slice()
    .sort((a, b) => b.baseAmountUsd.comparedTo(a.baseAmountUsd))
    .slice(0, 8)
    .map(
      (t): LargestEntry => ({
        id: t.id,
        description: t.description,
        counterparty: t.counterparty,
        amount: t.amount.toString(),
        currency: t.currency,
        amountUsd: toMoney(t.baseAmountUsd),
        transactionDate: t.transactionDate.toISOString(),
        accountName: t.account.name,
      })
    )

  return {
    range: {
      preset,
      from: from.toISOString(),
      to: to.toISOString(),
      bucket,
      dayCount: days,
    },
    summary: {
      totalIncomeUsd: toMoney(totalIncomeUsd),
      totalExpensesUsd: toMoney(totalExpensesUsd),
      netCashFlowUsd: toMoney(netCashFlowUsd),
      savingsRate,
      transactionCount: transactions.length,
      averageDailyIncomeUsd: toMoney(totalIncomeUsd.div(days)),
      averageDailySpendingUsd: toMoney(totalExpensesUsd.div(days)),
    },
    byCurrency,
    incomeVsExpenses,
    netCashFlow: incomeVsExpenses.map((row) => ({
      period: row.period,
      label: row.label,
      netUsd: row.netUsd,
    })),
    spendingByCategory: mapToNamedAmounts(spendByCategory),
    incomeByCategory: mapToNamedAmounts(incomeByCategory),
    spendingByAccount: mapToNamedAmounts(spendByAccount),
    incomeByAccount: mapToNamedAmounts(incomeByAccount),
    monthlyComparison,
    savingsTrend,
    topExpenseCategories: mapToNamedAmounts(spendByCategory, 8),
    largestIncome,
    largestExpenses,
    periodBreakdown: incomeVsExpenses,
    hasData: transactions.length > 0,
  }
}

export async function listAnalyticsCategories(userId: string) {
  const categories = await prisma.category.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, name: true, kind: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  })
  return {
    income: categories.filter((c) => c.kind === "INCOME"),
    expense: categories.filter((c) => c.kind === "EXPENSE"),
  }
}
