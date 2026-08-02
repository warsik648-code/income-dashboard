import { ArrowDownLeft } from "lucide-react"

import { SectionPage } from "@/components/layout/section-page"

export default function IncomePage() {
  return (
    <SectionPage
      title="Income"
      description="Record and review money received across TRUST, Binance, Bank, Cash, and other accounts."
      icon={ArrowDownLeft}
      emptyTitle="No income entries yet"
      emptyDescription="Income forms will connect here later. Your ledger stays empty until you add real entries."
    />
  )
}
