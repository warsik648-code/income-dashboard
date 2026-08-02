import { describe, expect, it } from "vitest"

import { nextTransferIdempotencyKey } from "@/lib/transfers/idempotency"

describe("nextTransferIdempotencyKey", () => {
  it("keeps the same key while in-flight", () => {
    expect(
      nextTransferIdempotencyKey({
        outcome: "inflight",
        currentKey: "key-1",
        generate: () => "key-2",
      })
    ).toBe("key-1")
  })

  it("keeps the same key after failure so retry is safe", () => {
    expect(
      nextTransferIdempotencyKey({
        outcome: "error",
        currentKey: "key-1",
        generate: () => "key-2",
      })
    ).toBe("key-1")
  })

  it("rotates after success for the next legitimate transfer", () => {
    expect(
      nextTransferIdempotencyKey({
        outcome: "success",
        currentKey: "key-1",
        generate: () => "key-2",
      })
    ).toBe("key-2")
  })

  it("form reset generates a new key (same as success rotation)", () => {
    const resetKey = nextTransferIdempotencyKey({
      outcome: "success",
      currentKey: "old",
      generate: () => "fresh-after-reset",
    })
    expect(resetKey).toBe("fresh-after-reset")
    expect(resetKey).not.toBe("old")
  })
})
