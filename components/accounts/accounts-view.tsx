import { Wallet } from "lucide-react"

import { AccountCard } from "@/components/accounts/account-card"
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import type { AccountListItem } from "@/lib/services/accounts"

type AccountsViewProps = {
  accounts: AccountListItem[]
  showArchived: boolean
}

export function AccountsView({ accounts, showArchived }: AccountsViewProps) {
  const active = accounts.filter((a) => !a.isArchived)
  const archived = accounts.filter((a) => a.isArchived)
  const visible = showArchived ? accounts : active

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Accounts"
          description="TRUST, Binance, Bank, Cash, and other wallets — each balance stays in its original currency."
        />
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={
              showArchived
                ? "/dashboard/accounts"
                : "/dashboard/accounts?archived=1"
            }
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </a>
          <CreateAccountDialog />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={
            showArchived ? "No archived accounts" : "No accounts configured"
          }
          description={
            showArchived
              ? "Archived accounts will appear here. History is always preserved."
              : "Create Bank USD, Cash PKR, Binance, TRUST, and more. Starting balances become audited opening transactions."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}

      {!showArchived && archived.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {archived.length} archived account
          {archived.length === 1 ? "" : "s"} hidden from selectors.{" "}
          <a
            href="/dashboard/accounts?archived=1"
            className="underline-offset-4 hover:underline"
          >
            Show archived
          </a>
        </p>
      ) : null}
    </section>
  )
}
