import { ArrowUpRight } from "lucide-react"

import { SectionPage } from "@/components/layout/section-page"

export default function ExpensesPage() {
  return (
    <SectionPage
      title="Expenses"
      description="Track spending by category, merchant, payment method, and account."
      icon={ArrowUpRight}
      emptyTitle="No expenses yet"
      emptyDescription="Expense forms will connect here later. Nothing is fabricated for preview."
    />
  )
}
