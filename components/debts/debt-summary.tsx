import { SensitiveValue } from "@/components/streamer-mode"
type AmountRow = { currency: string; amount: string }

export function DebtSummary({
  openCount,
  owedToMeByCurrency,
  iOweByCurrency,
}: {
  openCount: number
  owedToMeByCurrency: AmountRow[]
  iOweByCurrency: AmountRow[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
        <p className="text-sm text-muted-foreground">Total owed to me</p>
        {owedToMeByCurrency.length === 0 ? (
          <SensitiveValue className="font-mono text-lg tabular-nums tracking-tight">
            0
          </SensitiveValue>
        ) : (
          owedToMeByCurrency.map((row) => (
            <SensitiveValue
              key={row.currency}
              as="p"
              className="font-mono text-lg tabular-nums tracking-tight"
            >
              {row.amount} {row.currency}
            </SensitiveValue>
          ))
        )}
        <p className="text-xs text-muted-foreground">
          Remaining balances only · {openCount} open
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
        <p className="text-sm text-muted-foreground">Total I owe</p>
        {iOweByCurrency.length === 0 ? (
          <SensitiveValue className="font-mono text-lg tabular-nums tracking-tight">
            0
          </SensitiveValue>
        ) : (
          iOweByCurrency.map((row) => (
            <SensitiveValue
              key={row.currency}
              as="p"
              className="font-mono text-lg tabular-nums tracking-tight"
            >
              {row.amount} {row.currency}
            </SensitiveValue>
          ))
        )}
        <p className="text-xs text-muted-foreground">
          Currencies are never combined without conversion.
        </p>
      </div>
    </div>
  )
}
