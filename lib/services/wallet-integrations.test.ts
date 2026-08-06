import { beforeEach, describe, expect, it, vi } from "vitest"

import type { BalanceProvider } from "@/lib/wallets/types"
import {
  resetWalletBalanceCacheForTests,
  resetWalletRefreshLimitForTests,
} from "@/lib/wallets"

const userId = "user_wallet_test"
const integrationId = "wi_trust_usdt"

function mockIntegration(overrides?: Record<string, unknown>) {
  return {
    id: integrationId,
    userId,
    walletName: "TRUST",
    asset: "USDT",
    network: "TRON",
    publicAddress: "TJYeasTPa6gpEefF1E2nFTYCYTpiseJG9X",
    financialAccountId: "acct_trust",
    isEnabled: true,
    lastSuccessfulRefresh: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function mockAccount() {
  return {
    id: "acct_trust",
    userId,
    name: "TRUST",
    type: "TRUST",
    currency: "USD",
    cachedBalance: { toString: () => "100" },
    deletedAt: null,
    isArchived: false,
  }
}

describe("wallet integrations service", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    resetWalletBalanceCacheForTests()
    resetWalletRefreshLimitForTests()
  })

  it("uses cache on second fetch and force refresh bypasses cache", async () => {
    const fetchBalance = vi.fn(async () => ({
      balance: "76",
      decimals: 6,
      fetchedAt: new Date("2024-01-15T12:00:00.000Z"),
    }))
    const provider: BalanceProvider = {
      id: "mock",
      supports: (asset, network) => asset === "USDT" && network === "TRON",
      fetchBalance,
    }

    const update = vi.fn(async ({ data }: { data: { lastSuccessfulRefresh: Date } }) =>
      mockIntegration({ lastSuccessfulRefresh: data.lastSuccessfulRefresh })
    )
    const findFirst = vi.fn(async () => mockIntegration())
    const findFirstOrThrow = vi.fn(async () => mockIntegration())
    const findMany = vi.fn(async () => [mockIntegration()])
    const accountFindFirst = vi.fn(async () => mockAccount())

    vi.doMock("@/lib/db", () => ({
      prisma: {
        walletIntegration: {
          findMany,
          findFirst,
          findFirstOrThrow,
          update,
          createMany: vi.fn(),
        },
        financialAccount: {
          findFirst: accountFindFirst,
        },
        $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
          fn({
            walletIntegration: { update },
            auditLog: { create: vi.fn() },
          })
        ),
      },
    }))
    vi.doMock("@/lib/services/audit", () => ({
      writeAuditLog: vi.fn(),
    }))
    vi.doMock("@/lib/wallets/registry", () => ({
      createDefaultBalanceProviders: () => [provider],
      fetchLiveBalance: async (
        _providers: BalanceProvider[],
        input: Parameters<BalanceProvider["fetchBalance"]>[0]
      ) => provider.fetchBalance(input),
    }))

    const { getWalletDashboard, refreshWalletIntegration } = await import(
      "@/lib/services/wallet-integrations"
    )

    const first = await getWalletDashboard(userId, { providers: [provider] })
    expect(first.groups[0]?.rows[0]?.liveBalance).toBe("76")
    expect(first.groups[0]?.rows[0]?.recordedBalance).toBe("100")
    expect(first.groups[0]?.rows[0]?.difference).toBe("-24")
    expect(first.groups[0]?.rows[0]?.fromCache).toBe(false)
    expect(fetchBalance).toHaveBeenCalledTimes(1)

    const second = await getWalletDashboard(userId, { providers: [provider] })
    expect(second.groups[0]?.rows[0]?.fromCache).toBe(true)
    expect(fetchBalance).toHaveBeenCalledTimes(1)

    await refreshWalletIntegration(userId, integrationId, {
      providers: [provider],
    })
    expect(fetchBalance).toHaveBeenCalledTimes(2)
  })

  it("does not create income, expenses, transfers, or mutate cachedBalance", async () => {
    const transactionCreate = vi.fn()
    const transferCreate = vi.fn()
    const accountUpdate = vi.fn()
    const fetchBalance = vi.fn(async () => ({
      balance: "1",
      decimals: 6,
      fetchedAt: new Date("2024-01-15T12:00:00.000Z"),
    }))
    const provider: BalanceProvider = {
      id: "mock",
      supports: () => true,
      fetchBalance,
    }

    const walletUpdate = vi.fn(async ({ data }: { data: unknown }) => {
      expect(data).not.toHaveProperty("cachedBalance")
      return mockIntegration({
        lastSuccessfulRefresh: (data as { lastSuccessfulRefresh?: Date })
          .lastSuccessfulRefresh,
      })
    })

    vi.doMock("@/lib/db", () => ({
      prisma: {
        walletIntegration: {
          findMany: vi.fn(async () => [mockIntegration()]),
          findFirst: vi.fn(async () => mockIntegration()),
          findFirstOrThrow: vi.fn(async () => mockIntegration()),
          update: walletUpdate,
          createMany: vi.fn(),
        },
        financialAccount: {
          findFirst: vi.fn(async () => mockAccount()),
          update: accountUpdate,
        },
        transaction: { create: transactionCreate },
        transfer: { create: transferCreate },
        $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
          fn({
            walletIntegration: { update: walletUpdate },
            auditLog: { create: vi.fn() },
          })
        ),
      },
    }))
    vi.doMock("@/lib/services/audit", () => ({
      writeAuditLog: vi.fn(),
    }))
    vi.doMock("@/lib/wallets/registry", () => ({
      createDefaultBalanceProviders: () => [provider],
      fetchLiveBalance: async (
        _providers: BalanceProvider[],
        input: Parameters<BalanceProvider["fetchBalance"]>[0]
      ) => provider.fetchBalance(input),
    }))

    const { refreshWalletIntegration, walletIntegrationsMustNotMutateLedger } =
      await import("@/lib/services/wallet-integrations")

    expect(walletIntegrationsMustNotMutateLedger()).toContain("createIncome")
    await refreshWalletIntegration(userId, integrationId, {
      providers: [provider],
    })

    expect(transactionCreate).not.toHaveBeenCalled()
    expect(transferCreate).not.toHaveBeenCalled()
    expect(accountUpdate).not.toHaveBeenCalled()
  })

  it("surfaces provider failure without throwing from dashboard load", async () => {
    const provider: BalanceProvider = {
      id: "mock",
      supports: () => true,
      fetchBalance: vi.fn(async () => {
        throw Object.assign(new Error("upstream down"), {
          name: "WalletProviderError",
          code: "PROVIDER_FAILURE",
        })
      }),
    }

    // Use real WalletProviderError via registry mock throwing it
    const { WalletProviderError } = await import("@/lib/wallets/types")
    provider.fetchBalance = vi.fn(async () => {
      throw new WalletProviderError("upstream down", "PROVIDER_FAILURE")
    })

    vi.doMock("@/lib/db", () => ({
      prisma: {
        walletIntegration: {
          findMany: vi.fn(async () => [mockIntegration()]),
          findFirst: vi.fn(async () => mockIntegration()),
          findFirstOrThrow: vi.fn(async () => mockIntegration()),
          update: vi.fn(),
          createMany: vi.fn(),
        },
        financialAccount: {
          findFirst: vi.fn(async () => mockAccount()),
        },
      },
    }))
    vi.doMock("@/lib/services/audit", () => ({
      writeAuditLog: vi.fn(),
    }))
    vi.doMock("@/lib/wallets/registry", () => ({
      createDefaultBalanceProviders: () => [provider],
      fetchLiveBalance: async (
        _providers: BalanceProvider[],
        input: Parameters<BalanceProvider["fetchBalance"]>[0]
      ) => provider.fetchBalance(input),
    }))

    const { getWalletDashboard } = await import(
      "@/lib/services/wallet-integrations"
    )
    const dash = await getWalletDashboard(userId, { providers: [provider] })
    expect(dash.groups[0]?.rows[0]?.error).toContain("upstream down")
    expect(dash.groups[0]?.rows[0]?.liveBalance).toBeNull()
  })
})
