"use client"

import { useMemo, useState } from "react"

import { ExchangeRateField } from "@/components/money/exchange-rate-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type ExpenseAccountOption = {
  id: string
  name: string
  currency: string
  cachedBalance: string
}

export type ExpenseCategoryOption = {
  id: string
  name: string
}

const PAYMENT_METHODS = [
  { value: "POS", label: "POS" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CRYPTO_TRANSFER", label: "Crypto transfer" },
  { value: "BINANCE", label: "Binance" },
  { value: "TRUST", label: "TRUST" },
  { value: "OTHER", label: "Other" },
] as const

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type ExpenseFormFieldsProps = {
  accounts: ExpenseAccountOption[]
  categories: ExpenseCategoryOption[]
  defaults?: {
    accountId?: string
    categoryId?: string
    amount?: string
    exchangeRate?: string
    transactionDate?: string
    description?: string
    counterparty?: string
    notes?: string
    paymentMethod?: string
    allowOverdraft?: boolean
  }
  disabled?: boolean
  editingExisting?: boolean
}

export function ExpenseFormFields({
  accounts,
  categories,
  defaults,
  disabled,
  editingExisting = false,
}: ExpenseFormFieldsProps) {
  const [accountId, setAccountId] = useState(
    defaults?.accountId ?? accounts[0]?.id ?? ""
  )
  const [amount, setAmount] = useState(defaults?.amount ?? "")
  const selected = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  )

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an active account before recording expenses.
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="accountId">Payment account</Label>
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
              {account.name} ({account.currency}) · bal {account.cachedBalance}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="categoryId">Category</Label>
        <select
          id="categoryId"
          name="categoryId"
          required
          disabled={disabled}
          defaultValue={defaults?.categoryId ?? categories[0]?.id}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

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
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <ExchangeRateField
        currency={selected?.currency ?? "USD"}
        amount={amount}
        disabled={disabled}
        editingExisting={editingExisting}
        savedExchangeRate={defaults?.exchangeRate}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="transactionDate">Date & time</Label>
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
        <Label htmlFor="counterparty">Merchant / recipient</Label>
        <Input
          id="counterparty"
          name="counterparty"
          required
          disabled={disabled}
          defaultValue={defaults?.counterparty}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Short description</Label>
        <Input
          id="description"
          name="description"
          required
          disabled={disabled}
          defaultValue={defaults?.description}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="paymentMethod">Payment method</Label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          required
          disabled={disabled}
          defaultValue={defaults?.paymentMethod ?? "OTHER"}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          disabled={disabled}
          defaultValue={defaults?.notes ?? ""}
        />
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/40 p-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          name="allowOverdraft"
          value="true"
          defaultChecked={defaults?.allowOverdraft}
          disabled={disabled}
          className="mt-1"
        />
        <span>
          Allow overdraft if this expense exceeds the available balance.
          <span className="mt-1 block text-xs text-muted-foreground">
            By default, spending more than the account balance is blocked.
          </span>
        </span>
      </label>
    </>
  )
}
