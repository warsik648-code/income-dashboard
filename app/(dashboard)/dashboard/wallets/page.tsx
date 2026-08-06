import { redirect } from "next/navigation"

import { WalletsView } from "@/components/wallets/wallets-view"
import { auth } from "@/auth"
import { getWalletDashboard } from "@/lib/services/wallet-integrations"

export default async function WalletsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const dashboard = await getWalletDashboard(session.user.id)

  return <WalletsView dashboard={dashboard} />
}
