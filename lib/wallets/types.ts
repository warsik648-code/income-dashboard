import type {
  WalletAsset,
  WalletNetwork,
  WalletName,
} from "@/generated/prisma/client"

export type { WalletAsset, WalletNetwork, WalletName }

export type BalanceFetchInput = {
  address: string
  asset: WalletAsset
  network: WalletNetwork
  signal?: AbortSignal
}

export type BalanceFetchResult = {
  /** Human decimal string in asset units (not smallest unit). */
  balance: string
  decimals: number
  /** UTC instant when the provider response was obtained. */
  fetchedAt: Date
  /** Optional provider block/chain time as UTC instant. */
  blockTime?: Date
}

export type BalanceProvider = {
  id: string
  supports(asset: WalletAsset, network: WalletNetwork): boolean
  fetchBalance(input: BalanceFetchInput): Promise<BalanceFetchResult>
}

export class WalletProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_ADDRESS"
      | "UNSUPPORTED"
      | "TIMEOUT"
      | "PROVIDER_FAILURE"
      | "NOT_CONFIGURED" = "PROVIDER_FAILURE"
  ) {
    super(message)
    this.name = "WalletProviderError"
  }
}

/** Canonical asset ↔ network pairs for this app. */
export const WALLET_ASSET_NETWORKS: ReadonlyArray<{
  asset: WalletAsset
  network: WalletNetwork
}> = [
  { asset: "USDT", network: "TRON" },
  { asset: "BTC", network: "BITCOIN" },
  { asset: "ETH", network: "ETHEREUM" },
  { asset: "LTC", network: "LITECOIN" },
]

export const WALLET_NAMES: readonly WalletName[] = ["TRUST", "BINANCE"]

/** USDT TRC20 contract on Tron mainnet. */
export const TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
