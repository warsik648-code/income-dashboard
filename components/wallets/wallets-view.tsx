"use client"

import { useActionState, useEffect, useState } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"

import {
  refreshAllWalletIntegrationsAction,
  refreshWalletIntegrationAction,
  type WalletActionState,
} from "@/app/(dashboard)/dashboard/wallets/actions"
import { CryptoAssetHeading } from "@/components/crypto"
import { PageHeader } from "@/components/layout/page-header"
import {
  STREAMER_HIDDEN_PLACEHOLDER,
  useStreamerModeOptional,
} from "@/components/streamer-mode"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatAppDateTime } from "@/lib/time"
import type { WalletDashboard } from "@/lib/wallets"

const initialState: WalletActionState = {}

function formatRelativeFromUtc(instant: Date | string | null): string {
  if (!instant) return "Never"
  const date = typeof instant === "string" ? new Date(instant) : instant
  if (Number.isNaN(date.getTime())) return "—"
  const deltaMs = Date.now() - date.getTime()
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) return "Updated just now"
  if (minutes === 1) return "Updated 1 minute ago"
  if (minutes < 60) return `Updated ${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return "Updated 1 hour ago"
  if (hours < 48) return `Updated ${hours} hours ago`
  return `Updated ${formatAppDateTime(date)}`
}

function formatSigned(diff: string | null): string {
  if (diff === null) return "—"
  const n = Number(diff)
  if (!Number.isFinite(n)) return diff
  if (n > 0) return `+${diff}`
  return diff
}

function networkLabel(network: string, asset: string): string {
  if (asset === "USDT" && network === "TRON") return "TRC20"
  switch (network) {
    case "BITCOIN":
      return "Bitcoin"
    case "ETHEREUM":
      return "Ethereum"
    case "LITECOIN":
      return "Litecoin"
    case "TRON":
      return "TRON"
    default:
      return network
  }
}

export function WalletsView({ dashboard }: { dashboard: WalletDashboard }) {
  const { enabled: streamerMode } = useStreamerModeOptional()
  const [refreshAllState, refreshAllAction, refreshAllPending] = useActionState(
    refreshAllWalletIntegrationsAction,
    initialState
  )
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Wallet Integrations"
          description="Read-only blockchain balances for TRUST and Binance. Differences never auto-update your ledger."
        />
        <form action={refreshAllAction}>
          <Button type="submit" disabled={refreshAllPending} variant="outline">
            <RefreshCw
              className={`mr-2 size-4 ${refreshAllPending ? "animate-spin" : ""}`}
            />
            Refresh all
          </Button>
        </form>
      </div>

      {!streamerMode && refreshAllState.error ? (
        <p className="text-sm text-destructive">{refreshAllState.error}</p>
      ) : null}
      {!streamerMode && refreshAllState.message ? (
        <p className="text-sm text-muted-foreground">{refreshAllState.message}</p>
      ) : null}
      {streamerMode && (refreshAllState.error || refreshAllState.message) ? (
        <p className="text-sm text-muted-foreground">Hidden</p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Live balances are cached for 3 minutes. Manual refresh bypasses the
        cache (rate limited). Configure addresses in Settings → Wallet
        Integrations. Never paste a seed phrase or private key.
      </p>

      {dashboard.groups.map((group) => (
        <div key={group.walletName} className="space-y-4">
          <h2 className="font-heading text-lg tracking-tight">
            {group.walletName}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {group.rows.map((row) => (
              <AssetCard
                key={`${row.id}-${tick}`}
                row={row}
                streamerMode={streamerMode}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function AssetCard({
  row,
  streamerMode,
}: {
  row: WalletDashboard["groups"][number]["rows"][number]
  streamerMode: boolean
}) {
  const [state, action, pending] = useActionState(
    refreshWalletIntegrationAction,
    initialState
  )

  const liveDisplay = streamerMode
    ? STREAMER_HIDDEN_PLACEHOLDER
    : row.liveBalance !== null
      ? `${row.liveBalance} ${row.asset}`
      : "—"
  const recordedDisplay = streamerMode
    ? STREAMER_HIDDEN_PLACEHOLDER
    : row.recordedBalance !== null
      ? `${row.recordedBalance} ${row.recordedCurrency ?? ""}`.trim()
      : "—"
  const differenceDisplay = streamerMode
    ? STREAMER_HIDDEN_PLACEHOLDER
    : formatSigned(row.difference)

  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="sr-only">{row.asset}</CardTitle>
            <CryptoAssetHeading asset={row.asset} network={row.network} />
            <CardDescription>
              {networkLabel(row.network, row.asset)}
              {!streamerMode && row.linkedAccount
                ? ` · Linked: ${row.linkedAccount.name}`
                : !streamerMode
                  ? " · No linked account"
                  : null}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant={row.isEnabled ? "secondary" : "outline"}>
              {row.isEnabled ? "Connected" : "Disabled"}
            </Badge>
            {!streamerMode && row.fromCache ? (
              <Badge variant="secondary">Cached</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">Live Balance</dt>
            <dd className="font-mono tabular-nums">{liveDisplay}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Recorded Balance</dt>
            <dd className="font-mono tabular-nums">{recordedDisplay}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Difference</dt>
            <dd className="font-mono tabular-nums">{differenceDisplay}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last Updated</dt>
            <dd>
              {streamerMode ? (
                <span className="font-mono tabular-nums">
                  {STREAMER_HIDDEN_PLACEHOLDER}
                </span>
              ) : (
                <>
                  <span className="block">
                    {formatRelativeFromUtc(row.fetchedAt)}
                  </span>
                  {row.fetchedAt ? (
                    <span className="text-xs text-muted-foreground">
                      {formatAppDateTime(row.fetchedAt)}
                    </span>
                  ) : null}
                </>
              )}
            </dd>
          </div>
        </dl>

        {!streamerMode && row.error ? (
          <p className="text-xs text-destructive">{row.error}</p>
        ) : null}
        {!streamerMode && state.error ? (
          <p className="text-xs text-destructive">{state.error}</p>
        ) : null}
        {!streamerMode && state.message ? (
          <p className="text-xs text-muted-foreground">{state.message}</p>
        ) : null}
        {streamerMode && (row.error || state.error || state.message) ? (
          <p className="text-xs text-muted-foreground">Hidden</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <form action={action}>
            <input type="hidden" name="id" value={row.id} />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={pending || !row.isEnabled}
            >
              <RefreshCw
                className={`mr-1.5 size-3.5 ${pending ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </form>
          {!streamerMode && row.explorerUrl ? (
            <a
              href={row.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              View Explorer
            </a>
          ) : null}
          {streamerMode ? (
            <span className="inline-flex h-6 items-center px-2 text-xs text-muted-foreground">
              Explorer Hidden
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
