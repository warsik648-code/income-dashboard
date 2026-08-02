"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"

import {
  createExpenseAction,
  type ExpenseActionState,
} from "@/app/(dashboard)/dashboard/expenses/actions"
import {
  ExpenseFormFields,
  type ExpenseAccountOption,
  type ExpenseCategoryOption,
} from "@/components/expenses/expense-form-fields"
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

const initialState: ExpenseActionState = {}

export function CreateExpenseDialog({
  accounts,
  categories,
}: {
  accounts: ExpenseAccountOption[]
  categories: ExpenseCategoryOption[]
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    createExpenseAction,
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
          <Button disabled={accounts.length === 0 || categories.length === 0}>
            <Plus className="size-4" />
            Add expense
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record expense</DialogTitle>
          <DialogDescription>
            Reduces the selected account balance. Original currency is preserved
            with a frozen USD snapshot.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <ExpenseFormFields
            accounts={accounts}
            categories={categories}
            disabled={pending}
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
            <Button
              type="submit"
              disabled={pending || accounts.length === 0}
            >
              {pending ? "Saving…" : "Save expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
