"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import {
  updateIncomeAction,
  type IncomeActionState,
} from "@/app/(dashboard)/dashboard/income/actions"
import {
  IncomeFormFields,
  type IncomeAccountOption,
} from "@/components/income/income-form-fields"
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

const initialState: IncomeActionState = {}

function toDateTimeLocalValue(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type EditIncomeDialogProps = {
  accounts: IncomeAccountOption[]
  entry: {
    id: string
    accountId: string
    amount: { toString(): string }
    exchangeRate: { toString(): string }
    transactionDate: Date | string
    description: string
    counterparty: string | null
    notes: string | null
    paymentMethod: string | null
  }
}

export function EditIncomeDialog({ accounts, entry }: EditIncomeDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    updateIncomeAction,
    initialState
  )
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">Edit</Button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit income</DialogTitle>
          <DialogDescription>
            Changes are audited and account balances are recomputed safely.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={entry.id} />
          <IncomeFormFields
            accounts={accounts}
            disabled={pending}
            editingExisting
            defaults={{
              accountId: entry.accountId,
              amount: entry.amount.toString(),
              exchangeRate: entry.exchangeRate.toString(),
              transactionDate: toDateTimeLocalValue(entry.transactionDate),
              description: entry.description,
              counterparty: entry.counterparty ?? "",
              notes: entry.notes ?? "",
              paymentMethod: entry.paymentMethod,
            }}
          />
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
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
