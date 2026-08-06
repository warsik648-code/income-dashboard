import "server-only"

import { fromSmallestUnits } from "@/lib/wallets/balance-format"
import { assertValidPublicAddress } from "@/lib/wallets/address"
import {
  utcFromIsoInstant,
  utcFromUnixSeconds,
} from "@/lib/wallets/provider-time"
import {
  WalletProviderError,
  type BalanceProvider,
} from "@/lib/wallets/types"

/**
 * Litecoin balance via BlockCypher.
 * Timestamps: Unix **seconds** (or ISO-8601 with Z/offset).
 */
export function createLitecoinProvider(options?: {
  token?: string
  fetchImpl?: typeof fetch
  baseUrl?: string
}): BalanceProvider {
  const fetchImpl = options?.fetchImpl ?? fetch
  const baseUrl = (
    options?.baseUrl ?? "https://api.blockcypher.com/v1/ltc/main"
  ).replace(/\/$/, "")
  const token = options?.token ?? process.env.BLOCKCYPHER_TOKEN?.trim()

  return {
    id: "blockcypher-ltc",
    supports(asset, network) {
      return asset === "LTC" && network === "LITECOIN"
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
          "Invalid Litecoin address",
          "INVALID_ADDRESS"
        )
      }

      const qs = token ? `?token=${encodeURIComponent(token)}` : ""
      const url = `${baseUrl}/addrs/${encodeURIComponent(normalized)}/balance${qs}`

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
          error instanceof Error ? error.message : "Litecoin provider failed",
          "PROVIDER_FAILURE"
        )
      }

      if (!response.ok) {
        throw new WalletProviderError(
          `BlockCypher HTTP ${response.status}`,
          "PROVIDER_FAILURE"
        )
      }

      const body = (await response.json()) as {
        final_balance?: number
        balance?: number
        error?: string
      }
      if (body.error) {
        throw new WalletProviderError(body.error, "PROVIDER_FAILURE")
      }

      const litoshis = body.final_balance ?? body.balance ?? 0
      const decimals = 8
      const balance = fromSmallestUnits(Math.max(0, litoshis), decimals)

      return { balance, decimals, fetchedAt: new Date() }
    },
  }
}

export function parseBlockCypherUnixSeconds(seconds: number): Date {
  return utcFromUnixSeconds(seconds)
}

export function parseBlockCypherIso(value: string): Date {
  return utcFromIsoInstant(value)
}
