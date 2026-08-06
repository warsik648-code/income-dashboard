"use client"

import { useState } from "react"

import { ExchangeRateField } from "@/components/money/exchange-rate-field"
import { SUPPORTED_CURRENCIES } from "@/lib/money/currency"
import { SensitiveAmountInput } from "@/components/streamer-mode"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type DebtAccountOption = {
  id: string
  name: string
  currency: string
  cachedBalance: string
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export type DebtFormDefaults = {
  personName?: string
  direction?: string
  originalAmount?: string
  currency?: string
  exchangeRate?: string
  dueDate?: string | Date | null
  notes?: string | null
  status?: string
  accountId?: string | null
}

export function DebtFormFields({
  accounts,
  defaults,
  disabled,
  showStatus,
  editingExisting = false,
}: {
  accounts: DebtAccountOption[]
  defaults?: DebtFormDefaults
  disabled?: boolean
  showStatus?: boolean
  editingExisting?: boolean
}) {
  const [currency, setCurrency] = useState(defaults?.currency ?? "USD")
  const [amount, setAmount] = useState(defaults?.originalAmount ?? "")
  const matchingAccounts = accounts.filter((a) => a.currency === currency)

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="personName">Person name</Label>
        <Input
          id="personName"
          name="personName"
          required
          disabled={disabled}
          defaultValue={defaults?.personName}
          placeholder="Who is involved?"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="direction">Direction</Label>
        <select
          id="direction"
          name="direction"
          required
          disabled={disabled}
          defaultValue={defaults?.direction ?? "LENT_OUT"}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <option value="LENT_OUT">They owe me</option>
          <option value="OWED_BY_ME">I owe them</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="originalAmount">Original amount</Label>
          <SensitiveAmountInput
            id="originalAmount"
            name="originalAmount"
            inputMode="decimal"
            required
            disabled={disabled}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            name="currency"
            required
            disabled={disabled}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ExchangeRateField
        currency={currency}
        amount={amount}
        disabled={disabled}
        editingExisting={editingExisting}
        savedExchangeRate={defaults?.exchangeRate}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="dueDate">Due date (optional)</Label>
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
          disabled={disabled}
          defaultValue={toDateInputValue(defaults?.dueDate)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="accountId">Preferred account (optional)</Label>
        <select
          id="accountId"
          name="accountId"
          disabled={disabled}
          defaultValue={defaults?.accountId ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <option value="">None</option>
          {matchingAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Used as a default when recording payments with account impact.
        </p>
      </div>

      {showStatus ? (
        <div className="grid gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            required
            disabled={disabled}
            defaultValue={defaults?.status ?? "OPEN"}
            className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="OPEN">Open</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
            <option value="WRITTEN_OFF">Written off</option>
          </select>
        </div>
      ) : (
        <input type="hidden" name="status" value="OPEN" />
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          disabled={disabled}
          defaultValue={defaults?.notes ?? ""}
        />
      </div>
    </>
  )
}
