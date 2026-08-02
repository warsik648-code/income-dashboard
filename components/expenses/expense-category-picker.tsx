"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type CategoryOption = { id: string; name: string }

const LAST_CATEGORY_KEY = "income-dashboard:last-expense-category"

export function readLastExpenseCategoryId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(LAST_CATEGORY_KEY)
  } catch {
    return null
  }
}

export function rememberLastExpenseCategoryId(categoryId: string) {
  if (typeof window === "undefined" || !categoryId) return
  try {
    window.localStorage.setItem(LAST_CATEGORY_KEY, categoryId)
  } catch {
    // Ignore quota / private mode failures.
  }
}

type ExpenseCategoryPickerProps = {
  categories: CategoryOption[]
  frequentIds?: string[]
  value: string
  onChange: (categoryId: string) => void
  disabled?: boolean
  error?: string | null
  id?: string
}

export function ExpenseCategoryPicker({
  categories,
  frequentIds = [],
  value,
  onChange,
  disabled,
  error,
  id = "categoryId",
}: ExpenseCategoryPickerProps) {
  const [query, setQuery] = useState("")

  const frequent = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]))
    return frequentIds
      .map((fid) => byId.get(fid))
      .filter((c): c is CategoryOption => Boolean(c))
  }, [categories, frequentIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, query])

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Category</Label>
      <input type="hidden" name="categoryId" value={value} />

      {frequent.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {frequent.map((category) => {
            const selected = category.id === value
            return (
              <button
                key={category.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(category.id)}
                className={cn(
                  "h-10 shrink-0 rounded-md border px-3 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/60 text-foreground hover:bg-muted"
                )}
              >
                {category.name}
              </button>
            )
          })}
        </div>
      ) : null}

      <Input
        id={`${id}-search`}
        type="search"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all categories"
        className="h-11 text-base md:h-8 md:text-sm"
        autoComplete="off"
      />

      <select
        id={id}
        disabled={disabled}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-md border border-input bg-input/20 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 md:h-8 md:text-sm",
          error ? "border-destructive" : null
        )}
      >
        <option value="">Select category</option>
        {filtered.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Frequent categories first · full list searchable below
        </p>
      )}
    </div>
  )
}
