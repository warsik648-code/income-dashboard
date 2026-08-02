"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartCard } from "@/components/analytics/chart-card"
import {
  CHART_COLORS,
  formatUsd,
  toChartNumber,
} from "@/components/analytics/format"

export function DashboardChart({
  data,
}: {
  data: Array<{
    label: string
    incomeUsd: string
    expensesUsd: string
  }>
}) {
  const chartData = data.map((row) => ({
    label: row.label,
    income: toChartNumber(row.incomeUsd),
    expenses: toChartNumber(row.expensesUsd),
  }))
  const hasData = chartData.some(
    (row) => row.income !== 0 || row.expenses !== 0
  )

  return (
    <ChartCard
      title="Income vs expenses · last 30 days"
      description="Combined using frozen USD snapshots"
      isEmpty={!hasData}
      empty="No income or expenses in the last 30 days."
    >
      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => formatUsd(value as number)}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill={CHART_COLORS.expense}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
