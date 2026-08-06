"use client"

import { useActionState } from "react"

import {
  softDeleteIncomeAction,
  type IncomeActionState,
} from "@/app/(dashboard)/dashboard/income/actions"
import { AttachmentsPanel } from "@/components/attachments/attachments-panel"
import { EditIncomeDialog } from "@/components/income/edit-income-dialog"
import type { IncomeAccountOption } from "@/components/income/income-form-fields"
import { SensitiveValue } from "@/components/streamer-mode"
import { formatAppDateTime } from "@/lib/time"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type IncomeRowProps = {
  accounts: IncomeAccountOption[]
  entry: {
    id: string
    accountId: string
    amount: { toString(): string }
    currency: string
    baseAmountUsd: { toString(): string }
    exchangeRate: { toString(): string }
    transactionDate: Date | string
    description: string
    counterparty: string | null
    notes: string | null
    paymentMethod: string | null
    debtId?: string | null
    subscriptionId?: string | null
    account: {
      id: string
      name: string
      type: string
      currency: string
    }
  }
}

const initialState: IncomeActionState = {}

export function IncomeRow({ accounts, entry }: IncomeRowProps) {
  const [state, formAction, pending] = useActionState(
    softDeleteIncomeAction,
    initialState
  )
  const when = formatAppDateTime(entry.transactionDate)
  const isLinked = Boolean(entry.debtId || entry.subscriptionId)

  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base tracking-tight">
              {entry.description}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{entry.account.name}</Badge>
              <Badge variant="secondary">{entry.currency}</Badge>
              {entry.paymentMethod ? (
                <Badge variant="outline">{entry.paymentMethod}</Badge>
              ) : null}
              {entry.debtId ? (
                <Badge variant="secondary">Debt payment</Badge>
              ) : null}
            </CardDescription>
          </div>
          <div className="shrink-0 text-right">
            <SensitiveValue
              as="p"
              className="font-mono text-sm tabular-nums tracking-tight"
            >
              +{entry.amount.toString()} {entry.currency}
            </SensitiveValue>
            <SensitiveValue as="p" className="text-xs text-muted-foreground">
              ≈ {entry.baseAmountUsd.toString()} USD
            </SensitiveValue>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{when}</p>
        {entry.counterparty ? (
          <p className="text-sm text-muted-foreground">
            From: <span className="text-foreground">{entry.counterparty}</span>
          </p>
        ) : null}
        {entry.notes ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {entry.notes}
          </p>
        ) : null}
        <AttachmentsPanel
          entityType="TRANSACTION"
          entityId={entry.id}
          title="Receipts & files"
        />
        <div className="flex flex-wrap items-center gap-2">
          {isLinked ? (
            <p className="text-sm text-muted-foreground">
              Linked payment — manage from Debts.
            </p>
          ) : (
            <>
              <EditIncomeDialog accounts={accounts} entry={entry} />
              <form
                action={formAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Soft-delete this income entry? Account balance will be recalculated."
                    )
                  ) {
                    event.preventDefault()
                  }
                }}
              >
                <input type="hidden" name="id" value={entry.id} />
                <Button type="submit" size="sm" variant="ghost" disabled={pending}>
                  {pending ? "Removing…" : "Delete"}
                </Button>
              </form>
            </>
          )}
        </div>
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
