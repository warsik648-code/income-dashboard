"use client"

import { useActionState } from "react"

import {
  restoreDebtAction,
  softDeleteDebtAction,
  type DebtActionState,
} from "@/app/(dashboard)/dashboard/debts/actions"
import { EditDebtDialog } from "@/components/debts/edit-debt-dialog"
import { RecordPaymentDialog } from "@/components/debts/record-payment-dialog"
import type { DebtAccountOption } from "@/components/debts/debt-form-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type DebtRowData = {
  id: string
  personName: string
  direction: string
  originalAmount: string
  remainingAmount: string
  paidAmount: string
  currency: string
  exchangeRate: string
  baseAmountUsd: string
  dueDate: string | null
  status: string
  notes: string | null
  accountId: string | null
  createdAt: string
  deletedAt: string | null
  account: {
    id: string
    name: string
    currency: string
  } | null
  payments: Array<{
    id: string
    amount: string
    currency: string
    paymentDate: string
    notes: string | null
    transactionId: string | null
  }>
}

const initialState: DebtActionState = {}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function directionLabel(direction: string) {
  return direction === "LENT_OUT" ? "They owe me" : "I owe them"
}

export function DebtRow({
  accounts,
  entry,
  showDeleted,
}: {
  accounts: DebtAccountOption[]
  entry: DebtRowData
  showDeleted?: boolean
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(
    softDeleteDebtAction,
    initialState
  )
  const [restoreState, restoreAction, restorePending] = useActionState(
    restoreDebtAction,
    initialState
  )

  const isOpen =
    entry.status !== "PAID" &&
    entry.status !== "WRITTEN_OFF" &&
    !entry.deletedAt

  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base tracking-tight">
              {entry.personName}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{directionLabel(entry.direction)}</Badge>
              <Badge variant="secondary">{entry.status}</Badge>
              <Badge variant="outline">{entry.currency}</Badge>
              {entry.account ? (
                <Badge variant="outline">{entry.account.name}</Badge>
              ) : null}
              {entry.deletedAt ? (
                <Badge variant="destructive">Archived</Badge>
              ) : null}
            </CardDescription>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-sm tabular-nums tracking-tight">
              {entry.remainingAmount} {entry.currency}
            </p>
            <p className="text-xs text-muted-foreground">remaining</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            Original:{" "}
            <span className="font-mono text-foreground">
              {entry.originalAmount} {entry.currency}
            </span>
          </p>
          <p>
            Paid:{" "}
            <span className="font-mono text-foreground">
              {entry.paidAmount} {entry.currency}
            </span>
          </p>
          <p>Created: {formatDate(entry.createdAt)}</p>
          {entry.dueDate ? <p>Due: {formatDate(entry.dueDate)}</p> : null}
        </div>

        {entry.notes ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {entry.notes}
          </p>
        ) : null}

        {entry.payments.length > 0 ? (
          <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/30 p-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Payment history
            </p>
            <ul className="space-y-1.5">
              {entry.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                >
                  <span className="font-mono tabular-nums">
                    {payment.amount} {payment.currency}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(payment.paymentDate)}
                    {payment.transactionId ? " · linked txn" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {!entry.deletedAt ? (
            <>
              <EditDebtDialog
                accounts={accounts}
                debt={{
                  id: entry.id,
                  personName: entry.personName,
                  direction: entry.direction,
                  originalAmount: entry.originalAmount,
                  currency: entry.currency,
                  exchangeRate: entry.exchangeRate,
                  dueDate: entry.dueDate,
                  notes: entry.notes,
                  status: entry.status,
                  accountId: entry.accountId,
                }}
              />
              {isOpen ? (
                <>
                  <RecordPaymentDialog
                    accounts={accounts}
                    debt={{
                      id: entry.id,
                      personName: entry.personName,
                      direction: entry.direction,
                      currency: entry.currency,
                      remainingAmount: entry.remainingAmount,
                      exchangeRate: entry.exchangeRate,
                      accountId: entry.accountId,
                    }}
                    mode="partial"
                  />
                  <RecordPaymentDialog
                    accounts={accounts}
                    debt={{
                      id: entry.id,
                      personName: entry.personName,
                      direction: entry.direction,
                      currency: entry.currency,
                      remainingAmount: entry.remainingAmount,
                      exchangeRate: entry.exchangeRate,
                      accountId: entry.accountId,
                    }}
                    mode="full"
                  />
                </>
              ) : null}
              <form
                action={deleteAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Archive this debt? Payment history is preserved."
                    )
                  ) {
                    event.preventDefault()
                  }
                }}
              >
                <input type="hidden" name="id" value={entry.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={deletePending}
                >
                  {deletePending ? "Archiving…" : "Archive"}
                </Button>
              </form>
            </>
          ) : showDeleted ? (
            <form action={restoreAction}>
              <input type="hidden" name="id" value={entry.id} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={restorePending}
              >
                {restorePending ? "Restoring…" : "Restore"}
              </Button>
            </form>
          ) : null}
        </div>

        {deleteState.error ? (
          <p className="text-sm text-destructive" role="alert">
            {deleteState.error}
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
