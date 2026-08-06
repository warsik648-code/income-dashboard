import Link from "next/link"
import { SensitiveValue } from "@/components/streamer-mode"

import { formatAmount } from "@/components/analytics/format"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardResult } from "@/lib/services/dashboard"

export function DashboardDebts({
  data,
}: {
  data: DashboardResult["debts"]
}) {
  const hasSummary =
    data.owedToMeByCurrency.length > 0 || data.iOweByCurrency.length > 0

  return (
    <section className="space-y-3 opacity-90">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-base tracking-tight text-muted-foreground">
            Debts
          </h2>
          <p className="text-xs text-muted-foreground">
            Compact overview · currencies kept separate
          </p>
        </div>
        <Link
          href="/dashboard/debts"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View debts
        </Link>
      </div>

      <Card className="border-border/50 bg-card/40 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm tracking-tight">Summary</CardTitle>
          <CardDescription className="text-xs">
            {!hasSummary
              ? "No open debts."
              : "Remaining balances only"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Owed to me</p>
            {data.owedToMeByCurrency.length === 0 ? (
              <p className="font-mono text-sm tabular-nums">0</p>
            ) : (
              data.owedToMeByCurrency.map((row) => (
                <p
                  key={row.currency}
                  className="font-mono text-sm tabular-nums"
                >
                  {formatAmount(row.amount, row.currency)}
                </p>
              ))
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">I owe</p>
            {data.iOweByCurrency.length === 0 ? (
              <p className="font-mono text-sm tabular-nums">0</p>
            ) : (
              data.iOweByCurrency.map((row) => (
                <p
                  key={row.currency}
                  className="font-mono text-sm tabular-nums"
                >
                  {formatAmount(row.amount, row.currency)}
                </p>
              ))
            )}
          </div>

          {data.activePreview.length > 0 ? (
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Active</p>
              {data.activePreview.map((debt) => (
                <div
                  key={debt.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[0.6rem]">
                      {debt.direction === "LENT_OUT"
                        ? "They owe me"
                        : "I owe them"}
                    </Badge>
                    <span className="truncate">{debt.personName}</span>
                  </div>
                  <SensitiveValue className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatAmount(debt.remainingAmount, debt.currency)}
                  </SensitiveValue>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
