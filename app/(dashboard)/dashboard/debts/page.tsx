import { HandCoins } from "lucide-react"

import { SectionPage } from "@/components/layout/section-page"

export default function DebtsPage() {
  return (
    <SectionPage
      title="Debts"
      description="Track money you lent, amounts owed to you, and obligations you still need to repay."
      icon={HandCoins}
      emptyTitle="No debts recorded"
      emptyDescription="Debt tracking and payment history will connect here later without demo records."
    />
  )
}
