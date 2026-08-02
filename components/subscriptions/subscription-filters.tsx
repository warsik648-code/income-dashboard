import type { SubscriptionAccountOption } from "@/components/subscriptions/subscription-form-fields"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const STATUSES = [
  "ACTIVE",
  "TRIAL",
  "PAUSED",
  "CANCELLED",
  "EXPIRED",
] as const

const FREQUENCIES = [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "CUSTOM",
] as const

type SubscriptionFiltersProps = {
  accounts: SubscriptionAccountOption[]
  currencies: string[]
  values: {
    status?: string
    accountId?: string
    currency?: string
    billingFrequency?: string
    deleted?: string
  }
}

export function SubscriptionFilters({
  accounts,
  currencies,
  values,
}: SubscriptionFiltersProps) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-xl border border-border/70 bg-card/40 p-4 md:grid-cols-2 lg:grid-cols-5"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={values.status ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

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
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="billingFrequency">Billing frequency</Label>
        <select
          id="billingFrequency"
          name="billingFrequency"
          defaultValue={values.billingFrequency ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          {FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {frequency}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2 lg:col-span-1 md:col-span-2">
        <label className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="deleted"
            value="1"
            defaultChecked={values.deleted === "1"}
          />
          Archived only
        </label>
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
        <Button
          type="reset"
          variant="ghost"
          size="sm"
          render={<a href="/dashboard/subscriptions" />}
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
