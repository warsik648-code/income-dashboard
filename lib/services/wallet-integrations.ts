import "server-only"

import type {
  AccountType,
  WalletAsset,
  WalletIntegration,
  WalletName,
  WalletNetwork,
} from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import { writeAuditLog } from "@/lib/services/audit"
import type { UpdateWalletIntegrationInput } from "@/lib/validations/wallet-integrations"
import {
  WALLET_ASSET_NETWORKS,
  WALLET_NAMES,
  clearCachedWalletBalance,
  explorerAddressUrl,
  getCachedWalletBalance,
  isValidPublicAddress,
  looksLikeSecretMaterial,
  normalizePublicAddress,
  setCachedWalletBalance,
  subtractBalances,
  WalletProviderError,
  checkWalletRefreshLimit,
  recordWalletRefresh,
  type BalanceFetchResult,
  type BalanceProvider,
  type WalletAssetDashboardRow,
  type WalletDashboard,
  type WalletIntegrationListItem,
} from "@/lib/wallets"
import {
  createDefaultBalanceProviders,
  fetchLiveBalance,
} from "@/lib/wallets/registry"

export type {
  WalletAssetDashboardRow,
  WalletDashboard,
  WalletIntegrationListItem,
}

export class WalletIntegrationServiceError extends Error {
  constructor(
    message: string,
    readonly code?:
      | "NOT_FOUND"
      | "INVALID_ADDRESS"
      | "RATE_LIMITED"
      | "PROVIDER"
      | "SECRET_REJECTED"
  ) {
    super(message)
    this.name = "WalletIntegrationServiceError"
  }
}

type ServiceDeps = {
  providers?: BalanceProvider[]
}

function providersOf(deps?: ServiceDeps): BalanceProvider[] {
  return deps?.providers ?? createDefaultBalanceProviders()
}

async function resolveLinkedAccount(
  userId: string,
  walletName: WalletName,
  financialAccountId: string | null
) {
  if (financialAccountId) {
    const account = await prisma.financialAccount.findFirst({
      where: {
        id: financialAccountId,
        userId,
        deletedAt: null,
        isArchived: false,
      },
    })
    if (account) return account
  }

  return prisma.financialAccount.findFirst({
    where: {
      userId,
      type: walletName as AccountType,
      deletedAt: null,
      isArchived: false,
    },
    orderBy: [{ name: "asc" }],
  })
}

function toListItem(
  row: WalletIntegration,
  linked: Awaited<ReturnType<typeof resolveLinkedAccount>>
): WalletIntegrationListItem {
  return {
    id: row.id,
    walletName: row.walletName,
    asset: row.asset,
    network: row.network,
    publicAddress: row.publicAddress,
    isEnabled: row.isEnabled,
    financialAccountId: row.financialAccountId,
    lastSuccessfulRefresh: row.lastSuccessfulRefresh,
    linkedAccount: linked
      ? {
          id: linked.id,
          name: linked.name,
          type: linked.type,
          currency: linked.currency,
          cachedBalance: linked.cachedBalance.toString(),
        }
      : null,
    explorerUrl: explorerAddressUrl(
      row.network,
      row.publicAddress,
      row.asset
    ),
  }
}

/** Ensure the eight canonical rows exist. Never creates financial accounts. */
export async function ensureWalletIntegrations(
  userId: string
): Promise<void> {
  const existing = await prisma.walletIntegration.findMany({
    where: { userId },
    select: { walletName: true, asset: true, network: true },
  })
  const have = new Set(
    existing.map((e) => `${e.walletName}:${e.asset}:${e.network}`)
  )

  const creates: Array<{
    userId: string
    walletName: WalletName
    asset: WalletAsset
    network: WalletNetwork
    publicAddress: string
    isEnabled: boolean
  }> = []

  for (const walletName of WALLET_NAMES) {
    for (const pair of WALLET_ASSET_NETWORKS) {
      const key = `${walletName}:${pair.asset}:${pair.network}`
      if (have.has(key)) continue
      creates.push({
        userId,
        walletName,
        asset: pair.asset,
        network: pair.network,
        publicAddress: "",
        isEnabled: false,
      })
    }
  }

  if (creates.length === 0) return
  await prisma.walletIntegration.createMany({ data: creates })
}

export async function listWalletIntegrations(
  userId: string
): Promise<WalletIntegrationListItem[]> {
  await ensureWalletIntegrations(userId)
  const rows = await prisma.walletIntegration.findMany({
    where: { userId },
    orderBy: [{ walletName: "asc" }, { asset: "asc" }],
  })

  const items: WalletIntegrationListItem[] = []
  for (const row of rows) {
    const linked = await resolveLinkedAccount(
      userId,
      row.walletName,
      row.financialAccountId
    )
    items.push(toListItem(row, linked))
  }
  return items
}

export async function updateWalletIntegration(
  userId: string,
  input: UpdateWalletIntegrationInput
): Promise<WalletIntegrationListItem> {
  const existing = await prisma.walletIntegration.findFirst({
    where: { id: input.id, userId },
  })
  if (!existing) {
    throw new WalletIntegrationServiceError(
      "Wallet integration not found",
      "NOT_FOUND"
    )
  }

  const address = normalizePublicAddress(input.publicAddress ?? "")
  if (looksLikeSecretMaterial(address)) {
    throw new WalletIntegrationServiceError(
      "Only public addresses are allowed. Never paste a seed phrase or private key.",
      "SECRET_REJECTED"
    )
  }

  const network = input.network ?? existing.network
  if (address && !isValidPublicAddress(network, address)) {
    throw new WalletIntegrationServiceError(
      `Invalid public address for ${network}`,
      "INVALID_ADDRESS"
    )
  }

  const financialAccountId =
    input.financialAccountId === undefined
      ? existing.financialAccountId
      : input.financialAccountId

  if (financialAccountId) {
    const account = await prisma.financialAccount.findFirst({
      where: {
        id: financialAccountId,
        userId,
        deletedAt: null,
        isArchived: false,
      },
    })
    if (!account) {
      throw new WalletIntegrationServiceError(
        "Linked account not found",
        "NOT_FOUND"
      )
    }
  }

  const isEnabled =
    input.isEnabled !== undefined
      ? input.isEnabled
      : address.length > 0
        ? true
        : false

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.walletIntegration.update({
      where: { id: existing.id },
      data: {
        publicAddress: address,
        financialAccountId,
        isEnabled: Boolean(isEnabled) && address.length > 0,
      },
    })
    await writeAuditLog(tx, {
      userId,
      entityType: "WalletIntegration",
      entityId: next.id,
      action: "UPDATE",
      before: existing,
      after: next,
      reason: "Wallet integration settings updated",
    })
    return next
  })

  clearCachedWalletBalance(userId, updated.id)

  const linked = await resolveLinkedAccount(
    userId,
    updated.walletName,
    updated.financialAccountId
  )
  return toListItem(updated, linked)
}

async function fetchAndCache(
  userId: string,
  row: WalletIntegration,
  deps: ServiceDeps | undefined,
  options: { force: boolean }
): Promise<{
  result: BalanceFetchResult | null
  fromCache: boolean
  error: string | null
}> {
  if (!row.isEnabled || !row.publicAddress.trim()) {
    return {
      result: null,
      fromCache: false,
      error: row.publicAddress.trim()
        ? "Integration is disabled"
        : "Public address not configured",
    }
  }

  if (!options.force) {
    const cached = getCachedWalletBalance(userId, row.id)
    if (cached) {
      return { result: cached, fromCache: true, error: null }
    }
  }

  if (options.force) {
    const limit = checkWalletRefreshLimit(userId)
    if (!limit.allowed) {
      throw new WalletIntegrationServiceError(
        `Too many refreshes. Try again in ${limit.retryAfterSeconds}s.`,
        "RATE_LIMITED"
      )
    }
    recordWalletRefresh(userId)
  }

  try {
    const result = await fetchLiveBalance(providersOf(deps), {
      address: row.publicAddress,
      asset: row.asset,
      network: row.network,
    })
    setCachedWalletBalance(userId, row.id, result)
    await prisma.walletIntegration.update({
      where: { id: row.id },
      data: { lastSuccessfulRefresh: result.fetchedAt },
    })
    return { result, fromCache: false, error: null }
  } catch (error) {
    const message =
      error instanceof WalletProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Provider failure"
    return { result: null, fromCache: false, error: message }
  }
}

export async function testWalletConnection(
  userId: string,
  integrationId: string,
  deps?: ServiceDeps
): Promise<{
  ok: boolean
  balance: string | null
  error: string | null
  fetchedAt: Date | null
}> {
  const row = await prisma.walletIntegration.findFirst({
    where: { id: integrationId, userId },
  })
  if (!row) {
    throw new WalletIntegrationServiceError(
      "Wallet integration not found",
      "NOT_FOUND"
    )
  }
  if (!row.publicAddress.trim()) {
    return {
      ok: false,
      balance: null,
      error: "Public address not configured",
      fetchedAt: null,
    }
  }
  if (!isValidPublicAddress(row.network, row.publicAddress)) {
    return {
      ok: false,
      balance: null,
      error: `Invalid public address for ${row.network}`,
      fetchedAt: null,
    }
  }

  const limit = checkWalletRefreshLimit(userId)
  if (!limit.allowed) {
    throw new WalletIntegrationServiceError(
      `Too many refreshes. Try again in ${limit.retryAfterSeconds}s.`,
      "RATE_LIMITED"
    )
  }
  recordWalletRefresh(userId)

  try {
    const result = await fetchLiveBalance(providersOf(deps), {
      address: row.publicAddress,
      asset: row.asset,
      network: row.network,
    })
    setCachedWalletBalance(userId, row.id, result)
    await prisma.walletIntegration.update({
      where: { id: row.id },
      data: { lastSuccessfulRefresh: result.fetchedAt },
    })
    return {
      ok: true,
      balance: result.balance,
      error: null,
      fetchedAt: result.fetchedAt,
    }
  } catch (error) {
    const message =
      error instanceof WalletProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Provider failure"
    return { ok: false, balance: null, error: message, fetchedAt: null }
  }
}

export async function refreshWalletIntegration(
  userId: string,
  integrationId: string,
  deps?: ServiceDeps
): Promise<WalletAssetDashboardRow> {
  const row = await prisma.walletIntegration.findFirst({
    where: { id: integrationId, userId },
  })
  if (!row) {
    throw new WalletIntegrationServiceError(
      "Wallet integration not found",
      "NOT_FOUND"
    )
  }

  clearCachedWalletBalance(userId, row.id)
  const linked = await resolveLinkedAccount(
    userId,
    row.walletName,
    row.financialAccountId
  )
  const fetched = await fetchAndCache(userId, row, deps, { force: true })
  const refreshed = await prisma.walletIntegration.findFirstOrThrow({
    where: { id: row.id },
  })
  return buildDashboardRow(toListItem(refreshed, linked), fetched)
}

export async function refreshAllWalletIntegrations(
  userId: string,
  deps?: ServiceDeps
): Promise<WalletDashboard> {
  await ensureWalletIntegrations(userId)
  const rows = await prisma.walletIntegration.findMany({
    where: { userId, isEnabled: true },
    orderBy: [{ walletName: "asc" }, { asset: "asc" }],
  })

  for (const row of rows) {
    if (!row.publicAddress.trim()) continue
    clearCachedWalletBalance(userId, row.id)
    try {
      await fetchAndCache(userId, row, deps, { force: true })
    } catch (error) {
      if (
        error instanceof WalletIntegrationServiceError &&
        error.code === "RATE_LIMITED"
      ) {
        throw error
      }
    }
  }

  return getWalletDashboard(userId, deps)
}

function buildDashboardRow(
  item: WalletIntegrationListItem,
  fetched: {
    result: BalanceFetchResult | null
    fromCache: boolean
    error: string | null
  }
): WalletAssetDashboardRow {
  const recordedBalance = item.linkedAccount?.cachedBalance ?? null
  const recordedCurrency = item.linkedAccount?.currency ?? null
  const liveBalance = fetched.result?.balance ?? null
  const difference =
    liveBalance !== null && recordedBalance !== null
      ? subtractBalances(liveBalance, recordedBalance)
      : null

  return {
    ...item,
    liveBalance,
    recordedBalance,
    recordedCurrency,
    difference,
    fetchedAt: fetched.result?.fetchedAt ?? item.lastSuccessfulRefresh,
    fromCache: fetched.fromCache,
    error: fetched.error,
  }
}

export async function getWalletDashboard(
  userId: string,
  deps?: ServiceDeps
): Promise<WalletDashboard> {
  await ensureWalletIntegrations(userId)
  const rows = await prisma.walletIntegration.findMany({
    where: { userId },
    orderBy: [{ walletName: "asc" }, { asset: "asc" }],
  })

  const dashboardRows: WalletAssetDashboardRow[] = []
  for (const row of rows) {
    const linked = await resolveLinkedAccount(
      userId,
      row.walletName,
      row.financialAccountId
    )
    const fetched = await fetchAndCache(userId, row, deps, { force: false })
    const latest = await prisma.walletIntegration.findFirstOrThrow({
      where: { id: row.id },
    })
    dashboardRows.push(buildDashboardRow(toListItem(latest, linked), fetched))
  }

  return {
    groups: WALLET_NAMES.map((walletName) => ({
      walletName,
      rows: dashboardRows.filter((r) => r.walletName === walletName),
    })),
  }
}

/** Test helper — confirms refresh path never mutates ledger tables. */
export function walletIntegrationsMustNotMutateLedger(): readonly string[] {
  return [
    "createIncome",
    "createExpense",
    "createTransfer",
    "recomputeCachedBalance",
    "cachedBalance",
  ]
}
