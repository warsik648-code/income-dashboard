import "server-only"

import { fromSmallestUnits } from "@/lib/wallets/balance-format"
import { assertValidPublicAddress } from "@/lib/wallets/address"
import { utcFromUnixSeconds } from "@/lib/wallets/provider-time"
import {
  WalletProviderError,
  type BalanceProvider,
} from "@/lib/wallets/types"

/**
 * Bitcoin balance via mempool.space.
 * Address stats timestamps: Unix **seconds** → multiply by 1000.
 */
export function createBitcoinProvider(options?: {
  fetchImpl?: typeof fetch
  baseUrl?: string
}): BalanceProvider {
  const fetchImpl = options?.fetchImpl ?? fetch
  const baseUrl = (options?.baseUrl ?? "https://mempool.space/api").replace(
    /\/$/,
    ""
  )

  return {
    id: "mempool-space",
    supports(asset, network) {
      return asset === "BTC" && network === "BITCOIN"
    },
    async fetchBalance({ address, asset, network, signal }) {
      if (!this.supports(asset, network)) {
        throw new WalletProviderError("Unsupported asset/network", "UNSUPPORTED")
      }
      let normalized: string
      try {
        normalized = assertValidPublicAddress(network, address)
      } catch {
        throw new WalletProviderError(
          "Invalid Bitcoin address",
          "INVALID_ADDRESS"
        )
      }

      const url = `${baseUrl}/address/${encodeURIComponent(normalized)}`
      let response: Response
      try {
        response = await fetchImpl(url, {
          headers: { Accept: "application/json" },
          signal,
        })
      } catch (error) {
        if (signal?.aborted) {
          throw new WalletProviderError("Provider request timed out", "TIMEOUT")
        }
        throw new WalletProviderError(
          error instanceof Error ? error.message : "Bitcoin provider failed",
          "PROVIDER_FAILURE"
        )
      }

      if (!response.ok) {
        throw new WalletProviderError(
          `mempool.space HTTP ${response.status}`,
          "PROVIDER_FAILURE"
        )
      }

      const body = (await response.json()) as {
        chain_stats?: {
          funded_txo_sum?: number
          spent_txo_sum?: number
        }
        mempool_stats?: {
          funded_txo_sum?: number
          spent_txo_sum?: number
        }
      }

      const chainFunded = body.chain_stats?.funded_txo_sum ?? 0
      const chainSpent = body.chain_stats?.spent_txo_sum ?? 0
      const memFunded = body.mempool_stats?.funded_txo_sum ?? 0
      const memSpent = body.mempool_stats?.spent_txo_sum ?? 0
      const sats = chainFunded - chainSpent + memFunded - memSpent
      const decimals = 8
      const balance = fromSmallestUnits(Math.max(0, sats), decimals)

      return { balance, decimals, fetchedAt: new Date() }
    },
  }
}

export function parseMempoolUnixSeconds(seconds: number): Date {
  return utcFromUnixSeconds(seconds)
}
