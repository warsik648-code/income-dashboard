import { redirect } from "next/navigation"

import { ExpensesView } from "@/components/expenses/expenses-view"
import { auth } from "@/auth"
import {
  frequentCategoryIds,
  orderExpenseCategories,
} from "@/lib/expenses/category-order"
import { listSelectableAccounts } from "@/lib/services/accounts"
import { ensureExpenseCategories } from "@/lib/services/categories"
import { listExpenses } from "@/lib/services/expenses"
import { expenseFiltersSchema } from "@/lib/validations/expenses"

type ExpensesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const raw = await searchParams
  const flat: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(raw)) {
    flat[key] = Array.isArray(value) ? value[0] : value
  }
  const filters = expenseFiltersSchema.parse({
    accountId: flat.accountId || undefined,
    categoryId: flat.categoryId || undefined,
    paymentMethod: flat.paymentMethod || undefined,
    currency: flat.currency || undefined,
    from: flat.from || undefined,
    to: flat.to || undefined,
    deleted: flat.deleted === "1" ? "1" : undefined,
  })

  const [accounts, categories, entries] = await Promise.all([
    listSelectableAccounts(session.user.id),
    ensureExpenseCategories(session.user.id),
    listExpenses(session.user.id, filters),
  ])

  const recentCategoryIds = entries
    .map((entry) => entry.categoryId)
    .filter((id): id is string => Boolean(id))
  const orderedCategories = orderExpenseCategories(
    categories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
    recentCategoryIds
  )

  return (
    <ExpensesView
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        cachedBalance: account.cachedBalance.toString(),
      }))}
      categories={orderedCategories}
      frequentCategoryIds={frequentCategoryIds(recentCategoryIds)}
      entries={entries}
      filters={filters}
    />
  )
}
