"use client"

import { useActionState } from "react"

import {
  cancelSubscriptionAction,
  pauseSubscriptionAction,
  restoreSubscriptionAction,
  resumeSubscriptionAction,
  softDeleteSubscriptionAction,
  type SubscriptionActionState,
} from "@/app/(dashboard)/dashboard/subscriptions/actions"
import { AttachmentsPanel } from "@/components/attachments/attachments-panel"
import { ConfirmPaidDialog } from "@/components/subscriptions/confirm-paid-dialog"
import { EditSubscriptionDialog } from "@/components/subscriptions/edit-subscription-dialog"
import type {
  SubscriptionAccountOption,
  SubscriptionCategoryOption,
} from "@/components/subscriptions/subscription-form-fields"
import { SubscriptionLogo } from "@/components/subscriptions/subscription-logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type SubscriptionRowData = {
  id: string
  name: string
  provider: string
  logoUrl: string | null
  price: string
  currency: string
  billingFrequency: string
  customIntervalDays: number | null
  startDate: string
  nextRenewalDate: string
  endDate: string | null
  accountId: string
  categoryId: string | null
  paymentMethod: string | null
  status: string
  autoRenew: boolean
  notes: string | null
  deletedAt: string | null
  displayState: string
  isDue: boolean
  monthlyEquivalent: string
  account: {
    id: string
    name: string
    currency: string
    cachedBalance: string
  }
  category: { id: string; name: string } | null
}

const initialState: SubscriptionActionState = {}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function SubscriptionRow({
  accounts,
  categories,
  entry,
  showDeleted,
}: {
  accounts: SubscriptionAccountOption[]
  categories: SubscriptionCategoryOption[]
  entry: SubscriptionRowData
  showDeleted?: boolean
}) {
  const [pauseState, pauseAction, pausePending] = useActionState(
    pauseSubscriptionAction,
    initialState
  )
  const [resumeState, resumeAction, resumePending] = useActionState(
    resumeSubscriptionAction,
    initialState
  )
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelSubscriptionAction,
    initialState
  )
  const [deleteState, deleteAction, deletePending] = useActionState(
    softDeleteSubscriptionAction,
    initialState
  )
  const [restoreState, restoreAction, restorePending] = useActionState(
    restoreSubscriptionAction,
    initialState
  )

  const actionError =
    pauseState.error ||
    resumeState.error ||
    cancelState.error ||
    deleteState.error ||
    restoreState.error

  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <SubscriptionLogo
              name={entry.name}
              provider={entry.provider}
              logoUrl={entry.logoUrl}
            />
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-base tracking-tight">
                {entry.name}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-1.5">
                <span>{entry.provider}</span>
                <Badge variant="outline">{entry.account.name}</Badge>
                <Badge variant="outline">{entry.currency}</Badge>
                <Badge variant="outline">{entry.billingFrequency}</Badge>
                <Badge
                  variant={
                    entry.displayState === "DUE" ? "destructive" : "secondary"
                  }
                >
                  {entry.displayState}
                </Badge>
                {entry.deletedAt ? (
                  <Badge variant="destructive">Archived</Badge>
                ) : null}
              </CardDescription>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-sm tabular-nums tracking-tight">
              {entry.price} {entry.currency}
            </p>
            <p className="text-xs text-muted-foreground">
              ≈ {entry.monthlyEquivalent} / mo
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Next renewal:{" "}
          <span className="text-foreground">
            {formatDate(entry.nextRenewalDate)}
          </span>
          {entry.autoRenew ? " · Auto-renew on" : " · Auto-renew off"}
        </p>
        {entry.category ? (
          <p className="text-sm text-muted-foreground">
            Category:{" "}
            <span className="text-foreground">{entry.category.name}</span>
          </p>
        ) : null}
        {entry.notes ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {entry.notes}
          </p>
        ) : null}

        {!entry.deletedAt ? (
          <AttachmentsPanel
            entityType="SUBSCRIPTION"
            entityId={entry.id}
            title="Subscription files"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {!entry.deletedAt ? (
            <>
              <EditSubscriptionDialog
                accounts={accounts}
                categories={categories}
                subscription={entry}
              />
              {entry.isDue ? (
                <ConfirmPaidDialog
                  accounts={accounts}
                  subscription={{
                    id: entry.id,
                    name: entry.name,
                    price: entry.price,
                    currency: entry.currency,
                    accountId: entry.accountId,
                    nextRenewalDate: entry.nextRenewalDate,
                  }}
                />
              ) : null}
              {entry.status === "PAUSED" ? (
                <form action={resumeAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={resumePending}
                  >
                    {resumePending ? "Resuming…" : "Resume"}
                  </Button>
                </form>
              ) : entry.status === "ACTIVE" || entry.status === "TRIAL" ? (
                <form action={pauseAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={pausePending}
                  >
                    {pausePending ? "Pausing…" : "Pause"}
                  </Button>
                </form>
              ) : null}
              {entry.status !== "CANCELLED" ? (
                <form
                  action={cancelAction}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        "Cancel this subscription? Linked expense history stays intact."
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
                    disabled={cancelPending}
                  >
                    {cancelPending ? "Cancelling…" : "Cancel"}
                  </Button>
                </form>
              ) : null}
              <form
                action={deleteAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Archive this subscription? You can restore it later. Expense history is preserved."
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

        {actionError ? (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
