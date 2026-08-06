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
 *
 * Official endpoint (TronGrid V1):
 * GET /v1/accounts/{address}/trc20/balance
 * Docs: https://developers.tron.network/reference/get-trc20-token-balances-by-address
 *
 * Query param `contract_address` filters to USDT TRC20:
 * TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
 *
 * Response `meta.at` is Unix **milliseconds**.
 * `data` items are single-key maps: { [contractBase58]: rawBalanceString }.
 * Tokens with zero balance are omitted.
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

      const params = new URLSearchParams({
        contract_address: TRON_USDT_CONTRACT,
        limit: "1",
      })
      const url = `${baseUrl}/v1/accounts/${encodeURIComponent(normalized)}/trc20/balance?${params}`
      const headers: Record<string, string> = {
        Accept: "application/json",
      }
      if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey

      let response: Response
      try {
        response = await fetchImpl(url, { headers, signal })
      } catch {
        if (signal?.aborted) {
          throw new WalletProviderError("Provider request timed out", "TIMEOUT")
        }
        throw new WalletProviderError(
          "Could not reach TronGrid to load USDT (TRC20) balance. Check your connection and try again.",
          "PROVIDER_FAILURE"
        )
      }

      let body: {
        data?: Array<Record<string, string>>
        success?: boolean
        error?: string
        statusCode?: number
        meta?: { at?: number }
      } = {}
      try {
        body = (await response.json()) as typeof body
      } catch {
        body = {}
      }

      if (!response.ok || body.success === false) {
        throw new WalletProviderError(
          userFriendlyTronGridError(response.status, body.error),
          "PROVIDER_FAILURE"
        )
      }

      const rawBalance = extractTrc20RawBalance(body.data, TRON_USDT_CONTRACT)
      const decimals = 6
      const balance = fromSmallestUnits(rawBalance, decimals)

      const fetchedAt =
        typeof body.meta?.at === "number" && Number.isFinite(body.meta.at)
          ? utcFromUnixMilliseconds(body.meta.at)
          : new Date()

      return { balance, decimals, fetchedAt }
    },
  }
}

/** Parse TronGrid `data` single-key maps for a contract. Missing → zero. */
export function extractTrc20RawBalance(
  data: Array<Record<string, string>> | undefined,
  contractAddress: string
): string {
  for (const item of data ?? []) {
    if (!item || typeof item !== "object") continue
    const direct = item[contractAddress]
    if (typeof direct === "string" || typeof direct === "number") {
      return String(direct)
    }
    // Defensive: some payloads may use a different key casing/order
    for (const [key, value] of Object.entries(item)) {
      if (key === contractAddress && value != null) return String(value)
    }
  }
  return "0"
}

function userFriendlyTronGridError(
  status: number,
  providerError?: string
): string {
  switch (status) {
    case 400:
      return "Could not load USDT (TRC20) balance: TronGrid rejected the address. Check that it is a valid TRON public address."
    case 401:
    case 403:
      return "Could not load USDT (TRC20) balance: TronGrid rejected the API key. Check TRONGRID_API_KEY."
    case 404:
      return "Could not load USDT (TRC20) balance: TronGrid has no TRC-20 balance data for this address."
    case 429:
      return "Could not load USDT (TRC20) balance: TronGrid rate limit exceeded. Wait a moment and try again."
    case 500:
    case 502:
    case 503:
    case 504:
      return "Could not load USDT (TRC20) balance: TronGrid is temporarily unavailable. Try again later."
  }

  const detail = providerError?.trim()
  if (detail && !/^not found$/i.test(detail)) {
    return `Could not load USDT (TRC20) balance from TronGrid: ${detail}`
  }
  return "Could not load USDT (TRC20) balance from TronGrid. Try again later."
}

/** Exported for tests that assert TronGrid ms parsing. */
export function parseTronGridTimestampMs(ms: number): Date {
  return utcFromUnixMilliseconds(ms)
}
