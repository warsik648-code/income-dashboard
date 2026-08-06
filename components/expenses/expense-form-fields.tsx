"use client"

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react"

import { maskSensitivePlain, useStreamerModeOptional, SensitiveAmountInput } from "@/components/streamer-mode"

import {
  ExpenseCategoryPicker,
  readLastExpenseCategoryId,
} from "@/components/expenses/expense-category-picker"
import { ExchangeRateField } from "@/components/money/exchange-rate-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

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

export type ExpenseFormFieldsHandle = {
  /** Returns true when client validation passes. */
  validate: () => boolean
  focusAmount: () => void
  getCategoryId: () => string
  getAccountId: () => string
}

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

export function toExpenseDateTimeLocalValue(value: Date | string = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function initialCategoryId(
  categories: ExpenseCategoryOption[],
  defaults?: { categoryId?: string },
  preferLastUsed = false
) {
  if (defaults?.categoryId) {
    const exists = categories.some((c) => c.id === defaults.categoryId)
    if (exists) return defaults.categoryId
  }
  if (preferLastUsed) {
    const last = readLastExpenseCategoryId()
    if (last && categories.some((c) => c.id === last)) return last
  }
  return ""
}

type FieldErrors = {
  accountId?: string
  amount?: string
  categoryId?: string
  transactionDate?: string
  exchangeRate?: string
}

type ExpenseFormFieldsProps = {
  accounts: ExpenseAccountOption[]
  categories: ExpenseCategoryOption[]
  frequentCategoryIds?: string[]
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
  /** Prefer last-used category when valid; leave empty otherwise. */
  quickEntry?: boolean
  detailsOpenDefault?: boolean
  formResetKey?: number
}

export const ExpenseFormFields = forwardRef<
  ExpenseFormFieldsHandle,
  ExpenseFormFieldsProps
>(function ExpenseFormFields(
  {
    accounts,
    categories,
    frequentCategoryIds = [],
    defaults,
    disabled,
    editingExisting = false,
    quickEntry = false,
    detailsOpenDefault,
    formResetKey = 0,
  },
  ref
) {
  const { enabled: streamerMode } = useStreamerModeOptional()
  const [accountId, setAccountId] = useState(
    defaults?.accountId ?? accounts[0]?.id ?? ""
  )
  const [amount, setAmount] = useState(defaults?.amount ?? "")
  const [categoryId, setCategoryId] = useState(() =>
    initialCategoryId(categories, defaults, quickEntry)
  )
  const [transactionDate, setTransactionDate] = useState(
    defaults?.transactionDate ?? toExpenseDateTimeLocalValue()
  )
  const [detailsOpen, setDetailsOpen] = useState(
    detailsOpenDefault ?? editingExisting
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [rateState, setRateState] = useState({
    rate:
      editingExisting && defaults?.exchangeRate ? defaults.exchangeRate : "",
    loading: false,
    error: null as string | null,
    isUsd: true,
  })
  const selected = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  )

  const [prevResetKey, setPrevResetKey] = useState(formResetKey)
  if (formResetKey !== prevResetKey) {
    setPrevResetKey(formResetKey)
    setAmount("")
    setTransactionDate(toExpenseDateTimeLocalValue())
    setDetailsOpen(false)
    setErrors({})
  }

  useImperativeHandle(ref, () => ({
    validate() {
      const next: FieldErrors = {}
      if (!accountId.trim()) next.accountId = "Select an account."
      if (!categoryId.trim()) next.categoryId = "Select a category."
      const trimmedAmount = amount.trim()
      if (
        !trimmedAmount ||
        !/^\d+(\.\d+)?$/.test(trimmedAmount) ||
        /^0+(\.0+)?$/.test(trimmedAmount)
      ) {
        next.amount = "Enter a valid amount greater than zero."
      }
      if (!transactionDate.trim()) {
        next.transactionDate = "Date and time are required."
      } else if (Number.isNaN(new Date(transactionDate).getTime())) {
        next.transactionDate = "Enter a valid date and time."
      }
      const currency = selected?.currency ?? "USD"
      if (currency !== "USD") {
        if (rateState.loading && !rateState.rate.trim()) {
          next.exchangeRate =
            "Wait for the live rate, or enter one in More details."
        } else if (!rateState.rate.trim()) {
          next.exchangeRate =
            "Enter a valid exchange rate for this non-USD account."
        }
      }
      setErrors(next)
      if (Object.values(next).some(Boolean)) {
        if (next.amount) {
          document.getElementById("amount")?.focus()
        } else if (next.exchangeRate) {
          setDetailsOpen(true)
        }
        return false
      }
      return true
    },
    focusAmount() {
      document.getElementById("amount")?.focus()
    },
    getCategoryId: () => categoryId,
    getAccountId: () => accountId,
  }))

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an active account before recording expenses.
      </p>
    )
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an expense category before recording expenses.
      </p>
    )
  }

  const fieldClass =
    "h-11 w-full rounded-md border border-input bg-input/20 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 md:h-8 md:text-sm"

  const needsRate =
    Boolean(selected && selected.currency !== "USD") &&
    !rateState.rate.trim() &&
    !rateState.loading

  const fxWarning =
    selected && selected.currency !== "USD"
      ? rateState.loading
        ? "Loading live exchange rate…"
        : rateState.error || needsRate
          ? rateState.error
            ? `${rateState.error}. Open More details to enter a rate.`
            : "Exchange rate needed — open More details to enter it manually."
          : null
      : null

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="accountId">Account</Label>
        <select
          id="accountId"
          name="accountId"
          disabled={disabled}
          value={accountId}
          aria-invalid={Boolean(errors.accountId)}
          onChange={(e) => {
            setAccountId(e.target.value)
            setErrors((prev) => ({ ...prev, accountId: undefined }))
          }}
          className={cn(fieldClass, errors.accountId && "border-destructive")}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency}) · {maskSensitivePlain(streamerMode, account.cachedBalance)}
            </option>
          ))}
        </select>
        {errors.accountId ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.accountId}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Currency locked to account: {selected?.currency}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="amount">
          Amount {selected ? `(${selected.currency})` : ""}
        </Label>
        <SensitiveAmountInput
          id="amount"
          name="amount"
          inputMode="decimal"
          enterKeyHint="done"
          disabled={disabled}
          value={amount}
          aria-invalid={Boolean(errors.amount)}
          onChange={(e) => {
            setAmount(e.target.value)
            setErrors((prev) => ({ ...prev, amount: undefined }))
          }}
          className="h-11 text-base md:h-8 md:text-sm"
          autoComplete="off"
        />
        {errors.amount ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.amount}
          </p>
        ) : null}
      </div>

      <ExpenseCategoryPicker
        categories={categories}
        frequentIds={frequentCategoryIds}
        value={categoryId}
        disabled={disabled}
        error={errors.categoryId}
        onChange={(next) => {
          setCategoryId(next)
          setErrors((prev) => ({ ...prev, categoryId: undefined }))
        }}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="transactionDate">Date & time</Label>
        <Input
          id="transactionDate"
          name="transactionDate"
          type="datetime-local"
          disabled={disabled}
          value={transactionDate}
          aria-invalid={Boolean(errors.transactionDate)}
          onChange={(e) => {
            setTransactionDate(e.target.value)
            setErrors((prev) => ({ ...prev, transactionDate: undefined }))
          }}
          className="h-11 text-base md:h-8 md:text-sm"
        />
        {errors.transactionDate ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.transactionDate}
          </p>
        ) : null}
      </div>

      {fxWarning ? (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
          {fxWarning}
        </p>
      ) : selected && selected.currency !== "USD" && rateState.rate ? (
        <p className="text-xs text-muted-foreground">
          Live rate ready · 1 USD = {rateState.rate} {selected.currency}
        </p>
      ) : null}

      {errors.exchangeRate ? (
        <p className="text-xs text-destructive" role="alert">
          {errors.exchangeRate}
        </p>
      ) : null}

      <details
        className="rounded-lg border border-border/70 bg-background/40"
        open={detailsOpen}
        onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            More details
            <span className="text-xs font-normal text-muted-foreground">
              {detailsOpen ? "Hide" : "Optional"}
            </span>
          </span>
        </summary>
        <div className="grid gap-4 border-t border-border/60 px-3 py-3">
          <div className="grid gap-1.5">
            <Label htmlFor="counterparty">Merchant / payee</Label>
            <Input
              key={`counterparty-${formResetKey}`}
              id="counterparty"
              name="counterparty"
              disabled={disabled}
              defaultValue={defaults?.counterparty ?? ""}
              className="h-11 text-base md:h-8 md:text-sm"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              key={`description-${formResetKey}`}
              id="description"
              name="description"
              disabled={disabled}
              defaultValue={defaults?.description ?? ""}
              placeholder="Defaults to category name if empty"
              className="h-11 text-base md:h-8 md:text-sm"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="paymentMethod">Payment method</Label>
            <select
              key={`paymentMethod-${formResetKey}`}
              id="paymentMethod"
              name="paymentMethod"
              disabled={disabled}
              defaultValue={defaults?.paymentMethod ?? ""}
              className={fieldClass}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value || "none"} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              key={`notes-${formResetKey}`}
              id="notes"
              name="notes"
              disabled={disabled}
              defaultValue={defaults?.notes ?? ""}
            />
          </div>

          <ExchangeRateField
            currency={selected?.currency ?? "USD"}
            amount={amount}
            disabled={disabled}
            editingExisting={editingExisting}
            savedExchangeRate={defaults?.exchangeRate}
            htmlRequired={false}
            compact
            onRateStateChange={setRateState}
          />

          <p className="text-xs text-muted-foreground">
            Attachments / proof can be added on the expense after saving.
          </p>

          <label className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/40 p-3 text-sm leading-relaxed">
            <input
              key={`allowOverdraft-${formResetKey}`}
              type="checkbox"
              name="allowOverdraft"
              value="true"
              defaultChecked={defaults?.allowOverdraft}
              disabled={disabled}
              className="mt-1 size-4"
            />
            <span>
              Allow overdraft if this expense exceeds the available balance.
              <span className="mt-1 block text-xs text-muted-foreground">
                By default, spending more than the account balance is blocked.
              </span>
            </span>
          </label>
        </div>
      </details>
    </>
  )
})
