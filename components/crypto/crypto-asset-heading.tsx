import { CryptoIcon, type CryptoIconAsset } from "@/components/crypto/crypto-icon"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  LTC: "Litecoin",
  USDT: "Tether",
}

type CryptoAssetHeadingProps = {
  asset: CryptoIconAsset
  /** When TRON (or omitted for USDT in this app), show TRC20 badge. */
  network?: string | null
  size?: number
  className?: string
  /** Compact single-line for dense lists */
  compact?: boolean
}

export function cryptoAssetDisplayName(asset: string): string {
  const code = asset.trim().toUpperCase()
  return ASSET_NAMES[code] ?? code
}

export function showUsdtTrc20Badge(
  asset: string,
  network?: string | null
): boolean {
  const code = asset.trim().toUpperCase()
  if (code !== "USDT") return false
  if (!network) return true
  return network.trim().toUpperCase() === "TRON"
}

/**
 * Reusable crypto identity block for wallet cards, settings, and future
 * income/expense/transfer rows involving crypto assets.
 */
export function CryptoAssetHeading({
  asset,
  network,
  size = 26,
  className,
  compact = false,
}: CryptoAssetHeadingProps) {
  const code = asset.trim().toUpperCase()
  const name = cryptoAssetDisplayName(code)
  const trc20 = showUsdtTrc20Badge(code, network)

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <CryptoIcon asset={code} size={size} />
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium">{code}</span>
          {trc20 ? (
            <Badge variant="outline" className="px-1.5 py-0 text-[0.625rem]">
              TRC20
            </Badge>
          ) : null}
        </span>
      </span>
    )
  }

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <CryptoIcon asset={code} size={size} className="mt-0.5" />
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-medium tracking-tight text-foreground">
          {name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{code}</span>
          {trc20 ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[0.625rem]">
              TRC20
            </Badge>
          ) : null}
        </p>
      </div>
    </div>
  )
}
