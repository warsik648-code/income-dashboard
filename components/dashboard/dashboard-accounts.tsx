import Link from "next/link"
import { Wallet } from "lucide-react"

import { formatAccountType } from "@/components/accounts/account-constants"
import { formatAmount, formatUsd } from "@/components/analytics/format"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardAccountCard } from "@/lib/services/dashboard"

export function DashboardAccounts({
  accounts,
}: {
  accounts: DashboardAccountCard[]
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg tracking-tight">Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Balances stay in original currency. USD is shown only when a rate is
            known.
          </p>
        </div>
        <Link
          href="/dashboard/accounts"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View all
        </Link>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Create a bank, cash, or wallet account in USD, PKR, or TRY."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="border-border/70 bg-card/70 shadow-none"
            >
              <CardHeader className="gap-2 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-base tracking-tight">
                      {account.name}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">
                        {formatAccountType(account.type)}
                      </Badge>
                      <Badge variant="outline">{account.currency}</Badge>
                    </CardDescription>
                  </div>
                  <p className="shrink-0 font-mono text-sm tabular-nums">
                    {formatAmount(account.balance, account.currency)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {account.institution ? (
                  <p>
                    {account.institution}
                  </p>
                ) : null}
                <p>
                  {account.balanceUsd != null
                    ? `≈ ${formatUsd(account.balanceUsd)} USD`
                    : "USD equivalent unavailable"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
