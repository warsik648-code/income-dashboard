"use client"

import { useActionState } from "react"

import {
  disableWalletIntegrationAction,
  refreshWalletIntegrationAction,
  testWalletConnectionAction,
  updateWalletIntegrationAction,
  type WalletActionState,
} from "@/app/(dashboard)/dashboard/wallets/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatAppDateTime } from "@/lib/time"
import type { WalletIntegrationListItem } from "@/lib/wallets"

const initialState: WalletActionState = {}

type AccountOption = {
  id: string
  name: string
  currency: string
  type: string
}

export function WalletIntegrationsSettings({
  integrations,
  accounts,
}: {
  integrations: WalletIntegrationListItem[]
  accounts: AccountOption[]
}) {
  return (
    <Card className="border-border/70 bg-card/70 shadow-none xl:col-span-2">
      <CardHeader>
        <CardTitle className="text-base tracking-tight">
          Wallet Integrations
        </CardTitle>
        <CardDescription>
          Public addresses only — read-only blockchain balance tracking. Never
          paste a seed phrase, private key, or WalletConnect session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {integrations.map((row) => (
          <WalletIntegrationSettingsRow
            key={row.id}
            row={row}
            accounts={accounts.filter(
              (a) =>
                a.type === row.walletName ||
                a.type === "TRUST" ||
                a.type === "BINANCE"
            )}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function WalletIntegrationSettingsRow({
  row,
  accounts,
}: {
  row: WalletIntegrationListItem
  accounts: AccountOption[]
}) {
  const [saveState, saveAction, savePending] = useActionState(
    updateWalletIntegrationAction,
    initialState
  )
  const [testState, testAction, testPending] = useActionState(
    testWalletConnectionAction,
    initialState
  )
  const [refreshState, refreshAction, refreshPending] = useActionState(
    refreshWalletIntegrationAction,
    initialState
  )
  const [disableState, disableAction, disablePending] = useActionState(
    disableWalletIntegrationAction,
    initialState
  )

  const pending =
    savePending || testPending || refreshPending || disablePending
  const feedback =
    saveState.error ||
    testState.error ||
    refreshState.error ||
    disableState.error ||
    saveState.message ||
    (testState.ok
      ? `Connection OK${testState.balance ? ` · ${testState.balance} ${row.asset}` : ""}`
      : null) ||
    refreshState.message ||
    disableState.message

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {row.walletName} · {row.asset}
          </p>
          <p className="text-xs text-muted-foreground">
            Network {row.network}
            {row.lastSuccessfulRefresh
              ? ` · Last refresh ${formatAppDateTime(row.lastSuccessfulRefresh)}`
              : ""}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {row.isEnabled ? "Enabled" : "Disabled"}
        </p>
      </div>

      <form action={saveAction} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="network" value={row.network} />
        <input type="hidden" name="isEnabled" value="true" />

        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor={`addr-${row.id}`}>Public Address</Label>
          <Input
            id={`addr-${row.id}`}
            name="publicAddress"
            defaultValue={row.publicAddress}
            placeholder={`${row.network} public address`}
            autoComplete="off"
            spellCheck={false}
            disabled={pending}
          />
        </div>

        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor={`acct-${row.id}`}>Linked finance account</Label>
          <select
            id={`acct-${row.id}`}
            name="financialAccountId"
            defaultValue={row.financialAccountId ?? row.linkedAccount?.id ?? ""}
            disabled={pending}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="">
              Auto ({row.walletName} account if present)
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency}) · {account.type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>
            Save
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <form action={testAction}>
          <input type="hidden" name="id" value={row.id} />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Test Connection
          </Button>
        </form>
        <form action={refreshAction}>
          <input type="hidden" name="id" value={row.id} />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Refresh
          </Button>
        </form>
        <form action={disableAction}>
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="publicAddress" value={row.publicAddress} />
          <input type="hidden" name="network" value={row.network} />
          <input
            type="hidden"
            name="financialAccountId"
            value={row.financialAccountId ?? ""}
          />
          <Button type="submit" size="sm" variant="ghost" disabled={pending}>
            Disable
          </Button>
        </form>
      </div>

      {feedback ? (
        <p
          className={
            saveState.error ||
            testState.error ||
            refreshState.error ||
            disableState.error
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {feedback}
        </p>
      ) : null}
    </div>
  )
}
