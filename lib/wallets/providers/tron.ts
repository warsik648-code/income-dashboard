import "server-only"

import { fromSmallestUnits } from "@/lib/wallets/balance-format"
import { assertValidPublicAddress } from "@/lib/wallets/address"
import { utcFromUnixMilliseconds } from "@/lib/wallets/provider-time"
import {
  TRON_USDT_CONTRACT,
  WalletProviderError,
  type BalanceProvider,
} from "@/lib/wallets/types"

/**
 * TronGrid TRC20 USDT balance.
 * Timestamp unit when present: Unix **milliseconds**.
 */
export function createTronGridProvider(options?: {
  apiKey?: string
  fetchImpl?: typeof fetch
  baseUrl?: string
}): BalanceProvider {
  const fetchImpl = options?.fetchImpl ?? fetch
  const baseUrl = (options?.baseUrl ?? "https://api.trongrid.io").replace(
    /\/$/,
    ""
  )
  const apiKey = options?.apiKey ?? process.env.TRONGRID_API_KEY?.trim()

  return {
    id: "trongrid",
    supports(asset, network) {
      return asset === "USDT" && network === "TRON"
    },
    async fetchBalance({ address, asset, network, signal }) {
      if (!this.supports(asset, network)) {
        throw new WalletProviderError("Unsupported asset/network", "UNSUPPORTED")
      }
      let normalized: string
      try {
        normalized = assertValidPublicAddress(network, address)
      } catch {
        throw new WalletProviderError("Invalid TRON address", "INVALID_ADDRESS")
      }

      const url = `${baseUrl}/v1/accounts/${encodeURIComponent(normalized)}/tokens?limit=200`
      const headers: Record<string, string> = {
        Accept: "application/json",
      }
      if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey

      let response: Response
      try {
        response = await fetchImpl(url, { headers, signal })
      } catch (error) {
        if (signal?.aborted) {
          throw new WalletProviderError("Provider request timed out", "TIMEOUT")
        }
        throw new WalletProviderError(
          error instanceof Error ? error.message : "TronGrid request failed",
          "PROVIDER_FAILURE"
        )
      }

      if (!response.ok) {
        throw new WalletProviderError(
          `TronGrid HTTP ${response.status}`,
          "PROVIDER_FAILURE"
        )
      }

      const body = (await response.json()) as {
        data?: Array<{
          token_id?: string
          tokenId?: string
          balance?: string | number
          token_abbr?: string
          tokenAbbr?: string
        }>
        success?: boolean
      }

      const tokens = body.data ?? []
      const usdt = tokens.find((t) => {
        const id = (t.token_id ?? t.tokenId ?? "").trim()
        const abbr = (t.token_abbr ?? t.tokenAbbr ?? "").toUpperCase()
        return id === TRON_USDT_CONTRACT || abbr === "USDT"
      })

      const rawBalance = usdt?.balance ?? 0
      const decimals = 6
      const balance = fromSmallestUnits(rawBalance, decimals)
      const fetchedAt = new Date()

      return { balance, decimals, fetchedAt }
    },
  }
}

/** Exported for tests that assert TronGrid ms parsing. */
export function parseTronGridTimestampMs(ms: number): Date {
  return utcFromUnixMilliseconds(ms)
}
