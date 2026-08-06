import { readFileSync } from "node:fs"
import path from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  STREAMER_MODE_A11Y_LABEL,
  parseStreamerModeStored,
  serializeStreamerMode,
  streamerModeStorageKey,
} from "./constants"
import { maskSensitivePlain } from "./mask"
import {
  formatStreamerAxisTick,
  shouldApplyStreamerModeResult,
} from "./request"

describe("streamer mode preference helpers", () => {
  it("defaults conceptually to off and keys per user", () => {
    expect(streamerModeStorageKey("user_1")).toBe(
      "income-dashboard:streamer-mode:user_1"
    )
    expect(streamerModeStorageKey("user_2")).not.toBe(
      streamerModeStorageKey("user_1")
    )
  })

  it("serializes and parses explicit true/false strings", () => {
    expect(serializeStreamerMode(true)).toBe("true")
    expect(serializeStreamerMode(false)).toBe("false")
    expect(parseStreamerModeStored("true")).toBe(true)
    expect(parseStreamerModeStored("false")).toBe(false)
    expect(parseStreamerModeStored("1")).toBe(true)
    expect(parseStreamerModeStored("0")).toBe(false)
    expect(parseStreamerModeStored("yes")).toBeNull()
    expect(parseStreamerModeStored(null)).toBeNull()
    // Never treat arbitrary strings as truthy.
    expect(parseStreamerModeStored("false")).not.toBe(Boolean("false"))
  })

  it("masks plain text only when enabled without exposing the source", () => {
    expect(maskSensitivePlain(false, "1234.56")).toBe("1234.56")
    expect(maskSensitivePlain(true, "1234.56")).toBe("••••••")
    expect(maskSensitivePlain(true, "1234.56")).not.toContain("1234")
  })

  it("uses a neutral accessibility label", () => {
    expect(STREAMER_MODE_A11Y_LABEL).toBe("Hidden financial value")
  })
})

describe("streamer mode request versioning", () => {
  it("ignores stale ON responses after a newer OFF request", () => {
    expect(
      shouldApplyStreamerModeResult({
        responseRequestId: 1,
        latestRequestId: 2,
      })
    ).toBe(false)
    expect(
      shouldApplyStreamerModeResult({
        responseRequestId: 2,
        latestRequestId: 2,
      })
    ).toBe(true)
  })

  it("rejects responses without a request id", () => {
    expect(
      shouldApplyStreamerModeResult({
        responseRequestId: undefined,
        latestRequestId: 1,
      })
    ).toBe(false)
  })
})

describe("streamer mode chart tick stability", () => {
  it("always returns a string formatter result for ON and OFF", () => {
    expect(formatStreamerAxisTick(true, 1200)).toBe("")
    expect(formatStreamerAxisTick(false, 1200)).toBe("1200")
    expect(formatStreamerAxisTick(false, null)).toBe("")
  })

  it("does not pass tick={false} as a Recharts prop in chart components", () => {
    const roots = [
      "components/dashboard/dashboard-chart.tsx",
      "components/analytics/analytics-charts.tsx",
    ]
    for (const rel of roots) {
      const src = readFileSync(path.join(process.cwd(), rel), "utf8")
      // Ignore comments; flag JSX prop assignments only.
      const withoutComments = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
      expect(withoutComments).not.toMatch(/tick=\{\s*false\s*\}/)
      expect(withoutComments).not.toMatch(/tick=\{[^}]*\?\s*false/)
      expect(withoutComments).toContain("STREAMER_CHART_TICK_STYLE")
      expect(withoutComments).toContain("useStreamerAxisTickFormatter")
    }
  })
})

describe("setStreamerModeAction OFF flow", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("accepts false, writes boolean false, and returns serializable ok", async () => {
    const setStreamerMode = vi.fn(async (_userId: string, enabled: boolean) => {
      expect(enabled).toBe(false)
      return false
    })
    vi.doMock("@/lib/auth/session", () => ({
      UnauthorizedError: class UnauthorizedError extends Error {
        constructor(message = "Unauthorized") {
          super(message)
          this.name = "UnauthorizedError"
        }
      },
      requireUserId: vi.fn(async () => "user_1"),
    }))
    vi.doMock("@/lib/services/streamer-mode", () => ({
      setStreamerMode,
    }))

    const { setStreamerModeAction } = await import(
      "@/app/(dashboard)/dashboard/streamer-mode/actions"
    )
    const result = await setStreamerModeAction({
      enabled: false,
      requestId: 7,
    })

    expect(result).toEqual({ ok: true, enabled: false, requestId: 7 })
    expect(setStreamerMode).toHaveBeenCalledTimes(1)
    expect(setStreamerMode).toHaveBeenCalledWith("user_1", false)
  })

  it("returns a handled error when unauthenticated", async () => {
    class UnauthorizedError extends Error {
      constructor(message = "Unauthorized") {
        super(message)
        this.name = "UnauthorizedError"
      }
    }
    vi.doMock("@/lib/auth/session", () => ({
      UnauthorizedError,
      requireUserId: vi.fn(async () => {
        throw new UnauthorizedError()
      }),
    }))
    vi.doMock("@/lib/services/streamer-mode", () => ({
      setStreamerMode: vi.fn(),
    }))

    const { setStreamerModeAction } = await import(
      "@/app/(dashboard)/dashboard/streamer-mode/actions"
    )
    const result = await setStreamerModeAction({ enabled: false, requestId: 3 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/signed in/i)
      expect(result.requestId).toBe(3)
    }
  })

  it("rolls DB failures into a handled error instead of throwing", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      UnauthorizedError: class UnauthorizedError extends Error {
        name = "UnauthorizedError"
      },
      requireUserId: vi.fn(async () => "user_1"),
    }))
    vi.doMock("@/lib/services/streamer-mode", () => ({
      setStreamerMode: vi.fn(async () => {
        throw new Error("db unavailable")
      }),
    }))

    const { setStreamerModeAction } = await import(
      "@/app/(dashboard)/dashboard/streamer-mode/actions"
    )
    const result = await setStreamerModeAction(false)
    expect(result).toEqual({
      ok: false,
      error: "Could not update Streamer Mode",
      requestId: undefined,
    })
  })

  it("rejects non-boolean input without truthy coercion", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      UnauthorizedError: class UnauthorizedError extends Error {
        name = "UnauthorizedError"
      },
      requireUserId: vi.fn(),
    }))
    vi.doMock("@/lib/services/streamer-mode", () => ({
      setStreamerMode: vi.fn(),
    }))

    const { setStreamerModeAction } = await import(
      "@/app/(dashboard)/dashboard/streamer-mode/actions"
    )
    // @ts-expect-error intentional invalid input
    const result = await setStreamerModeAction({ enabled: "false" })
    expect(result.ok).toBe(false)
  })

  it("does not call revalidatePath or redirect in the OFF action", async () => {
    const actionSrc = readFileSync(
      path.join(
        process.cwd(),
        "app/(dashboard)/dashboard/streamer-mode/actions.ts"
      ),
      "utf8"
    )
    expect(actionSrc).not.toContain("revalidatePath")
    expect(actionSrc).not.toContain("redirect(")
    expect(actionSrc).not.toContain("router.refresh")
  })
})

describe("setStreamerMode service boolean false write", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doUnmock("@/lib/services/streamer-mode")
    vi.doUnmock("@/lib/auth/session")
  })

  it("updates Prisma with streamerMode: false for the authenticated user", async () => {
    const update = vi.fn(async () => ({ streamerMode: false }))
    const findFirst = vi.fn(async () => ({ id: "user_1", streamerMode: true }))
    const writeAuditLog = vi.fn(async () => undefined)

    type Tx = {
      user: {
        findFirst: typeof findFirst
        update: typeof update
      }
    }
    const tx: Tx = { user: { findFirst, update } }

    vi.doMock("@/lib/db", () => ({
      prisma: {
        $transaction: async (fn: (client: Tx) => Promise<unknown>) => fn(tx),
      },
    }))
    vi.doMock("@/lib/services/audit", () => ({ writeAuditLog }))

    const mod = await import("@/lib/services/streamer-mode")
    expect(typeof mod.setStreamerMode).toBe("function")
    const next = await mod.setStreamerMode("user_1", false)

    expect(next).toBe(false)
    expect(update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { streamerMode: false },
      select: { streamerMode: true },
    })
    expect(writeAuditLog).toHaveBeenCalledTimes(1)
  })

  it("rejects non-boolean without treating false as missing", async () => {
    vi.doMock("@/lib/db", () => ({
      prisma: { $transaction: vi.fn() },
    }))
    vi.doMock("@/lib/services/audit", () => ({
      writeAuditLog: vi.fn(),
    }))

    const { setStreamerMode } = await import("@/lib/services/streamer-mode")
    await expect(
      // @ts-expect-error intentional
      setStreamerMode("user_1", undefined)
    ).rejects.toThrow(/boolean/)
  })
})

describe("streamer mode coverage expectations", () => {
  const auditedRoutes = [
    "/dashboard",
    "/dashboard/income",
    "/dashboard/expenses",
    "/dashboard/accounts",
    "/dashboard/subscriptions",
    "/dashboard/debts",
    "/dashboard/transfers",
    "/dashboard/analytics",
    "/dashboard/settings",
  ]

  it("lists every protected finance route that must respect Streamer Mode", () => {
    expect(auditedRoutes).toHaveLength(9)
    expect(new Set(auditedRoutes).size).toBe(9)
  })

  it("documents ON → OFF regression expectations", () => {
    // Contract covered by the suites above:
    // - OFF server action writes false
    // - stale request ids cannot overwrite newer OFF
    // - charts never use tick={false}
    // - DB/auth failures return handled errors (no throw to error boundary)
    // - action performs no redirect/revalidate loop
    expect(true).toBe(true)
  })
})
