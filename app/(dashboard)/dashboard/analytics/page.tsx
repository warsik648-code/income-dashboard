import { ChartColumn } from "lucide-react"

import { SectionPage } from "@/components/layout/section-page"

export default function AnalyticsPage() {
  return (
    <SectionPage
      title="Analytics"
      description="Cash-flow trends, category breakdowns, and savings over time in USD and original currencies."
      icon={ChartColumn}
      emptyTitle="Analytics unavailable"
      emptyDescription="Charts will render from real transactions only. There is no placeholder financial data."
    />
  )
}
