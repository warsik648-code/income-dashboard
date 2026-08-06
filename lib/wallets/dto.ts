import type {
  AccountType,
  WalletAsset,
  WalletName,
  WalletNetwork,
} from "@/generated/prisma/client"

export type WalletIntegrationListItem = {
  id: string
  walletName: WalletName
  asset: WalletAsset
  network: WalletNetwork
  publicAddress: string
  isEnabled: boolean
  financialAccountId: string | null
  lastSuccessfulRefresh: Date | null
  linkedAccount: {
    id: string
    name: string
    type: AccountType
    currency: string
    cachedBalance: string
  } | null
  explorerUrl: string | null
}

export type WalletAssetDashboardRow = WalletIntegrationListItem & {
  liveBalance: string | null
  recordedBalance: string | null
  recordedCurrency: string | null
  difference: string | null
  fetchedAt: Date | null
  fromCache: boolean
  error: string | null
}

export type WalletDashboard = {
  groups: Array<{
    walletName: WalletName
    rows: WalletAssetDashboardRow[]
  }>
}
