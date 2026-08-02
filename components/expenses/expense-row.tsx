"use client"

import { useActionState } from "react"

import {
  restoreExpenseAction,
  softDeleteExpenseAction,
  type ExpenseActionState,
} from "@/app/(dashboard)/dashboard/expenses/actions"
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog"
import type {
  ExpenseAccountOption,
  ExpenseCategoryOption,
} from "@/components/expenses/expense-form-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ExpenseRowProps = {
  accounts: ExpenseAccountOption[]
  categories: ExpenseCategoryOption[]
  showDeleted?: boolean
  entry: {
    id: string
    accountId: string
    categoryId: string | null
    amount: { toString(): string }
    currency: string
    baseAmountUsd: { toString(): string }
    exchangeRate: { toString(): string }
    transactionDate: Date | string
    description: string
    counterparty: string | null
    notes: string | null
    paymentMethod: string | null
    deletedAt: Date | string | null
    account: { id: string; name: string; type: string; currency: string }
    category: { id: string; name: string } | null
  }
}

const initialState: ExpenseActionState = {}

export function ExpenseRow({
  accounts,
  categories,
  entry,
  showDeleted,
}: ExpenseRowProps) {
  const [deleteState, deleteAction, deletePending] = useActionState(
    softDeleteExpenseAction,
    initialState
  )
  const [restoreState, restoreAction, restorePending] = useActionState(
    restoreExpenseAction,
    initialState
  )

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
              {entry.category ? (
                <Badge variant="secondary">{entry.category.name}</Badge>
              ) : null}
              <Badge variant="outline">{entry.currency}</Badge>
              {entry.paymentMethod ? (
                <Badge variant="outline">{entry.paymentMethod}</Badge>
              ) : null}
              {entry.deletedAt ? (
                <Badge variant="destructive">Deleted</Badge>
              ) : null}
            </CardDescription>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-sm tabular-nums tracking-tight">
              -{entry.amount.toString()} {entry.currency}
            </p>
            <p className="text-xs text-muted-foreground">
              ≈ {entry.baseAmountUsd.toString()} USD
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {new Date(entry.transactionDate).toLocaleString()}
        </p>
        {entry.counterparty ? (
          <p className="text-sm text-muted-foreground">
            To: <span className="text-foreground">{entry.counterparty}</span>
          </p>
        ) : null}
        {entry.notes ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {entry.notes}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {!entry.deletedAt ? (
            <>
              <EditExpenseDialog
                accounts={accounts}
                categories={categories}
                entry={entry}
              />
              <form
                action={deleteAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Soft-delete this expense? The account balance will be recalculated."
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
                  {deletePending ? "Removing…" : "Delete"}
                </Button>
              </form>
            </>
          ) : showDeleted ? (
            <form action={restoreAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={entry.id} />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" name="allowOverdraft" value="true" />
                Allow overdraft on restore
              </label>
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
