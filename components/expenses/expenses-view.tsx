import { ArrowLeftRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"

import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog"
import { ExpenseFilters } from "@/components/expenses/expense-filters"
import type {
  ExpenseAccountOption,
  ExpenseCategoryOption,
} from "@/components/expenses/expense-form-fields"
import { ExpenseRow } from "@/components/expenses/expense-row"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import type { ExpenseListItem } from "@/lib/services/expenses"

type ExpensesViewProps = {
  accounts: ExpenseAccountOption[]
  categories: ExpenseCategoryOption[]
  entries: ExpenseListItem[]
  filters: {
    accountId?: string
    categoryId?: string
    paymentMethod?: string
    currency?: string
    from?: string
    to?: string
    deleted?: string
  }
}

export function ExpensesView({
  accounts,
  categories,
  entries,
  filters,
}: ExpensesViewProps) {
  const showDeleted = filters.deleted === "1"

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Expenses"
          description="Track spending by category, merchant, payment method, and account. Balances update with Decimal-safe math."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            render={<Link href="/dashboard/transfers" />}
          >
            <ArrowLeftRight className="size-4" />
            Transfer Funds
          </Button>
          <CreateExpenseDialog accounts={accounts} categories={categories} />
        </div>
      </div>

      <ExpenseFilters
        accounts={accounts}
        categories={categories}
        values={filters}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={ArrowUpRight}
          title={showDeleted ? "No deleted expenses" : "No expenses yet"}
          description={
            accounts.length === 0
              ? "Create an account first, then record expenses here."
              : showDeleted
                ? "Soft-deleted expenses will appear here for restore."
                : "Add your first expense. Spending more than the balance is blocked unless you allow overdraft."
          }
        />
      ) : (
        <div className="grid gap-4">
          {entries.map((entry) => (
            <ExpenseRow
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
