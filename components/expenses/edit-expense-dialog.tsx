"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import {
  updateExpenseAction,
  type ExpenseActionState,
} from "@/app/(dashboard)/dashboard/expenses/actions"
import {
  ExpenseFormFields,
  toExpenseDateTimeLocalValue,
  type ExpenseAccountOption,
  type ExpenseCategoryOption,
  type ExpenseFormFieldsHandle,
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

type EditExpenseDialogProps = {
  accounts: ExpenseAccountOption[]
  categories: ExpenseCategoryOption[]
  frequentCategoryIds?: string[]
  entry: {
    id: string
    accountId: string
    categoryId: string | null
    amount: { toString(): string }
    exchangeRate: { toString(): string }
    transactionDate: Date | string
    description: string
    counterparty: string | null
    notes: string | null
    paymentMethod: string | null
  }
}

export function EditExpenseDialog({
  accounts,
  categories,
  frequentCategoryIds = [],
  entry,
}: EditExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const fieldsRef = useRef<ExpenseFormFieldsHandle>(null)
  const [state, formAction, pending] = useActionState(
    updateExpenseAction,
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
      <DialogContent className="max-h-[min(92vh,44rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit expense</DialogTitle>
          <DialogDescription>
            Balance is recomputed safely after every change. Historical FX stays
            frozen unless amount, currency, or rate changes.
          </DialogDescription>
        </DialogHeader>
        <form
          action={formAction}
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            if (!fieldsRef.current?.validate()) {
              event.preventDefault()
            }
          }}
        >
          <input type="hidden" name="id" value={entry.id} />
          <ExpenseFormFields
            ref={fieldsRef}
            accounts={accounts}
            categories={categories}
            frequentCategoryIds={frequentCategoryIds}
            disabled={pending}
            editingExisting
            detailsOpenDefault
            defaults={{
              accountId: entry.accountId,
              categoryId: entry.categoryId ?? undefined,
              amount: entry.amount.toString(),
              exchangeRate: entry.exchangeRate.toString(),
              transactionDate: toExpenseDateTimeLocalValue(entry.transactionDate),
              description: entry.description,
              counterparty: entry.counterparty ?? "",
              notes: entry.notes ?? "",
              paymentMethod: entry.paymentMethod ?? "",
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
              className="h-11"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
