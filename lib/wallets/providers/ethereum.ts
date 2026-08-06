import "server-only"

import { fromSmallestUnits } from "@/lib/wallets/balance-format"
import { assertValidPublicAddress } from "@/lib/wallets/address"
import { utcFromHexUnixSeconds } from "@/lib/wallets/provider-time"
import {
  WalletProviderError,
  type BalanceProvider,
} from "@/lib/wallets/types"

/**
 * Native ETH via JSON-RPC `eth_getBalance`.
 * Block timestamps (if used later): Unix **seconds** (hex quantity).
 * Requires ETHEREUM_RPC_URL.
 */
export function createEthereumProvider(options?: {
  rpcUrl?: string
  fetchImpl?: typeof fetch
}): BalanceProvider {
  const fetchImpl = options?.fetchImpl ?? fetch
  const rpcUrl =
    options?.rpcUrl ?? process.env.ETHEREUM_RPC_URL?.trim() ?? ""

  return {
    id: "ethereum-rpc",
    supports(asset, network) {
      return asset === "ETH" && network === "ETHEREUM"
    },
    async fetchBalance({ address, asset, network, signal }) {
      if (!this.supports(asset, network)) {
        throw new WalletProviderError("Unsupported asset/network", "UNSUPPORTED")
      }
      if (!rpcUrl) {
        throw new WalletProviderError(
          "ETHEREUM_RPC_URL is not configured",
          "NOT_CONFIGURED"
        )
      }
      let normalized: string
      try {
        normalized = assertValidPublicAddress(network, address)
      } catch {
        throw new WalletProviderError(
          "Invalid Ethereum address",
          "INVALID_ADDRESS"
        )
      }

      let response: Response
      try {
        response = await fetchImpl(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getBalance",
            params: [normalized, "latest"],
          }),
          signal,
        })
      } catch (error) {
        if (signal?.aborted) {
          throw new WalletProviderError("Provider request timed out", "TIMEOUT")
        }
        throw new WalletProviderError(
          error instanceof Error ? error.message : "Ethereum RPC failed",
          "PROVIDER_FAILURE"
        )
      }

      if (!response.ok) {
        throw new WalletProviderError(
          `Ethereum RPC HTTP ${response.status}`,
          "PROVIDER_FAILURE"
        )
      }

      const body = (await response.json()) as {
        result?: string
        error?: { message?: string }
      }
      if (body.error) {
        throw new WalletProviderError(
          body.error.message ?? "Ethereum RPC error",
          "PROVIDER_FAILURE"
        )
      }
      const hex = body.result
      if (!hex || !/^0x[0-9a-fA-F]+$/.test(hex)) {
        throw new WalletProviderError(
          "Invalid eth_getBalance result",
          "PROVIDER_FAILURE"
        )
      }

      const wei = BigInt(hex)
      const decimals = 18
      const balance = fromSmallestUnits(wei, decimals)

      return { balance, decimals, fetchedAt: new Date() }
    },
  }
}

export function parseEthereumBlockTimestampHex(hex: string): Date {
  return utcFromHexUnixSeconds(hex)
}
