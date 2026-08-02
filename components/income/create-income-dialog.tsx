"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"

import {
  createIncomeAction,
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

export function CreateIncomeDialog({
  accounts,
}: {
  accounts: IncomeAccountOption[]
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    createIncomeAction,
    initialState
  )
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={accounts.length === 0}>
            <Plus className="size-4" />
            Add income
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record income</DialogTitle>
          <DialogDescription>
            Amount stays in the account currency. USD conversion is stored as a
            frozen snapshot.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <IncomeFormFields accounts={accounts} disabled={pending} />
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
            <Button type="submit" disabled={pending || accounts.length === 0}>
              {pending ? "Saving…" : "Save income"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
