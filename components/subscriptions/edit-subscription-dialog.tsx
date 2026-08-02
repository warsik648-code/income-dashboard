"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import {
  updateSubscriptionAction,
  type SubscriptionActionState,
} from "@/app/(dashboard)/dashboard/subscriptions/actions"
import {
  SubscriptionFormFields,
  type SubscriptionAccountOption,
  type SubscriptionCategoryOption,
  type SubscriptionFormDefaults,
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

export function EditSubscriptionDialog({
  accounts,
  categories,
  subscription,
}: {
  accounts: SubscriptionAccountOption[]
  categories: SubscriptionCategoryOption[]
  subscription: SubscriptionFormDefaults & { id: string }
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    updateSubscriptionAction,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit subscription</DialogTitle>
          <DialogDescription>
            Linked expense history is preserved when you change or cancel this
            subscription.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={subscription.id} />
          <SubscriptionFormFields
            accounts={accounts}
            categories={categories}
            defaults={subscription}
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
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
