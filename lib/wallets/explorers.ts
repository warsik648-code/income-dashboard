import type { WalletAsset, WalletNetwork } from "@/generated/prisma/client"

export function explorerAddressUrl(
  network: WalletNetwork,
  address: string,
  asset?: WalletAsset
): string | null {
  const trimmed = address.trim()
  if (!trimmed) return null
  switch (network) {
    case "TRON":
      if (asset === "USDT") {
        return `https://tronscan.org/#/address/${encodeURIComponent(trimmed)}/transfers`
      }
      return `https://tronscan.org/#/address/${encodeURIComponent(trimmed)}`
    case "BITCOIN":
      return `https://mempool.space/address/${encodeURIComponent(trimmed)}`
    case "ETHEREUM":
      return `https://etherscan.io/address/${encodeURIComponent(trimmed)}`
    case "LITECOIN":
      return `https://blockchair.com/litecoin/address/${encodeURIComponent(trimmed)}`
    default:
      return null
  }
}
