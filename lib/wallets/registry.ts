import "server-only"

import { createBitcoinProvider } from "@/lib/wallets/providers/bitcoin"
import { createEthereumProvider } from "@/lib/wallets/providers/ethereum"
import { createLitecoinProvider } from "@/lib/wallets/providers/litecoin"
import { createTronGridProvider } from "@/lib/wallets/providers/tron"
import {
  WalletProviderError,
  type BalanceFetchInput,
  type BalanceFetchResult,
  type BalanceProvider,
  type WalletAsset,
  type WalletNetwork,
} from "@/lib/wallets/types"

export function createDefaultBalanceProviders(): BalanceProvider[] {
  return [
    createTronGridProvider(),
    createBitcoinProvider(),
    createEthereumProvider(),
    createLitecoinProvider(),
  ]
}

export function resolveBalanceProvider(
  providers: BalanceProvider[],
  asset: WalletAsset,
  network: WalletNetwork
): BalanceProvider {
  const match = providers.find((p) => p.supports(asset, network))
  if (!match) {
    throw new WalletProviderError(
      `No balance provider for ${asset} on ${network}`,
      "UNSUPPORTED"
    )
  }
  return match
}

export async function fetchLiveBalance(
  providers: BalanceProvider[],
  input: BalanceFetchInput,
  options?: { timeoutMs?: number }
): Promise<BalanceFetchResult> {
  const provider = resolveBalanceProvider(
    providers,
    input.asset,
    input.network
  )
  const timeoutMs = options?.timeoutMs ?? 12_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  input.signal?.addEventListener("abort", onAbort)

  try {
    return await provider.fetchBalance({
      ...input,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof WalletProviderError) throw error
    if (controller.signal.aborted) {
      throw new WalletProviderError("Provider request timed out", "TIMEOUT")
    }
    throw new WalletProviderError(
      error instanceof Error ? error.message : "Provider failure",
      "PROVIDER_FAILURE"
    )
  } finally {
    clearTimeout(timer)
    input.signal?.removeEventListener("abort", onAbort)
  }
}
