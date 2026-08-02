"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import {
  updateDebtAction,
  type DebtActionState,
} from "@/app/(dashboard)/dashboard/debts/actions"
import {
  DebtFormFields,
  type DebtAccountOption,
  type DebtFormDefaults,
} from "@/components/debts/debt-form-fields"
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

const initialState: DebtActionState = {}

export function EditDebtDialog({
  accounts,
  debt,
}: {
  accounts: DebtAccountOption[]
  debt: DebtFormDefaults & { id: string }
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    updateDebtAction,
    initialState
  )
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">Edit</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit debt</DialogTitle>
          <DialogDescription>
            Original amount can be corrected; payment history stays intact.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={debt.id} />
          <DebtFormFields
            accounts={accounts}
            defaults={debt}
            disabled={pending}
            showStatus
            editingExisting
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
