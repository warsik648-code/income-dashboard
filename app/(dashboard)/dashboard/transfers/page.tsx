import { requireUserId } from "@/lib/auth/session"
import { listSelectableAccounts } from "@/lib/services/accounts"
import { listTransfers } from "@/lib/services/transfers"
import { TransfersView } from "@/components/transfers/transfers-view"

export default async function TransfersPage() {
  const userId = await requireUserId()
  const [accounts, entries] = await Promise.all([
    listSelectableAccounts(userId),
    listTransfers(userId),
  ])

  return (
    <TransfersView
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        cachedBalance: account.cachedBalance.toString(),
      }))}
      entries={entries}
    />
  )
}
