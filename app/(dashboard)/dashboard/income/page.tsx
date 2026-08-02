import { redirect } from "next/navigation"

import { IncomeView } from "@/components/income/income-view"
import { auth } from "@/auth"
import { listSelectableAccounts } from "@/lib/services/accounts"
import { listIncome } from "@/lib/services/income"

export default async function IncomePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const [accounts, entries] = await Promise.all([
    listSelectableAccounts(session.user.id),
    listIncome(session.user.id),
  ])

  return (
    <IncomeView
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        type: account.type,
      }))}
      entries={entries}
    />
  )
}
