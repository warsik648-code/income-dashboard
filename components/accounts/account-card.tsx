"use client"

import { useActionState } from "react"

import {
  archiveAccountAction,
  unarchiveAccountAction,
  type AccountActionState,
} from "@/app/(dashboard)/dashboard/accounts/actions"
import {
  formatAccountType,
  formatBalance,
} from "@/components/accounts/account-constants"
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog"
import { SensitiveValue } from "@/components/streamer-mode"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AccountCardProps = {
  account: {
    id: string
    name: string
    type: string
    assetClass: string
    currency: string
    institution: string | null
    notes: string | null
    cachedBalance: { toString(): string }
    isArchived: boolean
  }
}

const initialState: AccountActionState = {}

export function AccountCard({ account }: AccountCardProps) {
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveAccountAction,
    initialState
  )
  const [restoreState, restoreAction, restorePending] = useActionState(
    unarchiveAccountAction,
    initialState
  )

  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base tracking-tight">
              {account.name}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{formatAccountType(account.type)}</Badge>
              <Badge variant="secondary">{account.assetClass}</Badge>
              <Badge variant="outline">{account.currency}</Badge>
              {account.isArchived ? (
                <Badge variant="destructive">Archived</Badge>
              ) : null}
            </CardDescription>
          </div>
          <SensitiveValue className="shrink-0 font-mono text-sm tabular-nums tracking-tight">
            {formatBalance(account.cachedBalance, account.currency)}
          </SensitiveValue>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {account.institution ? (
          <p className="text-sm text-muted-foreground">
            Institution:{" "}
            <span className="text-foreground">{account.institution}</span>
          </p>
        ) : null}
        {account.notes ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {account.notes}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {!account.isArchived ? <EditAccountDialog account={account} /> : null}

          {account.isArchived ? (
            <form action={restoreAction}>
              <input type="hidden" name="id" value={account.id} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={restorePending}
              >
                {restorePending ? "Restoring…" : "Restore"}
              </Button>
            </form>
          ) : (
            <form action={archiveAction}>
              <input type="hidden" name="id" value={account.id} />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={archivePending}
              >
                {archivePending ? "Archiving…" : "Archive"}
              </Button>
            </form>
          )}
        </div>

        {archiveState.error ? (
          <p className="text-sm text-destructive" role="alert">
            {archiveState.error}
          </p>
        ) : null}
        {restoreState.error ? (
          <p className="text-sm text-destructive" role="alert">
            {restoreState.error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
