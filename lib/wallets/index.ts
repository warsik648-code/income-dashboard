/** Client-safe wallet helpers. Server providers live in registry/providers. */

export {
  WALLET_ASSET_NETWORKS,
  WALLET_NAMES,
  TRON_USDT_CONTRACT,
  WalletProviderError,
  type BalanceFetchInput,
  type BalanceFetchResult,
  type BalanceProvider,
  type WalletAsset,
  type WalletName,
  type WalletNetwork,
} from "./types"
export {
  assertValidPublicAddress,
  isValidPublicAddress,
  looksLikeSecretMaterial,
  normalizePublicAddress,
} from "./address"
export { explorerAddressUrl } from "./explorers"
export { fromSmallestUnits, subtractBalances } from "./balance-format"
export {
  utcFromHexUnixSeconds,
  utcFromIsoInstant,
  utcFromUnixMilliseconds,
  utcFromUnixSeconds,
} from "./provider-time"
export {
  WALLET_BALANCE_CACHE_TTL_MS,
  clearCachedWalletBalance,
  getCachedWalletBalance,
  resetWalletBalanceCacheForTests,
  setCachedWalletBalance,
  walletBalanceCacheKey,
} from "./cache"
export {
  checkWalletRefreshLimit,
  recordWalletRefresh,
  resetWalletRefreshLimitForTests,
} from "./rate-limit"
export type {
  WalletAssetDashboardRow,
  WalletDashboard,
  WalletIntegrationListItem,
} from "./dto"
