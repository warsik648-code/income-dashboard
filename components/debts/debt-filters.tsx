import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type DebtFiltersProps = {
  currencies: string[]
  values: {
    direction?: string
    status?: string
    currency?: string
    deleted?: string
  }
}

export function DebtFilters({ currencies, values }: DebtFiltersProps) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-xl border border-border/70 bg-card/40 p-4 md:grid-cols-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="direction">Direction</Label>
        <select
          id="direction"
          name="direction"
          defaultValue={values.direction ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          <option value="LENT_OUT">They owe me</option>
          <option value="OWED_BY_ME">I owe them</option>
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={values.status ?? ""}
          className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
        >
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="PARTIALLY_PAID">Partially paid</option>
          <option value="PAID">Paid</option>
          <option value="WRITTEN_OFF">Written off</option>
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

      <div className="flex items-end gap-2">
        <label className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="deleted"
            value="1"
            defaultChecked={values.deleted === "1"}
          />
          Archived
        </label>
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
        <Button
          type="reset"
          variant="ghost"
          size="sm"
          render={<a href="/dashboard/debts" />}
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
