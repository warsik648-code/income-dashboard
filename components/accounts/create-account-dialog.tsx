"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"

import {
  createAccountAction,
  type AccountActionState,
} from "@/app/(dashboard)/dashboard/accounts/actions"
import {
  ACCOUNT_TYPES,
  ASSET_CLASSES,
} from "@/components/accounts/account-constants"
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

const initialState: AccountActionState = {}

export function CreateAccountDialog() {
  const [open, setOpen] = useState(false)
  const [currency, setCurrency] = useState("USD")
  const [state, formAction, pending] = useActionState(
    createAccountAction,
    initialState
  )
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending && state.ok) {
      setOpen(false)
      setCurrency("USD")
    }
    wasPending.current = pending
  }, [pending, state.ok])

  const needsRate = currency.trim().toUpperCase() !== "USD"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Add account
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>
            Each account keeps its own currency. Starting balances create an
            audited opening transaction.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Account name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Bank USD"
              required
              disabled={pending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                required
                disabled={pending}
                defaultValue="BANK"
                className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="assetClass">Asset class</Label>
              <select
                id="assetClass"
                name="assetClass"
                required
                disabled={pending}
                defaultValue="FIAT"
                className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                {ASSET_CLASSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="currency">Currency / asset</Label>
              <Input
                id="currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                required
                disabled={pending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                name="institution"
                placeholder="Optional"
                disabled={pending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="startingBalance">Starting balance</Label>
              <Input
                id="startingBalance"
                name="startingBalance"
                inputMode="decimal"
                placeholder="Optional"
                disabled={pending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exchangeRate">
                FX rate {needsRate ? "(required)" : "(USD = 1)"}
              </Label>
              <Input
                id="exchangeRate"
                name="exchangeRate"
                inputMode="decimal"
                placeholder={needsRate ? "USD per 1 unit" : "1"}
                disabled={pending || !needsRate}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Optional"
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
              {pending ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
