import { redirect } from "next/navigation"

import { AnalyticsView } from "@/components/analytics/analytics-view"
import { auth } from "@/auth"
import { listSelectableAccounts } from "@/lib/services/accounts"
import {
  getAnalytics,
  listAnalyticsCategories,
} from "@/lib/services/analytics"
import { ensureExpenseCategories } from "@/lib/services/categories"
import { analyticsFiltersSchema } from "@/lib/validations/analytics"

type AnalyticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const raw = await searchParams
  const flat: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(raw)) {
    flat[key] = Array.isArray(value) ? value[0] : value
  }

  const parsed = analyticsFiltersSchema.safeParse({
    preset: flat.preset || "this_month",
    from: flat.from || undefined,
    to: flat.to || undefined,
    accountId: flat.accountId || undefined,
    currency: flat.currency || undefined,
    incomeCategoryId: flat.incomeCategoryId || undefined,
    expenseCategoryId: flat.expenseCategoryId || undefined,
  })

  const filters = parsed.success
    ? parsed.data
    : analyticsFiltersSchema.parse({ preset: "this_month" })

  await ensureExpenseCategories(session.user.id)

  const [accounts, categories, data] = await Promise.all([
    listSelectableAccounts(session.user.id),
    listAnalyticsCategories(session.user.id),
    getAnalytics(session.user.id, filters),
  ])

  return (
    <AnalyticsView
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
      }))}
      incomeCategories={categories.income}
      expenseCategories={categories.expense}
      filters={{
        preset: filters.preset,
        from: filters.from || undefined,
        to: filters.to || undefined,
        accountId: filters.accountId || undefined,
        currency: filters.currency || undefined,
        incomeCategoryId: filters.incomeCategoryId || undefined,
        expenseCategoryId: filters.expenseCategoryId || undefined,
      }}
      data={data}
    />
  )
}
