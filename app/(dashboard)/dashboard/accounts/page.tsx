import { Wallet } from "lucide-react"

import { SectionPage } from "@/components/layout/section-page"

export default function AccountsPage() {
  return (
    <SectionPage
      title="Accounts"
      description="Balances for TRUST, Binance, Bank, Cash, and other wallets — each in its own currency."
      icon={Wallet}
      emptyTitle="No accounts configured"
      emptyDescription="Account setup and balances will appear here after you create accounts. Multi-currency totals stay separated until converted to USD."
    />
  )
}
