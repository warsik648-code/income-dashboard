"use client"

import { useState } from "react"

import { SUPPORTED_CURRENCIES } from "@/lib/money/currency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom" },
] as const

type Option = { id: string; name: string }

export function AnalyticsFilters({
  accounts,
  incomeCategories,
  expenseCategories,
  values,
}: {
  accounts: Option[]
  incomeCategories: Option[]
  expenseCategories: Option[]
  values: {
    preset?: string
    from?: string
    to?: string
    accountId?: string
    currency?: string
    incomeCategoryId?: string
    expenseCategoryId?: string
  }
}) {
  const [preset, setPreset] = useState(values.preset ?? "this_month")

  return (
    <form
      method="get"
      className="grid gap-3 rounded-xl border border-border/70 bg-card/40 p-4 md:grid-cols-3 lg:grid-cols-6"
    >
      <div className="grid gap-1.5 lg:col-span-2">
        <Label htmlFor="preset">Date range</Label>
        <select
          id="preset"
          name="preset"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          {PRESETS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {preset === "custom" ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              name="from"
              type="date"
              required
              defaultValue={values.from ?? ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              name="to"
              type="date"
              required
              defaultValue={values.to ?? ""}
            />
          </div>
        </>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="accountId">Account</Label>
        <select
          id="accountId"
          name="accountId"
          defaultValue={values.accountId ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="currency">Currency</Label>
        <select
          id="currency"
          name="currency"
          defaultValue={values.currency ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="incomeCategoryId">Income category</Label>
        <select
          id="incomeCategoryId"
          name="incomeCategoryId"
          defaultValue={values.incomeCategoryId ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          {incomeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="expenseCategoryId">Expense category</Label>
        <select
          id="expenseCategoryId"
          name="expenseCategoryId"
          defaultValue={values.expenseCategoryId ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2 md:col-span-3 lg:col-span-6">
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
        <Button
          type="reset"
          variant="ghost"
          size="sm"
          render={<a href="/dashboard/analytics" />}
        >
          Clear
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">
          Combined totals use frozen USD snapshots.
        </p>
      </div>
    </form>
  )
}
