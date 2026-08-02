import { LayoutDashboard } from "lucide-react"

import { SectionPage } from "@/components/layout/section-page"

export default function DashboardPage() {
  return (
    <SectionPage
      title="Dashboard"
      description="Your private overview of income, spending, balances, and upcoming renewals."
      icon={LayoutDashboard}
      emptyTitle="No activity yet"
      emptyDescription="Once you start recording income and expenses, summaries and charts will appear here. No sample data is shown."
    />
  )
}
