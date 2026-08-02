type SubscriptionSummaryProps = {
  activeCount: number
  dueCount: number
  monthlyByCurrency: Array<{ currency: string; amount: string }>
  upcoming: Array<{
    id: string
    name: string
    nextRenewalDate: string
    price: string
    currency: string
  }>
  due: Array<{
    id: string
    name: string
    nextRenewalDate: string
    price: string
    currency: string
  }>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function SubscriptionSummary({
  activeCount,
  dueCount,
  monthlyByCurrency,
  upcoming,
  due,
}: SubscriptionSummaryProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-4">
        <p className="text-sm text-muted-foreground">Active / trial</p>
        <p className="font-mono text-2xl tabular-nums tracking-tight">
          {activeCount}
        </p>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Monthly equivalent by currency
          </p>
          {monthlyByCurrency.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active spend yet.</p>
          ) : (
            monthlyByCurrency.map((row) => (
              <p
                key={row.currency}
                className="font-mono text-sm tabular-nums tracking-tight"
              >
                {row.amount} {row.currency}
              </p>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Currencies are never combined without conversion.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
          <p className="text-sm text-muted-foreground">
            Due now ({dueCount})
          </p>
          {due.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing due.</p>
          ) : (
            <ul className="space-y-2">
              {due.slice(0, 5).map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="text-foreground">{item.name}</span>
                  <span className="mt-0.5 block font-mono text-xs tabular-nums text-muted-foreground">
                    {item.price} {item.currency} · {formatDate(item.nextRenewalDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
          <p className="text-sm text-muted-foreground">Upcoming renewals</p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming renewals.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="text-foreground">{item.name}</span>
                  <span className="mt-0.5 block font-mono text-xs tabular-nums text-muted-foreground">
                    {item.price} {item.currency} · {formatDate(item.nextRenewalDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
