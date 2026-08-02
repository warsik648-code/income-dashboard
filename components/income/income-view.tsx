import { ArrowDownLeft } from "lucide-react"

import { CreateIncomeDialog } from "@/components/income/create-income-dialog"
import type { IncomeAccountOption } from "@/components/income/income-form-fields"
import { IncomeRow } from "@/components/income/income-row"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import type { IncomeListItem } from "@/lib/services/income"

type IncomeViewProps = {
  accounts: IncomeAccountOption[]
  entries: IncomeListItem[]
}

export function IncomeView({ accounts, entries }: IncomeViewProps) {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Income"
          description="Record money received into your accounts. Original currency is preserved; USD is stored as a frozen snapshot."
        />
        <CreateIncomeDialog accounts={accounts} />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={ArrowDownLeft}
          title="No income entries yet"
          description={
            accounts.length === 0
              ? "Create an account first, then record income here."
              : "Add your first income entry. Opening balances from Accounts are kept separate."
          }
        />
      ) : (
        <div className="grid gap-4">
          {entries.map((entry) => (
            <IncomeRow key={entry.id} accounts={accounts} entry={entry} />
          ))}
        </div>
      )}
    </section>
  )
}
