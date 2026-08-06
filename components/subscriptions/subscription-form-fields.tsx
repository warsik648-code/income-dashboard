"use client"

import { useMemo, useState } from "react"
import { useStreamerModeOptional, maskSensitivePlain, SensitiveAmountInput } from "@/components/streamer-mode"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type SubscriptionAccountOption = {
  id: string
  name: string
  currency: string
  cachedBalance: string
}

export type SubscriptionCategoryOption = {
  id: string
  name: string
}

const BILLING_FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
] as const

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "TRIAL", label: "Trial" },
  { value: "PAUSED", label: "Paused" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
] as const

const PAYMENT_METHODS = [
  { value: "", label: "None" },
  { value: "POS", label: "POS" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CRYPTO_TRANSFER", label: "Crypto transfer" },
  { value: "BINANCE", label: "Binance" },
  { value: "TRUST", label: "TRUST" },
  { value: "OTHER", label: "Other" },
] as const

function toDateInputValue(value?: string | Date | null) {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export type SubscriptionFormDefaults = {
  name?: string
  provider?: string
  logoUrl?: string | null
  price?: string
  billingFrequency?: string
  customIntervalDays?: number | null
  startDate?: string | Date
  nextRenewalDate?: string | Date
  endDate?: string | Date | null
  accountId?: string
  categoryId?: string | null
  paymentMethod?: string | null
  status?: string
  autoRenew?: boolean
  notes?: string | null
}

type SubscriptionFormFieldsProps = {
  accounts: SubscriptionAccountOption[]
  categories: SubscriptionCategoryOption[]
  defaults?: SubscriptionFormDefaults
  disabled?: boolean
}

export function SubscriptionFormFields({
  accounts,
  categories,
  defaults,
  disabled,
}: SubscriptionFormFieldsProps) {
  const { enabled: streamerMode } = useStreamerModeOptional()
  const [accountId, setAccountId] = useState(
    defaults?.accountId ?? accounts[0]?.id ?? ""
  )
  const [frequency, setFrequency] = useState(
    defaults?.billingFrequency ?? "MONTHLY"
  )
  const selected = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  )

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an active account before adding subscriptions.
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required
            disabled={disabled}
            defaultValue={defaults?.name}
            placeholder="ChatGPT Plus"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="provider">Provider / company</Label>
          <Input
            id="provider"
            name="provider"
            required
            disabled={disabled}
            defaultValue={defaults?.provider}
            placeholder="OpenAI"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="logoUrl">Logo URL (optional)</Label>
        <Input
          id="logoUrl"
          name="logoUrl"
          type="url"
          disabled={disabled}
          defaultValue={defaults?.logoUrl ?? ""}
          placeholder="https://…"
        />
      </div>

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
              {account.name} ({account.currency}) · bal {maskSensitivePlain(streamerMode, account.cachedBalance)}
            </option>
          ))}
        </select>
        {selected ? (
          <p className="text-xs text-muted-foreground">
            Subscription currency will be {selected.currency}.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="price">
            Price {selected ? `(${selected.currency})` : ""}
          </Label>
          <SensitiveAmountInput
            id="price"
            name="price"
            inputMode="decimal"
            required
            disabled={disabled}
            defaultValue={defaults?.price}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="billingFrequency">Billing frequency</Label>
          <select
            id="billingFrequency"
            name="billingFrequency"
            required
            disabled={disabled}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {BILLING_FREQUENCIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {frequency === "CUSTOM" ? (
        <div className="grid gap-1.5">
          <Label htmlFor="customIntervalDays">Custom interval (days)</Label>
          <Input
            id="customIntervalDays"
            name="customIntervalDays"
            inputMode="numeric"
            required
            disabled={disabled}
            defaultValue={
              defaults?.customIntervalDays != null
                ? String(defaults.customIntervalDays)
                : ""
            }
          />
        </div>
      ) : (
        <input type="hidden" name="customIntervalDays" value="" />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            disabled={disabled}
            defaultValue={toDateInputValue(defaults?.startDate)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nextRenewalDate">Next renewal</Label>
          <Input
            id="nextRenewalDate"
            name="nextRenewalDate"
            type="date"
            required
            disabled={disabled}
            defaultValue={toDateInputValue(defaults?.nextRenewalDate)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="endDate">End date (optional)</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            disabled={disabled}
            defaultValue={toDateInputValue(defaults?.endDate)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="categoryId">Category (optional)</Label>
          <select
            id="categoryId"
            name="categoryId"
            disabled={disabled}
            defaultValue={defaults?.categoryId ?? ""}
            className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="paymentMethod">Payment method (optional)</Label>
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
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          required
          disabled={disabled}
          defaultValue={defaults?.status ?? "ACTIVE"}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/40 p-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          name="autoRenew"
          value="true"
          defaultChecked={defaults?.autoRenew ?? true}
          disabled={disabled}
          className="mt-1"
        />
        <span>Auto-renew enabled</span>
      </label>

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
