import { DashboardAccounts } from "@/components/dashboard/dashboard-accounts"
import { DashboardActivity } from "@/components/dashboard/dashboard-activity"
import { DashboardChart } from "@/components/dashboard/dashboard-chart"
import { DashboardDebts } from "@/components/dashboard/dashboard-debts"
import {
  DashboardQuickActions,
  type DashboardAccountOption,
} from "@/components/dashboard/dashboard-quick-actions"
import { DashboardSubscriptions } from "@/components/dashboard/dashboard-subscriptions"
import { DashboardSummary } from "@/components/dashboard/dashboard-summary"
import { PageHeader } from "@/components/layout/page-header"
import type { DashboardResult } from "@/lib/services/dashboard"

type CategoryOption = {
  id: string
  name: string
}

export function DashboardView({
  data,
  accounts,
  expenseCategories,
}: {
  data: DashboardResult
  accounts: DashboardAccountOption[]
  expenseCategories: CategoryOption[]
}) {
  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Dashboard"
          description="Private overview of balances, cash flow, renewals, and recent activity — real data only."
        />
        <DashboardQuickActions
          accounts={accounts}
          expenseCategories={expenseCategories}
        />
      </div>

      <DashboardSummary summary={data.summary} />
      <DashboardAccounts accounts={data.accounts} />
      <DashboardChart data={data.chart30d} />

      <div className="grid gap-10 xl:grid-cols-[1.4fr_1fr]">
        <DashboardActivity items={data.recentActivity} />
        <div className="space-y-10">
          <DashboardSubscriptions data={data.subscriptions} />
          <DashboardDebts data={data.debts} />
        </div>
      </div>
    </section>
  )
}
