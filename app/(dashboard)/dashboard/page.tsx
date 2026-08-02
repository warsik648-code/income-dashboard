import { redirect } from "next/navigation"

import { DashboardView } from "@/components/dashboard/dashboard-view"
import { auth } from "@/auth"
import { listSelectableAccounts } from "@/lib/services/accounts"
import { ensureExpenseCategories } from "@/lib/services/categories"
import { getDashboard } from "@/lib/services/dashboard"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  const [accounts, categories, data] = await Promise.all([
    listSelectableAccounts(userId),
    ensureExpenseCategories(userId),
    getDashboard(userId),
  ])

  return (
    <DashboardView
      data={data}
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        type: account.type,
        cachedBalance: account.cachedBalance.toString(),
      }))}
      expenseCategories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
    />
  )
}
