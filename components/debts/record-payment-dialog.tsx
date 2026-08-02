"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"

import {
  markDebtFullyPaidAction,
  recordDebtPaymentAction,
  type DebtActionState,
} from "@/app/(dashboard)/dashboard/debts/actions"
import type { DebtAccountOption } from "@/components/debts/debt-form-fields"
import { ExchangeRateField } from "@/components/money/exchange-rate-field"
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
import { Textarea } from "@/components/ui/textarea"

const initialState: DebtActionState = {}

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function RecordPaymentDialog({
  accounts,
  debt,
  mode = "partial",
}: {
  accounts: DebtAccountOption[]
  debt: {
    id: string
    personName: string
    direction: string
    currency: string
    remainingAmount: string
    exchangeRate: string
    accountId: string | null
  }
  mode?: "partial" | "full"
}) {
  const [open, setOpen] = useState(false)
  const matchingAccounts = accounts.filter(
    (account) => account.currency === debt.currency
  )
  const [accountId, setAccountId] = useState(
    matchingAccounts.find((a) => a.id === debt.accountId)?.id ?? ""
  )
  const [linkAccount, setLinkAccount] = useState(false)
  const action =
    mode === "full" ? markDebtFullyPaidAction : recordDebtPaymentAction
  const [state, formAction, pending] = useActionState(action, initialState)
  const wasPending = useRef(false)
  const [paymentAmount, setPaymentAmount] = useState(
    mode === "full" ? debt.remainingAmount : ""
  )
  const selected = useMemo(
    () => matchingAccounts.find((a) => a.id === accountId),
    [matchingAccounts, accountId]
  )

  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  const title = mode === "full" ? "Mark fully paid" : "Record payment"
  const impactLabel =
    debt.direction === "LENT_OUT"
      ? "Also record as income on an account"
      : "Also record as expense on an account"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={mode === "full" ? "secondary" : "outline"}
          >
            {title}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {debt.personName} · remaining {debt.remainingAmount}{" "}
            {debt.currency}. Original debt amount stays unchanged; this adds a
            payment record.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="debtId" value={debt.id} />
          {mode === "full" ? (
            <input type="hidden" name="markFullyPaid" value="true" />
          ) : null}

          {mode === "partial" ? (
            <div className="grid gap-1.5">
              <Label htmlFor={`payment-amount-${debt.id}`}>
                Amount ({debt.currency})
              </Label>
              <Input
                id={`payment-amount-${debt.id}`}
                name="amount"
                inputMode="decimal"
                required
                disabled={pending}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={`Max ${debt.remainingAmount}`}
              />
            </div>
          ) : (
            <input type="hidden" name="amount" value="" />
          )}

          <ExchangeRateField
            idPrefix={`payment-${debt.id}-`}
            currency={debt.currency}
            amount={
              mode === "full" ? debt.remainingAmount : paymentAmount
            }
            disabled={pending}
            editingExisting
            savedExchangeRate={debt.exchangeRate}
          />

          <div className="grid gap-1.5">
            <Label htmlFor={`payment-date-${debt.id}`}>Payment date</Label>
            <Input
              id={`payment-date-${debt.id}`}
              name="paymentDate"
              type="datetime-local"
              required
              disabled={pending}
              defaultValue={toDateTimeLocalValue(new Date())}
            />
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/40 p-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              checked={linkAccount}
              disabled={pending || matchingAccounts.length === 0}
              onChange={(e) => {
                setLinkAccount(e.target.checked)
                if (!e.target.checked) setAccountId("")
                else if (!accountId && matchingAccounts[0]) {
                  setAccountId(matchingAccounts[0].id)
                }
              }}
              className="mt-1"
            />
            <span>
              {impactLabel}
              {matchingAccounts.length === 0 ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  No {debt.currency} accounts available.
                </span>
              ) : null}
            </span>
          </label>

          {linkAccount ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor={`payment-account-${debt.id}`}>Account</Label>
                <select
                  id={`payment-account-${debt.id}`}
                  name="accountId"
                  required
                  disabled={pending}
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {matchingAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · bal {account.cachedBalance}{" "}
                      {account.currency}
                    </option>
                  ))}
                </select>
              </div>
              {debt.direction === "OWED_BY_ME" ? (
                <label className="flex items-start gap-2 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    name="allowOverdraft"
                    value="true"
                    disabled={pending}
                    className="mt-1"
                  />
                  <span>
                    Allow overdraft
                    {selected
                      ? ` (available ${selected.cachedBalance} ${selected.currency})`
                      : ""}
                  </span>
                </label>
              ) : null}
            </>
          ) : (
            <input type="hidden" name="accountId" value="" />
          )}

          <div className="grid gap-1.5">
            <Label htmlFor={`payment-notes-${debt.id}`}>Notes (optional)</Label>
            <Textarea
              id={`payment-notes-${debt.id}`}
              name="notes"
              disabled={pending}
            />
          </div>

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
              {pending ? "Saving…" : title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
