import { Repeat } from "lucide-react"

import { CreateSubscriptionDialog } from "@/components/subscriptions/create-subscription-dialog"
import { SubscriptionFilters } from "@/components/subscriptions/subscription-filters"
import type {
  SubscriptionAccountOption,
  SubscriptionCategoryOption,
} from "@/components/subscriptions/subscription-form-fields"
import {
  SubscriptionRow,
  type SubscriptionRowData,
} from "@/components/subscriptions/subscription-row"
import { SubscriptionSummary } from "@/components/subscriptions/subscription-summary"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"

type SubscriptionsViewProps = {
  accounts: SubscriptionAccountOption[]
  categories: SubscriptionCategoryOption[]
  entries: SubscriptionRowData[]
  summary: {
    activeCount: number
    dueCount: number
    monthlyByCurrency: Array<{ currency: string; amount: string }>
    upcoming: Array<{
      id: string
      name: string
      nextRenewalDate: string
      price: string
      currency: string
    }>
    due: Array<{
      id: string
      name: string
      nextRenewalDate: string
      price: string
      currency: string
    }>
  }
  filters: {
    status?: string
    accountId?: string
    currency?: string
    billingFrequency?: string
    deleted?: string
  }
}

export function SubscriptionsView({
  accounts,
  categories,
  entries,
  summary,
  filters,
}: SubscriptionsViewProps) {
  const currencies = [...new Set(accounts.map((a) => a.currency))].sort()
  const showDeleted = filters.deleted === "1"

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Subscriptions"
          description="Manage recurring payments, due renewals, and confirmed payment history."
        />
        <CreateSubscriptionDialog
          accounts={accounts}
          categories={categories}
        />
      </div>

      {!showDeleted ? <SubscriptionSummary {...summary} /> : null}

      <SubscriptionFilters
        accounts={accounts}
        currencies={currencies}
        values={filters}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={
            showDeleted ? "No archived subscriptions" : "No subscriptions yet"
          }
          description={
            accounts.length === 0
              ? "Create an account first, then add ChatGPT, Cursor, ExpressVPN, Netflix, and more."
              : showDeleted
                ? "Soft-deleted subscriptions appear here for restore. Linked expenses stay intact."
                : "Add your first subscription. Renewals never create expenses until you confirm payment."
          }
        />
      ) : (
        <div className="grid gap-4">
          {entries.map((entry) => (
            <SubscriptionRow
              key={entry.id}
              accounts={accounts}
              categories={categories}
              entry={entry}
              showDeleted={showDeleted}
            />
          ))}
        </div>
      )}
    </section>
  )
}
