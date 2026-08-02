"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"

import {
  createExpenseAction,
  type ExpenseActionState,
} from "@/app/(dashboard)/dashboard/expenses/actions"
import { rememberLastExpenseCategoryId } from "@/components/expenses/expense-category-picker"
import {
  ExpenseFormFields,
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

export function CreateExpenseDialog({
  accounts,
  categories,
  frequentCategoryIds = [],
}: {
  accounts: ExpenseAccountOption[]
  categories: ExpenseCategoryOption[]
  frequentCategoryIds?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [formResetKey, setFormResetKey] = useState(0)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [intent, setIntent] = useState<"save" | "add-another">("add-another")
  const [preservedAccountId, setPreservedAccountId] = useState<
    string | undefined
  >()
  const [preservedCategoryId, setPreservedCategoryId] = useState<
    string | undefined
  >()
  const fieldsRef = useRef<ExpenseFormFieldsHandle>(null)
  const [state, formAction, pending] = useActionState(
    createExpenseAction,
    initialState
  )
  const wasPending = useRef(false)

  useEffect(() => {
    if (!(wasPending.current && !pending && state.ok)) {
      wasPending.current = pending
      return
    }
    wasPending.current = pending

    const categoryId = fieldsRef.current?.getCategoryId()
    const accountId = fieldsRef.current?.getAccountId()
    if (categoryId) rememberLastExpenseCategoryId(categoryId)

    const timer = window.setTimeout(() => {
      if (accountId) setPreservedAccountId(accountId)
      if (categoryId) setPreservedCategoryId(categoryId)
      setSuccessMessage("Expense saved")
      setFormResetKey((key) => key + 1)
      window.setTimeout(() => fieldsRef.current?.focusAmount(), 50)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [pending, state.ok, intent])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setSuccessMessage(null)
      setFormResetKey(0)
      setPreservedAccountId(undefined)
      setPreservedCategoryId(undefined)
    }
  }

  const canSubmit = accounts.length > 0 && categories.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button disabled={!canSubmit}>
            <Plus className="size-4" />
            Add expense
          </Button>
        }
      />
      <DialogContent className="max-h-[min(92vh,44rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick expense</DialogTitle>
          <DialogDescription>
            Account, amount, category, and time — everything else is optional.
          </DialogDescription>
        </DialogHeader>
        <form
          action={formAction}
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            if (!fieldsRef.current?.validate()) {
              event.preventDefault()
              return
            }
            setSuccessMessage(null)
          }}
        >
          <ExpenseFormFields
            key={`create-${formResetKey}-${preservedAccountId ?? ""}-${preservedCategoryId ?? ""}`}
            ref={fieldsRef}
            accounts={accounts}
            categories={categories}
            frequentCategoryIds={frequentCategoryIds}
            disabled={pending}
            quickEntry
            formResetKey={formResetKey}
            defaults={{
              accountId: preservedAccountId,
              categoryId: preservedCategoryId,
            }}
          />

          {successMessage && state.ok ? (
            <p
              className="text-sm text-emerald-700 dark:text-emerald-400"
              role="status"
            >
              {successMessage}. Ready for the next one.
            </p>
          ) : null}
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="submit"
              className="h-11 w-full text-sm"
              disabled={pending || !canSubmit}
              onClick={() => setIntent("add-another")}
            >
              {pending && intent === "add-another"
                ? "Saving…"
                : "Save and add another"}
            </Button>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
              <Button
                type="submit"
                variant="secondary"
                className="h-11 flex-1"
                disabled={pending || !canSubmit}
                onClick={() => setIntent("save")}
              >
                {pending && intent === "save" ? "Saving…" : "Save expense"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
