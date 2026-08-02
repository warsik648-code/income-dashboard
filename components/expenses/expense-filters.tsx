import type {
  ExpenseAccountOption,
  ExpenseCategoryOption,
} from "@/components/expenses/expense-form-fields"
import { SUPPORTED_CURRENCIES } from "@/lib/money/currency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PAYMENT_METHODS = [
  "POS",
  "CASH",
  "BANK_TRANSFER",
  "CRYPTO_TRANSFER",
  "BINANCE",
  "TRUST",
  "OTHER",
] as const

type ExpenseFiltersProps = {
  accounts: ExpenseAccountOption[]
  categories: ExpenseCategoryOption[]
  values: {
    accountId?: string
    categoryId?: string
    paymentMethod?: string
    currency?: string
    from?: string
    to?: string
    deleted?: string
  }
}

export function ExpenseFilters({
  accounts,
  categories,
  values,
}: ExpenseFiltersProps) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-xl border border-border/70 bg-card/40 p-4 md:grid-cols-3 lg:grid-cols-6"
    >
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
        <Label htmlFor="categoryId">Category</Label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={values.categoryId ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="paymentMethod">Payment method</Label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          defaultValue={values.paymentMethod ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
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
        <Label htmlFor="from">From</Label>
        <Input
          id="from"
          name="from"
          type="date"
          defaultValue={values.from ?? ""}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="to">To</Label>
        <Input id="to" name="to" type="date" defaultValue={values.to ?? ""} />
      </div>

      <div className="flex items-end gap-2 md:col-span-3 lg:col-span-6">
        <label className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="deleted"
            value="1"
            defaultChecked={values.deleted === "1"}
          />
          Show deleted only
        </label>
        <Button type="submit" variant="outline" size="sm">
          Apply filters
        </Button>
        <Button type="reset" variant="ghost" size="sm" render={<a href="/dashboard/expenses" />}>
          Clear
        </Button>
      </div>
    </form>
  )
}
