import { formatUsd } from "@/components/analytics/format"
import type { AnalyticsSummary as Summary } from "@/lib/services/analytics"

export function AnalyticsSummaryCards({ summary }: { summary: Summary }) {
  const items = [
    { label: "Total income", value: formatUsd(summary.totalIncomeUsd) },
    { label: "Total expenses", value: formatUsd(summary.totalExpensesUsd) },
    { label: "Net cash flow", value: formatUsd(summary.netCashFlowUsd) },
    {
      label: "Savings rate",
      value:
        summary.savingsRate == null ? "—" : `${summary.savingsRate}%`,
    },
    {
      label: "Transactions",
      value: String(summary.transactionCount),
    },
    {
      label: "Avg daily income",
      value: formatUsd(summary.averageDailyIncomeUsd),
    },
    {
      label: "Avg daily spending",
      value: formatUsd(summary.averageDailySpendingUsd),
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {items.map((item) => (
        <div
          key={item.label}
          className="space-y-1 rounded-xl border border-border/70 bg-card/40 p-3"
        >
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="font-mono text-sm tabular-nums tracking-tight">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
