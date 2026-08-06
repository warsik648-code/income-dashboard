"use client"

import { formatAmount, formatUsd } from "@/components/analytics/format"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AnalyticsResult } from "@/lib/services/analytics"
import { SensitiveValue } from "@/components/streamer-mode"

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>
  )
}

export function AnalyticsTables({ data }: { data: AnalyticsResult }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="border-border/70 bg-card/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">
            Highest expense categories
          </CardTitle>
          <CardDescription>Ranked by USD snapshot</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topExpenseCategories.length === 0 ? (
            <EmptyRow label="No expenses in this range." />
          ) : (
            <ul className="space-y-2">
              {data.topExpenseCategories.map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate text-foreground">{row.name}</span>
                  <SensitiveValue className="shrink-0 font-mono tabular-nums">
                    {formatUsd(row.amountUsd)}
                  </SensitiveValue>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">
            Original-currency totals
          </CardTitle>
          <CardDescription>
            Never mixed across currencies — USD charts stay separate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.byCurrency.length === 0 ? (
            <EmptyRow label="No currency activity in this range." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Currency</th>
                    <th className="pb-2 font-medium">Income</th>
                    <th className="pb-2 font-medium">Expenses</th>
                    <th className="pb-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCurrency.map((row) => (
                    <tr key={row.currency} className="border-t border-border/50">
                      <td className="py-2 font-medium">{row.currency}</td>
                      <td className="py-2 font-mono tabular-nums">
                        <SensitiveValue>{formatAmount(row.income, row.currency)}</SensitiveValue>
                      </td>
                      <td className="py-2 font-mono tabular-nums">
                        <SensitiveValue>{formatAmount(row.expenses, row.currency)}</SensitiveValue>
                      </td>
                      <td className="py-2 font-mono tabular-nums">
                        <SensitiveValue>{formatAmount(row.net, row.currency)}</SensitiveValue>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">
            Largest income entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.largestIncome.length === 0 ? (
            <EmptyRow label="No income in this range." />
          ) : (
            <ul className="space-y-3">
              {data.largestIncome.map((row) => (
                <li key={row.id} className="space-y-0.5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="truncate font-medium">{row.description}</span>
                    <SensitiveValue className="shrink-0 font-mono tabular-nums">
                      {formatAmount(row.amount, row.currency)}
                    </SensitiveValue>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.accountName} · ≈ <SensitiveValue>{formatUsd(row.amountUsd)}</SensitiveValue> ·{" "}
                    {new Date(row.transactionDate).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">
            Largest expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.largestExpenses.length === 0 ? (
            <EmptyRow label="No expenses in this range." />
          ) : (
            <ul className="space-y-3">
              {data.largestExpenses.map((row) => (
                <li key={row.id} className="space-y-0.5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="truncate font-medium">{row.description}</span>
                    <SensitiveValue className="shrink-0 font-mono tabular-nums">
                      {formatAmount(row.amount, row.currency)}
                    </SensitiveValue>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.accountName} · ≈ <SensitiveValue>{formatUsd(row.amountUsd)}</SensitiveValue> ·{" "}
                    {new Date(row.transactionDate).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70 shadow-none xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">
            {data.range.bucket === "day" ? "Daily" : "Monthly"} breakdown
          </CardTitle>
          <CardDescription>
            Bucketed by {data.range.bucket} · values in USD
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data.hasData ? (
            <EmptyRow label="No transactions to break down." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Period</th>
                    <th className="pb-2 font-medium">Income</th>
                    <th className="pb-2 font-medium">Expenses</th>
                    <th className="pb-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periodBreakdown.map((row) => (
                    <tr key={row.period} className="border-t border-border/50">
                      <td className="py-2">{row.label}</td>
                      <td className="py-2 font-mono tabular-nums">
                        <SensitiveValue>{formatUsd(row.incomeUsd)}</SensitiveValue>
                      </td>
                      <td className="py-2 font-mono tabular-nums">
                        <SensitiveValue>{formatUsd(row.expensesUsd)}</SensitiveValue>
                      </td>
                      <td className="py-2 font-mono tabular-nums">
                        <SensitiveValue>{formatUsd(row.netUsd)}</SensitiveValue>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
