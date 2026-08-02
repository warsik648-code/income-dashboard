"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type IncomeAccountOption = {
  id: string
  name: string
  currency: string
  type: string
}

const PAYMENT_METHODS = [
  { value: "", label: "None" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CRYPTO_TRANSFER", label: "Crypto transfer" },
  { value: "BINANCE", label: "Binance" },
  { value: "TRUST", label: "TRUST" },
  { value: "POS", label: "POS" },
  { value: "OTHER", label: "Other" },
] as const

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type IncomeFormFieldsProps = {
  accounts: IncomeAccountOption[]
  defaults?: {
    accountId?: string
    amount?: string
    exchangeRate?: string
    transactionDate?: string
    description?: string
    counterparty?: string
    notes?: string
    paymentMethod?: string | null
  }
  disabled?: boolean
}

export function IncomeFormFields({
  accounts,
  defaults,
  disabled,
}: IncomeFormFieldsProps) {
  const initialAccountId = defaults?.accountId ?? accounts[0]?.id ?? ""
  const [accountId, setAccountId] = useState(initialAccountId)

  const selected = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  )
  const needsRate = Boolean(selected && selected.currency !== "USD")

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an active account first before recording income.
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="accountId">Account</Label>
        <select
          id="accountId"
          name="accountId"
          required
          disabled={disabled}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="amount">
            Amount {selected ? `(${selected.currency})` : ""}
          </Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            required
            disabled={disabled}
            defaultValue={defaults?.amount}
            placeholder="0.00"
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
            disabled={disabled || !needsRate}
            defaultValue={
              needsRate ? (defaults?.exchangeRate ?? "") : ""
            }
            placeholder={needsRate ? "USD per 1 unit" : "1"}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="transactionDate">Date & time received</Label>
        <Input
          id="transactionDate"
          name="transactionDate"
          type="datetime-local"
          required
          disabled={disabled}
          defaultValue={
            defaults?.transactionDate ?? toDateTimeLocalValue(new Date())
          }
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Source / description</Label>
        <Input
          id="description"
          name="description"
          required
          disabled={disabled}
          defaultValue={defaults?.description}
          placeholder="Client payment, transfer in, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="counterparty">Sender / customer</Label>
          <Input
            id="counterparty"
            name="counterparty"
            disabled={disabled}
            defaultValue={defaults?.counterparty ?? ""}
            placeholder="Optional"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="paymentMethod">Payment method</Label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            disabled={disabled}
            defaultValue={defaults?.paymentMethod ?? ""}
            className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value || "none"} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          disabled={disabled}
          defaultValue={defaults?.notes ?? ""}
          placeholder="Optional"
        />
      </div>
    </>
  )
}
