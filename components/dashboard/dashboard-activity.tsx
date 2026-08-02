import Link from "next/link"
import { ArrowLeftRight } from "lucide-react"

import { formatAmount, formatUsd } from "@/components/analytics/format"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardActivityItem } from "@/lib/services/dashboard"

export function DashboardActivity({
  items,
}: {
  items: DashboardActivityItem[]
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg tracking-tight">
            Recent activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Latest income, expenses, and transfers. Opening balances are
            excluded.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            href="/dashboard/income"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Income
          </Link>
          <Link
            href="/dashboard/expenses"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Expenses
          </Link>
          <Link
            href="/dashboard/transfers"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Transfers
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No recent activity"
          description="Record income or expenses to see them here."
        />
      ) : (
        <Card className="border-border/70 bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base tracking-tight">
              Latest transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 border-t border-border/50 pt-3 first:border-t-0 first:pt-0"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={
                        item.type === "INCOME"
                          ? "secondary"
                          : item.type === "TRANSFER"
                            ? "outline"
                            : "outline"
                      }
                    >
                      {item.type === "TRANSFER" ? "TRANSFER" : item.type}
                    </Badge>
                    <span className="truncate text-sm font-medium">
                      {item.description}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.accountName} ·{" "}
                    {new Date(item.transactionDate).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm tabular-nums">
                    {item.type === "EXPENSE" ? "−" : "+"}
                    {formatAmount(item.amount, item.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatUsd(item.amountUsd)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
