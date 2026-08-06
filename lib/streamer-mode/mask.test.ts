import { describe, expect, it } from "vitest"

import {
  STREAMER_HIDDEN_PLACEHOLDER,
  maskSensitiveOrHidden,
  maskWalletAddress,
} from "@/lib/streamer-mode/mask"

describe("streamer wallet masking", () => {
  it("masks TRON, Ethereum, and bech32-style addresses", () => {
    expect(maskWalletAddress("TAHt1234567890abcdef38x")).toBe(
      "TAHt••••••••38x"
    )
    expect(
      maskWalletAddress("0x1381abcdefabcdefabcdefabcdefabcdefC8F4")
    ).toBe("0x13••••••••C8F4")
    expect(maskWalletAddress("bc1qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaau9d")).toBe(
      "bc1q••••••••u9d"
    )
  })

  it("returns placeholder for empty or short addresses", () => {
    expect(maskWalletAddress("")).toBe("")
    expect(maskWalletAddress("short")).toBe(STREAMER_HIDDEN_PLACEHOLDER)
  })

  it("hides values when streamer mode is on", () => {
    expect(maskSensitiveOrHidden(true, "12.5 USDT")).toBe(
      STREAMER_HIDDEN_PLACEHOLDER
    )
    expect(maskSensitiveOrHidden(false, "12.5 USDT")).toBe("12.5 USDT")
    expect(maskSensitiveOrHidden(false, null)).toBe("—")
  })
})
