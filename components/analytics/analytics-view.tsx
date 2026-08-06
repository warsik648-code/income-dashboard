import { AnalyticsCharts } from "@/components/analytics/analytics-charts"
import { AnalyticsFilters } from "@/components/analytics/analytics-filters"
import { AnalyticsSummaryCards } from "@/components/analytics/analytics-summary"
import { AnalyticsTables } from "@/components/analytics/analytics-tables"
import { PageHeader } from "@/components/layout/page-header"
import type { AnalyticsResult } from "@/lib/services/analytics"
import { formatAppDate } from "@/lib/time"

type Option = { id: string; name: string }

export function AnalyticsView({
  accounts,
  incomeCategories,
  expenseCategories,
  filters,
  data,
}: {
  accounts: Option[]
  incomeCategories: Option[]
  expenseCategories: Option[]
  filters: {
    preset?: string
    from?: string
    to?: string
    accountId?: string
    currency?: string
    incomeCategoryId?: string
    expenseCategoryId?: string
  }
  data: AnalyticsResult
}) {
  const fromLabel = formatAppDate(data.range.from)
  const toLabel = formatAppDate(data.range.to)

  return (
    <section className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Cash-flow trends, category breakdowns, and savings over time. Combined charts use frozen USD snapshots; original currencies stay separate."
      />

      <AnalyticsFilters
        accounts={accounts}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        values={filters}
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md border border-border/70 bg-card/40 px-2 py-1">
          Range {fromLabel} → {toLabel}
        </span>
        <span className="rounded-md border border-border/70 bg-card/40 px-2 py-1">
          Combined analytics in USD
        </span>
        <span className="rounded-md border border-border/70 bg-card/40 px-2 py-1">
          Bucket: {data.range.bucket}
        </span>
      </div>

      <AnalyticsSummaryCards summary={data.summary} />
      <AnalyticsCharts data={data} />
      <AnalyticsTables data={data} />
    </section>
  )
}
