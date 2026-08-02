export const ACCOUNT_TYPES = [
  { value: "BANK", label: "Bank" },
  { value: "CASH", label: "Cash" },
  { value: "BINANCE", label: "Binance" },
  { value: "TRUST", label: "TRUST" },
  { value: "OTHER", label: "Other" },
] as const

export const ASSET_CLASSES = [
  { value: "FIAT", label: "Fiat" },
  { value: "CRYPTO", label: "Crypto" },
] as const

export function formatAccountType(type: string) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type
}

export function formatBalance(amount: { toString(): string }, currency: string) {
  return `${amount.toString()} ${currency}`
}
