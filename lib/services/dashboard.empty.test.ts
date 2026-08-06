import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Dashboard must succeed when the user has no financial rows.
 * Pool saturation / parallel analytics are covered by the service shaping
 * empty analytics results rather than throwing.
 */
describe("getDashboard empty financial tables", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns zeroed summary and empty lists without throwing", async () => {
    const emptyAnalytics = {
      summary: {
        totalIncomeUsd: "0",
        totalExpensesUsd: "0",
        netCashFlowUsd: "0",
        savingsRate: null,
        transactionCount: 0,
        averageDailyIncomeUsd: "0",
        averageDailySpendingUsd: "0",
      },
      incomeVsExpenses: Array.from({ length: 3 }, (_, i) => ({
        period: `2026-08-0${i + 1}`,
        label: `Aug ${i + 1}`,
        incomeUsd: "0",
        expensesUsd: "0",
        netUsd: "0",
      })),
      hasData: false,
    }

    vi.doMock("@/lib/db", () => ({
      prisma: {
        transaction: {
          findMany: vi.fn(async () => []),
        },
        transfer: {
          findMany: vi.fn(async () => []),
        },
      },
    }))
    vi.doMock("@/lib/services/accounts", () => ({
      listAccounts: vi.fn(async () => []),
    }))
    vi.doMock("@/lib/services/subscriptions", () => ({
      listSubscriptions: vi.fn(async () => []),
      summarizeSubscriptions: () => ({
        activeCount: 0,
        dueCount: 0,
        due: [],
        upcoming: [],
        monthlyByCurrency: [],
      }),
    }))
    vi.doMock("@/lib/services/debts", () => ({
      listDebts: vi.fn(async () => []),
      summarizeDebts: () => ({
        owedToMeByCurrency: [],
        iOweByCurrency: [],
      }),
    }))
    vi.doMock("@/lib/services/analytics", () => ({
      getAnalytics: vi.fn(async () => emptyAnalytics),
    }))

    const { getDashboard } = await import("@/lib/services/dashboard")
    const result = await getDashboard("user_empty")

    expect(result.summary.totalBalanceUsd).toBeNull()
    expect(result.summary.incomeTodayUsd).toBe("0")
    expect(result.summary.expensesTodayUsd).toBe("0")
    expect(result.summary.netThisMonthUsd).toBe("0")
    expect(result.accounts).toEqual([])
    expect(result.recentActivity).toEqual([])
    expect(result.subscriptions.dueCount).toBe(0)
    expect(result.debts.activePreview).toEqual([])
    expect(result.chart30d.length).toBe(3)
  })
})
