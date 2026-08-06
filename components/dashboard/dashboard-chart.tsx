"use client"

import { useCallback } from "react"
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
import {
  STREAMER_CHART_TICK_STYLE,
  SensitiveChart,
  useStreamerAxisTickFormatter,
  useStreamerTooltipFormatter,
} from "@/components/streamer-mode"

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
  const axisTickFormatter = useStreamerAxisTickFormatter()
  const formatUsdStable = useCallback(
    (value: number | string) => formatUsd(value),
    []
  )
  const tooltipFormat = useStreamerTooltipFormatter(formatUsdStable)

  return (
    <ChartCard
      title="Income vs expenses · last 30 days"
      description="Combined using frozen USD snapshots"
      isEmpty={!hasData}
      empty="No income or expenses in the last 30 days."
    >
      <div className="h-72 w-full min-w-0">
        <SensitiveChart>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={STREAMER_CHART_TICK_STYLE}
              />
              <YAxis
                tick={STREAMER_CHART_TICK_STYLE}
                tickFormatter={axisTickFormatter}
              />
              <Tooltip
                formatter={(value) => tooltipFormat(value as number)}
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
        </SensitiveChart>
      </div>
    </ChartCard>
  )
}
