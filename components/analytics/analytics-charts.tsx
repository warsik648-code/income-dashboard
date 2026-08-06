"use client"

import { useCallback } from "react"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartCard } from "@/components/analytics/chart-card"
import {
  STREAMER_CHART_TICK_STYLE,
  SensitiveChart,
  useStreamerAxisTickFormatter,
  useStreamerTooltipFormatter,
} from "@/components/streamer-mode"
import {
  CATEGORY_PALETTE,
  CHART_COLORS,
  formatUsd,
  toChartNumber,
} from "@/components/analytics/format"
import type { AnalyticsResult } from "@/lib/services/analytics"

export function AnalyticsCharts({ data }: { data: AnalyticsResult }) {
  const axisTickFormatter = useStreamerAxisTickFormatter()
  const formatUsdStable = useCallback(
    (value: number | string) => formatUsd(value),
    []
  )
  const tooltipUsd = useStreamerTooltipFormatter(formatUsdStable)

  const flowData = data.incomeVsExpenses.map((row) => ({
    label: row.label,
    income: toChartNumber(row.incomeUsd),
    expenses: toChartNumber(row.expensesUsd),
    net: toChartNumber(row.netUsd),
  }))

  const hasFlow = data.hasData
  const spendCat = data.spendingByCategory.map((row) => ({
    name: row.name,
    value: toChartNumber(row.amountUsd),
  }))
  const incomeCat = data.incomeByCategory.map((row) => ({
    name: row.name,
    value: toChartNumber(row.amountUsd),
  }))
  const spendAcct = data.spendingByAccount.map((row) => ({
    name: row.name,
    value: toChartNumber(row.amountUsd),
  }))
  const incomeAcct = data.incomeByAccount.map((row) => ({
    name: row.name,
    value: toChartNumber(row.amountUsd),
  }))
  const monthly = data.monthlyComparison.map((row) => ({
    label: row.label,
    income: toChartNumber(row.incomeUsd),
    expenses: toChartNumber(row.expensesUsd),
  }))
  const savings = data.savingsTrend.map((row) => ({
    label: row.label,
    cumulative: toChartNumber(row.cumulativeNetUsd),
    period: toChartNumber(row.periodNetUsd),
  }))

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Income vs expenses"
        description="USD over the selected range"
        isEmpty={!hasFlow}
      >
        <div className="h-64 w-full min-w-0">
          <SensitiveChart>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flowData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={STREAMER_CHART_TICK_STYLE} tickFormatter={axisTickFormatter} />
              <Tooltip
                formatter={(value) => tooltipUsd(value as number)}
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

      <ChartCard
        title="Net cash flow"
        description="Income minus expenses in USD"
        isEmpty={!hasFlow}
      >
        <div className="h-64 w-full min-w-0">
          <SensitiveChart>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={flowData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={STREAMER_CHART_TICK_STYLE} tickFormatter={axisTickFormatter} />
              <Tooltip
                formatter={(value) => tooltipUsd(value as number)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net"
                stroke={CHART_COLORS.net}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          </SensitiveChart>
        </div>
      </ChartCard>

      <ChartCard
        title="Spending by category"
        description="USD share of expenses"
        isEmpty={spendCat.length === 0}
      >
        <div className="h-64 w-full min-w-0">
          <SensitiveChart>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={spendCat}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {spendCat.map((_, index) => (
                  <Cell
                    key={index}
                    fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => tooltipUsd(value as number)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          </SensitiveChart>
        </div>
      </ChartCard>

      <ChartCard
        title="Income by category / source"
        description="Category when set, otherwise counterparty"
        isEmpty={incomeCat.length === 0}
      >
        <div className="h-64 w-full min-w-0">
          <SensitiveChart>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={incomeCat}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {incomeCat.map((_, index) => (
                  <Cell
                    key={index}
                    fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => tooltipUsd(value as number)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          </SensitiveChart>
        </div>
      </ChartCard>

      <ChartCard
        title="Spending by account"
        description="USD expenses by wallet"
        isEmpty={spendAcct.length === 0}
      >
        <div className="h-64 w-full min-w-0">
          <SensitiveChart>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendAcct} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" tick={STREAMER_CHART_TICK_STYLE} tickFormatter={axisTickFormatter} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                formatter={(value) => tooltipUsd(value as number)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" name="Spent" fill={CHART_COLORS.expense} />
            </BarChart>
          </ResponsiveContainer>
          </SensitiveChart>
        </div>
      </ChartCard>

      <ChartCard
        title="Income by account"
        description="USD income by wallet"
        isEmpty={incomeAcct.length === 0}
      >
        <div className="h-64 w-full min-w-0">
          <SensitiveChart>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeAcct} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" tick={STREAMER_CHART_TICK_STYLE} tickFormatter={axisTickFormatter} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                formatter={(value) => tooltipUsd(value as number)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" name="Income" fill={CHART_COLORS.income} />
            </BarChart>
          </ResponsiveContainer>
          </SensitiveChart>
        </div>
      </ChartCard>

      <ChartCard
        title="Monthly income & expense"
        description="Month buckets in USD"
        isEmpty={monthly.every((m) => m.income === 0 && m.expenses === 0)}
      >
        <div className="h-64 w-full min-w-0">
          <SensitiveChart>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={STREAMER_CHART_TICK_STYLE} tickFormatter={axisTickFormatter} />
              <Tooltip
                formatter={(value) => tooltipUsd(value as number)}
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

      <ChartCard
        title="Savings trend"
        description="Cumulative net cash flow in USD"
        isEmpty={!hasFlow}
      >
        <div className="h-64 w-full min-w-0">
          <SensitiveChart>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={savings}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={STREAMER_CHART_TICK_STYLE} tickFormatter={axisTickFormatter} />
              <Tooltip
                formatter={(value) => tooltipUsd(value as number)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative net"
                stroke={CHART_COLORS.accent}
                fill={CHART_COLORS.accent}
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
          </SensitiveChart>
        </div>
      </ChartCard>
    </div>
  )
}
