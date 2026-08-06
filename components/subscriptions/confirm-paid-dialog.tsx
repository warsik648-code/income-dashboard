"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import { useStreamerModeOptional, maskSensitivePlain } from "@/components/streamer-mode"

import {
  confirmPaidAction,
  type SubscriptionActionState,
} from "@/app/(dashboard)/dashboard/subscriptions/actions"
import { ExchangeRateField } from "@/components/money/exchange-rate-field"
import type { SubscriptionAccountOption } from "@/components/subscriptions/subscription-form-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatAppDateTimeLocal } from "@/lib/time"

const initialState: SubscriptionActionState = {}

function toDateTimeLocalValue(date: Date) {
  return formatAppDateTimeLocal(date)
}

export function ConfirmPaidDialog({
  accounts,
  subscription,
}: {
  accounts: SubscriptionAccountOption[]
  subscription: {
    id: string
    name: string
    price: string
    currency: string
    accountId: string
    nextRenewalDate: string
  }
}) {
  const { enabled: streamerMode } = useStreamerModeOptional()
  const matchingAccounts = accounts.filter(
    (account) => account.currency === subscription.currency
  )
  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState(
    matchingAccounts.find((a) => a.id === subscription.accountId)?.id ??
      matchingAccounts[0]?.id ??
      ""
  )
  const [state, formAction, pending] = useActionState(
    confirmPaidAction,
    initialState
  )
  const wasPending = useRef(false)
  const selected = useMemo(
    () => matchingAccounts.find((a) => a.id === accountId),
    [matchingAccounts, accountId]
  )
  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  if (matchingAccounts.length === 0) {
    return (
      <Button size="sm" variant="secondary" disabled>
        Confirm paid
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="secondary">Confirm paid</Button>}
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm paid</DialogTitle>
          <DialogDescription>
            Creates an expense for {subscription.name} (
            {subscription.price} {subscription.currency}) and advances the next
            renewal date. Does not auto-run on the due date.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={subscription.id} />

          <div className="grid gap-1.5">
            <Label htmlFor={`confirm-account-${subscription.id}`}>
              Payment account
            </Label>
            <select
              id={`confirm-account-${subscription.id}`}
              name="accountId"
              required
              disabled={pending}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {matchingAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · bal {maskSensitivePlain(streamerMode, account.cachedBalance)}{" "}
                  {account.currency}
                </option>
              ))}
            </select>
          </div>

          <ExchangeRateField
            idPrefix={`confirm-${subscription.id}-`}
            currency={selected?.currency ?? subscription.currency}
            amount={subscription.price}
            disabled={pending}
          />

          <div className="grid gap-1.5">
            <Label htmlFor={`confirm-date-${subscription.id}`}>
              Payment date
            </Label>
            <Input
              id={`confirm-date-${subscription.id}`}
              name="paymentDate"
              type="datetime-local"
              disabled={pending}
              defaultValue={toDateTimeLocalValue(new Date())}
            />
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/40 p-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              name="allowOverdraft"
              value="true"
              disabled={pending}
              className="mt-1"
            />
            <span>
              Allow overdraft if this renewal exceeds the available balance.
            </span>
          </label>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Confirming…" : "Confirm paid"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
