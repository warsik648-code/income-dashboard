import { describe, expect, it, vi } from "vitest"

import { createBitcoinProvider } from "@/lib/wallets/providers/bitcoin"
import { createEthereumProvider } from "@/lib/wallets/providers/ethereum"
import { createLitecoinProvider } from "@/lib/wallets/providers/litecoin"
import { createTronGridProvider } from "@/lib/wallets/providers/tron"
import { WalletProviderError } from "@/lib/wallets/types"

describe("blockchain balance providers (mocked)", () => {
  it("returns zero USDT balance from TronGrid", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [],
        success: true,
        meta: { at: 1_700_000_000_000 },
      })
    )
    const provider = createTronGridProvider({ fetchImpl })
    const result = await provider.fetchBalance({
      address: "TJYeasTPa6gpEefF1E2nFTYCYTpiseJG9X",
      asset: "USDT",
      network: "TRON",
    })
    expect(result.balance).toBe("0")
    expect(result.decimals).toBe(6)
    expect(result.fetchedAt.toISOString()).toBe("2023-11-14T22:13:20.000Z")
    const calledUrl = String(fetchImpl.mock.calls[0]?.[0] ?? "")
    expect(calledUrl).toContain(
      "/v1/accounts/TJYeasTPa6gpEefF1E2nFTYCYTpiseJG9X/trc20/balance"
    )
    expect(calledUrl).toContain(
      "contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
    )
  })

  it("returns large USDT balance from TronGrid", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        data: [
          {
            TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: "1234567890123",
          },
        ],
        success: true,
        meta: { at: 1_700_000_000_000, page_size: 1 },
      })
    )
    const provider = createTronGridProvider({ fetchImpl })
    const result = await provider.fetchBalance({
      address: "TJYeasTPa6gpEefF1E2nFTYCYTpiseJG9X",
      asset: "USDT",
      network: "TRON",
    })
    expect(result.balance).toBe("1234567.890123")
  })

  it("returns a user-friendly error for TronGrid HTTP failures", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        {
          timestamp: "2026-08-06T12:32:50.581+00:00",
          status: 404,
          error: "Not Found",
          path: "/v1/accounts/x/tokens",
        },
        { status: 404 }
      )
    )
    const provider = createTronGridProvider({ fetchImpl })
    await expect(
      provider.fetchBalance({
        address: "TJYeasTPa6gpEefF1E2nFTYCYTpiseJG9X",
        asset: "USDT",
        network: "TRON",
      })
    ).rejects.toMatchObject({
      message:
        "Could not load USDT (TRC20) balance: TronGrid has no TRC-20 balance data for this address.",
    })
  })

  it("rejects invalid TRON address", async () => {
    const provider = createTronGridProvider({
      fetchImpl: vi.fn(),
    })
    await expect(
      provider.fetchBalance({
        address: "invalid",
        asset: "USDT",
        network: "TRON",
      })
    ).rejects.toMatchObject({ code: "INVALID_ADDRESS" })
  })

  it("maps Bitcoin sats to BTC", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        chain_stats: { funded_txo_sum: 150_000_000, spent_txo_sum: 50_000_000 },
        mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 },
      })
    )
    const provider = createBitcoinProvider({ fetchImpl })
    const result = await provider.fetchBalance({
      address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      asset: "BTC",
      network: "BITCOIN",
    })
    expect(result.balance).toBe("1")
  })

  it("maps Ethereum wei to ETH", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: "0xde0b6b3a7640000", // 1 ETH
      })
    )
    const provider = createEthereumProvider({
      rpcUrl: "https://example.invalid/rpc",
      fetchImpl,
    })
    const result = await provider.fetchBalance({
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      asset: "ETH",
      network: "ETHEREUM",
    })
    expect(result.balance).toBe("1")
  })

  it("requires ETHEREUM_RPC_URL when unset", async () => {
    const previous = process.env.ETHEREUM_RPC_URL
    delete process.env.ETHEREUM_RPC_URL
    const provider = createEthereumProvider({ rpcUrl: "" })
    await expect(
      provider.fetchBalance({
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        asset: "ETH",
        network: "ETHEREUM",
      })
    ).rejects.toMatchObject({ code: "NOT_CONFIGURED" })
    if (previous !== undefined) process.env.ETHEREUM_RPC_URL = previous
  })

  it("maps Litecoin litoshis", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ final_balance: 250_000_000 })
    )
    const provider = createLitecoinProvider({ fetchImpl })
    const result = await provider.fetchBalance({
      address: "ltc1q8c6fshw2dlwunqaeznsgfnzqds4am8gk4y8c8x",
      asset: "LTC",
      network: "LITECOIN",
    })
    expect(result.balance).toBe("2.5")
  })

  it("surfaces provider failure and timeout", async () => {
    const failing = createBitcoinProvider({
      fetchImpl: vi.fn(async () => new Response("nope", { status: 500 })),
    })
    await expect(
      failing.fetchBalance({
        address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
        asset: "BTC",
        network: "BITCOIN",
      })
    ).rejects.toBeInstanceOf(WalletProviderError)

    const controller = new AbortController()
    controller.abort()
    const timedOut = createBitcoinProvider({
      fetchImpl: vi.fn(async (_url, init) => {
        if (init?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError")
        }
        return Response.json({})
      }),
    })
    await expect(
      timedOut.fetchBalance({
        address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
        asset: "BTC",
        network: "BITCOIN",
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ code: "TIMEOUT" })
  })
})
