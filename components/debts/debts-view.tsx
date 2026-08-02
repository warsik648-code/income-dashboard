import { HandCoins } from "lucide-react"

import { CreateDebtDialog } from "@/components/debts/create-debt-dialog"
import { DebtFilters } from "@/components/debts/debt-filters"
import type { DebtAccountOption } from "@/components/debts/debt-form-fields"
import { DebtRow, type DebtRowData } from "@/components/debts/debt-row"
import { DebtSummary } from "@/components/debts/debt-summary"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"

type DebtsViewProps = {
  accounts: DebtAccountOption[]
  entries: DebtRowData[]
  summary: {
    openCount: number
    owedToMeByCurrency: Array<{ currency: string; amount: string }>
    iOweByCurrency: Array<{ currency: string; amount: string }>
  }
  filters: {
    direction?: string
    status?: string
    currency?: string
    deleted?: string
  }
  currencies: string[]
}

export function DebtsView({
  accounts,
  entries,
  summary,
  filters,
  currencies,
}: DebtsViewProps) {
  const showDeleted = filters.deleted === "1"

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Debts"
          description="Simple tracking for money you lent or still owe — payments and optional account impact only."
        />
        <CreateDebtDialog accounts={accounts} />
      </div>

      {!showDeleted ? <DebtSummary {...summary} /> : null}

      <DebtFilters currencies={currencies} values={filters} />

      {entries.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={showDeleted ? "No archived debts" : "No debts recorded"}
          description={
            showDeleted
              ? "Soft-deleted debts appear here for restore. Payment history stays intact."
              : "Add a rare personal debt when needed. No interest, schedules, or contracts."
          }
        />
      ) : (
        <div className="grid gap-4">
          {entries.map((entry) => (
            <DebtRow
              key={entry.id}
              accounts={accounts}
              entry={entry}
              showDeleted={showDeleted}
            />
          ))}
        </div>
      )}
    </section>
  )
}
