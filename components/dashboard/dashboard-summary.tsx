import { formatAmount, formatUsd } from "@/components/analytics/format"
import type { DashboardResult } from "@/lib/services/dashboard"

function CurrencyLines({
  rows,
  empty,
}: {
  rows: Array<{ currency: string; amount: string }>
  empty: string
}) {
  if (rows.length === 0) {
    return <p className="font-mono text-sm tabular-nums">{empty}</p>
  }
  return (
    <div className="space-y-0.5">
      {rows.map((row) => (
        <p
          key={row.currency}
          className="font-mono text-sm tabular-nums tracking-tight"
        >
          {formatAmount(row.amount, row.currency)}
        </p>
      ))}
    </div>
  )
}

export function DashboardSummary({
  summary,
}: {
  summary: DashboardResult["summary"]
}) {
  const cards = [
    {
      label: "Total balance (USD)",
      body:
        summary.totalBalanceUsd == null
          ? "—"
          : formatUsd(summary.totalBalanceUsd),
      note: summary.balanceCoverageNote,
    },
    {
      label: "Income today",
      body: formatUsd(summary.incomeTodayUsd),
      note: "USD snapshot",
    },
    {
      label: "Expenses today",
      body: formatUsd(summary.expensesTodayUsd),
      note: "USD snapshot",
    },
    {
      label: "Net this month",
      body: formatUsd(summary.netThisMonthUsd),
      note: "USD cash flow",
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="space-y-1 rounded-xl border border-border/70 bg-card/40 p-4"
        >
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className="font-mono text-lg tabular-nums tracking-tight">
            {card.body}
          </p>
          {card.note ? (
            <p className="text-xs text-muted-foreground">{card.note}</p>
          ) : null}
        </div>
      ))}

      <div className="space-y-1 rounded-xl border border-border/70 bg-card/40 p-4">
        <p className="text-xs text-muted-foreground">Owed to me</p>
        <CurrencyLines rows={summary.owedToMeByCurrency} empty="0" />
        <p className="text-xs text-muted-foreground">
          Original currencies · not mixed
        </p>
      </div>

      <div className="space-y-1 rounded-xl border border-border/70 bg-card/40 p-4">
        <p className="text-xs text-muted-foreground">I owe</p>
        <CurrencyLines rows={summary.iOweByCurrency} empty="0" />
        <p className="text-xs text-muted-foreground">
          Original currencies · not mixed
        </p>
      </div>
    </div>
  )
}
