import { redirect } from "next/navigation"

import { DashboardView } from "@/components/dashboard/dashboard-view"
import { auth } from "@/auth"
import { listExpenseCategories } from "@/lib/services/categories"
import { getDashboard } from "@/lib/services/dashboard"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  // Avoid fan-out that opens many pool connections at once (Supabase
  // session pool is small). Read categories only — do not ensure/create on
  // dashboard load. Accounts come from getDashboard.
  const data = await getDashboard(userId)
  const categories = await listExpenseCategories(userId)

  return (
    <DashboardView
      data={data}
      accounts={data.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        type: account.type,
        cachedBalance: account.balance,
      }))}
      expenseCategories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
    />
  )
}
