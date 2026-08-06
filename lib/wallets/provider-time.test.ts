import { afterEach, describe, expect, it } from "vitest"

import { formatAppDateTime, APP_TIMEZONE } from "@/lib/time"
import {
  utcFromHexUnixSeconds,
  utcFromIsoInstant,
  utcFromUnixMilliseconds,
  utcFromUnixSeconds,
} from "@/lib/wallets/provider-time"

describe("provider UTC timestamp parsing", () => {
  const previousTz = process.env.TZ

  afterEach(() => {
    if (previousTz === undefined) delete process.env.TZ
    else process.env.TZ = previousTz
  })

  it("parses seconds and milliseconds without double-scaling", () => {
    const seconds = 1_700_000_000
    const fromSec = utcFromUnixSeconds(seconds)
    const fromMs = utcFromUnixMilliseconds(seconds * 1000)
    expect(fromSec.getTime()).toBe(fromMs.getTime())
    expect(fromSec.toISOString()).toBe("2023-11-14T22:13:20.000Z")
  })

  it("parses Ethereum hex block timestamps as Unix seconds", () => {
    const date = utcFromHexUnixSeconds(`0x${(1_700_000_000).toString(16)}`)
    expect(date.toISOString()).toBe("2023-11-14T22:13:20.000Z")
  })

  it("parses ISO instants with Z only", () => {
    expect(utcFromIsoInstant("2023-11-14T22:13:20.000Z").toISOString()).toBe(
      "2023-11-14T22:13:20.000Z"
    )
    expect(() => utcFromIsoInstant("2023-11-14T22:13:20")).toThrow()
  })

  it("displays the same Europe/Istanbul time under different process TZ (localhost vs Vercel)", () => {
    const instant = utcFromUnixSeconds(1_700_000_000)
    process.env.TZ = "America/New_York"
    const east = formatAppDateTime(instant)
    process.env.TZ = "UTC"
    const utc = formatAppDateTime(instant)
    process.env.TZ = "Asia/Tokyo"
    const tokyo = formatAppDateTime(instant)

    expect(east).toBe(utc)
    expect(utc).toBe(tokyo)
    // Explicit policy zone
    const explicit = new Intl.DateTimeFormat(undefined, {
      timeZone: APP_TIMEZONE,
      dateStyle: "short",
      timeStyle: "short",
    }).format(instant)
    expect(east).toBe(explicit)
  })
})
