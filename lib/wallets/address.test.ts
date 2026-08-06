import { describe, expect, it } from "vitest"

import {
  isValidPublicAddress,
  looksLikeSecretMaterial,
} from "@/lib/wallets/address"

describe("wallet address validation", () => {
  it("accepts valid addresses per network", () => {
    expect(
      isValidPublicAddress("TRON", "TJYeasTPa6gpEefF1E2nFTYCYTpiseJG9X")
    ).toBe(true)
    expect(
      isValidPublicAddress("ETHEREUM", "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0")
    ).toBe(true)
    expect(
      isValidPublicAddress("BITCOIN", "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")
    ).toBe(true)
    expect(
      isValidPublicAddress("LITECOIN", "ltc1q8c6fshw2dlwunqaeznsgfnzqds4am8gk4y8c8x")
    ).toBe(true)
  })

  it("rejects invalid addresses", () => {
    expect(isValidPublicAddress("TRON", "not-an-address")).toBe(false)
    expect(isValidPublicAddress("ETHEREUM", "0x1234")).toBe(false)
    expect(isValidPublicAddress("BITCOIN", "")).toBe(false)
  })

  it("rejects seed phrases and private-key shaped input", () => {
    expect(
      looksLikeSecretMaterial(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
      )
    ).toBe(true)
    expect(
      looksLikeSecretMaterial(
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      )
    ).toBe(true)
    expect(looksLikeSecretMaterial("my private key dump")).toBe(true)
    expect(
      looksLikeSecretMaterial("TJYeasTPa6gpEefF1E2nFTYCYTpiseJG9X")
    ).toBe(false)
  })
})
