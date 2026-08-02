import { ArrowLeftRight } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { TransferForm } from "@/components/transfers/transfer-form"
import type { TransferAccountOption } from "@/components/transfers/transfer-form"
import { TransferRow } from "@/components/transfers/transfer-row"
import { Button } from "@/components/ui/button"
import type { TransferListItem } from "@/lib/services/transfers"

export function TransfersView({
  accounts,
  entries,
}: {
  accounts: TransferAccountOption[]
  entries: TransferListItem[]
}) {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Transfers"
          description="Move money between your own accounts. Principal is never counted as income or expense — only an optional separate transfer fee is."
        />
        <Button variant="outline" render={<Link href="/dashboard/income" />}>
          Back to Income
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/40 p-4 sm:p-6">
        <h2 className="text-base font-medium tracking-tight">Transfer Funds</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose source and destination, enter what you sent and what actually
          arrived, then complete.
        </p>
        <div className="mt-4">
          <TransferForm accounts={accounts} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-medium tracking-tight">Transfer history</h2>
        {entries.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transfers yet"
            description="Completed moves between Binance, TRUST, Ziraat, TL, Nayapay, and Cash will appear here."
          />
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => (
              <TransferRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
