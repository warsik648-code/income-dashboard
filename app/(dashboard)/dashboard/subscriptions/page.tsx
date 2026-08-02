import { Repeat } from "lucide-react"

import { SectionPage } from "@/components/layout/section-page"

export default function SubscriptionsPage() {
  return (
    <SectionPage
      title="Subscriptions"
      description="Manage recurring payments, due renewals, and confirmed payment history."
      icon={Repeat}
      emptyTitle="No subscriptions yet"
      emptyDescription="Add ChatGPT, Cursor, ExpressVPN, Netflix, and custom subscriptions in a later step. Renewals will never create expenses until you confirm payment."
    />
  )
}
