"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import {
  updateAccountAction,
  type AccountActionState,
} from "@/app/(dashboard)/dashboard/accounts/actions"
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

type EditAccountDialogProps = {
  account: {
    id: string
    name: string
    institution: string | null
    notes: string | null
    type: string
    currency: string
  }
}

export function EditAccountDialog({ account }: EditAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    updateAccountAction,
    initialState
  )
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending && state.ok) {
      setOpen(false)
    }
    wasPending.current = pending
  }, [pending, state.ok])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">Edit</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>
            Type and currency stay fixed so historical balances remain accurate.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={account.id} />

          <div className="grid gap-1.5">
            <Label htmlFor={`name-${account.id}`}>Account name</Label>
            <Input
              id={`name-${account.id}`}
              name="name"
              defaultValue={account.name}
              required
              disabled={pending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`institution-${account.id}`}>Institution</Label>
            <Input
              id={`institution-${account.id}`}
              name="institution"
              defaultValue={account.institution ?? ""}
              disabled={pending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`notes-${account.id}`}>Notes</Label>
            <Textarea
              id={`notes-${account.id}`}
              name="notes"
              defaultValue={account.notes ?? ""}
              disabled={pending}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {account.type} · {account.currency} (locked)
          </p>

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
