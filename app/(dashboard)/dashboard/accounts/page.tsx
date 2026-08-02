import { redirect } from "next/navigation"

import { AccountsView } from "@/components/accounts/accounts-view"
import { auth } from "@/auth"
import { listAccounts } from "@/lib/services/accounts"

type AccountsPageProps = {
  searchParams: Promise<{ archived?: string }>
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const params = await searchParams
  const showArchived = params.archived === "1"
  const accounts = await listAccounts(session.user.id, {
    includeArchived: true,
  })

  return <AccountsView accounts={accounts} showArchived={showArchived} />
}
