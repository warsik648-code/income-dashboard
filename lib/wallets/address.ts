import type { WalletNetwork } from "@/generated/prisma/client"

const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/
const ETH_RE = /^0x[0-9a-fA-F]{40}$/
const BTC_LEGACY_RE = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
const BTC_BECH32_RE = /^(bc1)[ac-hj-np-z02-9]{8,87}$/i
const LTC_LEGACY_RE = /^[LM3][a-km-zA-HJ-NP-Z1-9]{25,34}$/
const LTC_BECH32_RE = /^(ltc1)[ac-hj-np-z02-9]{8,87}$/i

export function normalizePublicAddress(address: string): string {
  return address.trim()
}

export function isValidPublicAddress(
  network: WalletNetwork,
  address: string
): boolean {
  const value = normalizePublicAddress(address)
  if (!value) return false
  switch (network) {
    case "TRON":
      return TRON_RE.test(value)
    case "ETHEREUM":
      return ETH_RE.test(value)
    case "BITCOIN":
      return BTC_LEGACY_RE.test(value) || BTC_BECH32_RE.test(value)
    case "LITECOIN":
      return LTC_LEGACY_RE.test(value) || LTC_BECH32_RE.test(value)
    default:
      return false
  }
}

export function assertValidPublicAddress(
  network: WalletNetwork,
  address: string
): string {
  const value = normalizePublicAddress(address)
  if (!isValidPublicAddress(network, value)) {
    throw new Error(`Invalid ${network} public address`)
  }
  return value
}

/** Reject strings that look like secrets rather than public addresses. */
export function looksLikeSecretMaterial(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (/\b(seed|mnemonic|private\s*key|walletconnect)\b/i.test(v)) return true
  // Hex private keys (64 hex chars, optionally 0x-prefixed)
  if (/^(0x)?[0-9a-fA-F]{64}$/.test(v)) return true
  // BIP39-ish long phrase (12+ words)
  const words = v.split(/\s+/).filter(Boolean)
  if (words.length >= 12 && words.every((w) => /^[a-z]+$/i.test(w))) return true
  return false
}
