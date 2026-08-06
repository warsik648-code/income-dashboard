import Link from "next/link"
import { Repeat } from "lucide-react"
import { SensitiveValue } from "@/components/streamer-mode"

import { formatAmount } from "@/components/analytics/format"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardResult } from "@/lib/services/dashboard"
import { formatAppCalendarDate } from "@/lib/time"

function formatDate(value: string) {
  return formatAppCalendarDate(value, {
    month: "short",
    day: "numeric",
  })
}

export function DashboardSubscriptions({
  data,
}: {
  data: DashboardResult["subscriptions"]
}) {
  const hasAny =
    data.due.length > 0 ||
    data.upcoming.length > 0 ||
    data.monthlyByCurrency.length > 0

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg tracking-tight">
            Subscriptions
          </h2>
          <p className="text-sm text-muted-foreground">
            Due and upcoming renewals. Payments are never confirmed automatically.
          </p>
        </div>
        <Link
          href="/dashboard/subscriptions"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Manage
        </Link>
      </div>

      {!hasAny ? (
        <EmptyState
          icon={Repeat}
          title="No active subscriptions"
          description="Add recurring services when you need them."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="border-border/70 bg-card/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base tracking-tight">
                Due ({data.dueCount})
              </CardTitle>
              <CardDescription>Confirm paid from Subscriptions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.due.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due.</p>
              ) : (
                data.due.map((item) => (
                  <div key={item.id} className="text-sm">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="destructive">Due</Badge>
                      <span className="truncate">{item.name}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                      <SensitiveValue>{formatAmount(item.price, item.currency)}</SensitiveValue> ·{" "}
                      {formatDate(item.nextRenewalDate)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base tracking-tight">
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming renewals.
                </p>
              ) : (
                data.upcoming.map((item) => (
                  <div key={item.id} className="text-sm">
                    <p className="truncate">{item.name}</p>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                      <SensitiveValue>{formatAmount(item.price, item.currency)}</SensitiveValue> ·{" "}
                      {formatDate(item.nextRenewalDate)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base tracking-tight">
                Monthly equivalent
              </CardTitle>
              <CardDescription>Grouped by currency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.monthlyByCurrency.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                data.monthlyByCurrency.map((row) => (
                  <p
                    key={row.currency}
                    className="font-mono text-sm tabular-nums"
                  >
                    <SensitiveValue>{formatAmount(row.amount, row.currency)}</SensitiveValue>
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  )
}
