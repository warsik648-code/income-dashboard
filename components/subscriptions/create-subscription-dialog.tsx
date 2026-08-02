"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"

import {
  createSubscriptionAction,
  type SubscriptionActionState,
} from "@/app/(dashboard)/dashboard/subscriptions/actions"
import {
  SubscriptionFormFields,
  type SubscriptionAccountOption,
  type SubscriptionCategoryOption,
} from "@/components/subscriptions/subscription-form-fields"
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

const initialState: SubscriptionActionState = {}

export function CreateSubscriptionDialog({
  accounts,
  categories,
}: {
  accounts: SubscriptionAccountOption[]
  categories: SubscriptionCategoryOption[]
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    createSubscriptionAction,
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
            Add subscription
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add subscription</DialogTitle>
          <DialogDescription>
            Track recurring services. Renewals never create expenses until you
            confirm payment.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <SubscriptionFormFields
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
            <Button type="submit" disabled={pending || accounts.length === 0}>
              {pending ? "Saving…" : "Save subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
