"use client"

import { useActionState } from "react"

import {
  cancelPendingTransferAction,
  reverseTransferAction,
  updateTransferMetaAction,
  type TransferActionState,
} from "@/app/(dashboard)/dashboard/transfers/actions"
import { AttachmentsPanel } from "@/components/attachments/attachments-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TransferListItem } from "@/lib/services/transfers"

const initialState: TransferActionState = {}

export function TransferRow({ entry }: { entry: TransferListItem }) {
  const [metaState, metaAction, metaPending] = useActionState(
    updateTransferMetaAction,
    initialState
  )
  const [reverseState, reverseAction, reversePending] = useActionState(
    reverseTransferAction,
    initialState
  )
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelPendingTransferAction,
    initialState
  )

  return (
    <article className="rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium tracking-tight">
            Transfer: {entry.fromAccount.name} → {entry.toAccount.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sent {entry.sourceAmount.toString()} {entry.sourceCurrency} · received{" "}
            {entry.destinationAmount.toString()} {entry.destinationCurrency}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Effective rate {entry.effectiveExchangeRate.toString()} · fee{" "}
            {entry.feeAmount.toString()}{" "}
            {entry.feeCurrency ?? entry.sourceCurrency}
            {entry.feePaidSeparately ? " (separate)" : ""} ·{" "}
            {entry.status} ·{" "}
            {new Date(entry.transferredAt).toLocaleString()}
          </p>
        </div>
        <span className="rounded-md border border-border/70 px-2 py-1 text-xs">
          {entry.status}
        </span>
      </div>

      <form action={metaAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={entry.id} />
        <div className="grid gap-1.5">
          <Label htmlFor={`ref-${entry.id}`}>Reference</Label>
          <Input
            id={`ref-${entry.id}`}
            name="reference"
            defaultValue={entry.reference ?? ""}
            disabled={metaPending}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`notes-${entry.id}`}>Notes</Label>
          <Textarea
            id={`notes-${entry.id}`}
            name="notes"
            defaultValue={entry.notes ?? ""}
            disabled={metaPending}
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" size="sm" variant="outline" disabled={metaPending}>
            {metaPending ? "Saving…" : "Save notes"}
          </Button>
          {entry.status === "PENDING" ? (
            <Button
              formAction={cancelAction}
              name="id"
              value={entry.id}
              size="sm"
              variant="outline"
              disabled={cancelPending}
            >
              Cancel pending
            </Button>
          ) : null}
          {entry.status === "COMPLETED" ? (
            <Button
              formAction={reverseAction}
              name="id"
              value={entry.id}
              size="sm"
              variant="destructive"
              disabled={reversePending}
              onClick={(e) => {
                if (
                  !window.confirm(
                    "Reverse this completed transfer? Balances will be restored and any separate fee expense removed."
                  )
                ) {
                  e.preventDefault()
                }
              }}
            >
              Reverse transfer
            </Button>
          ) : null}
        </div>
        {metaState.error || reverseState.error || cancelState.error ? (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {metaState.error || reverseState.error || cancelState.error}
          </p>
        ) : null}
      </form>

      <div className="mt-4">
        <AttachmentsPanel entityType="TRANSFER" entityId={entry.id} />
      </div>
    </article>
  )
}
