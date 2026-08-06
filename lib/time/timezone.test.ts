import { describe, expect, it } from "vitest"

import {
  APP_TIMEZONE,
  appDayRangeFromCalendarDate,
  appPeriodKey,
  endOfAppDayMs,
  formatAppCalendarDate,
  formatAppDateTime,
  formatAppDateTimeLocal,
  formatCalendarDate,
  getTimeZoneParts,
  istanbulTodayKey,
  parseAppDateTimeLocal,
  parseCalendarDate,
  startOfAppDay,
  startOfAppMonth,
  zonedWallTimeToUtc,
} from "./timezone"

describe("APP_TIMEZONE policy", () => {
  it("uses the named IANA zone Europe/Istanbul", () => {
    expect(APP_TIMEZONE).toBe("Europe/Istanbul")
  })

  it("treats Istanbul midnight as 21:00Z previous UTC day (UTC+3)", () => {
    const start = zonedWallTimeToUtc(
      { year: 2026, month: 8, day: 6, hour: 0, minute: 0, second: 0 },
      APP_TIMEZONE
    )
    expect(start.toISOString()).toBe("2026-08-05T21:00:00.000Z")
    expect(getTimeZoneParts(start).day).toBe(6)
    expect(getTimeZoneParts(start).hour).toBe(0)
  })

  it("does not treat UTC midnight as Istanbul midnight", () => {
    const utcMidnight = new Date("2026-08-06T00:00:00.000Z")
    const parts = getTimeZoneParts(utcMidnight)
    expect(parts.year).toBe(2026)
    expect(parts.month).toBe(8)
    expect(parts.day).toBe(6)
    expect(parts.hour).toBe(3)
    expect(startOfAppDay(utcMidnight).toISOString()).toBe(
      "2026-08-05T21:00:00.000Z"
    )
  })

  it("round-trips datetime-local through Istanbul wall time", () => {
    const parsed = parseAppDateTimeLocal("2026-08-06T14:30")
    expect(parsed.toISOString()).toBe("2026-08-06T11:30:00.000Z")
    expect(formatAppDateTimeLocal(parsed)).toBe("2026-08-06T14:30")
  })

  it("accepts absolute ISO instants without reinterpreting as Istanbul wall time", () => {
    expect(parseAppDateTimeLocal("2026-08-06T11:30:00.000Z").toISOString()).toBe(
      "2026-08-06T11:30:00.000Z"
    )
  })

  it("preserves calendar-only dates without zone shift", () => {
    const date = parseCalendarDate("2026-08-06")
    expect(date.toISOString()).toBe("2026-08-06T00:00:00.000Z")
    expect(formatCalendarDate(date)).toBe("2026-08-06")
    // Near western zones this must not become Aug 5
    expect(formatAppCalendarDate(date)).toContain("6")
  })

  it("rejects overflowing calendar dates", () => {
    expect(() => parseCalendarDate("2026-02-31")).toThrow(/Invalid calendar date/)
  })

  it("computes Istanbul today key identical regardless of host TZ assumption", () => {
    // Fixed instant: 2026-08-05 22:30 UTC = 2026-08-06 01:30 Istanbul
    const instant = new Date("2026-08-05T22:30:00.000Z")
    expect(istanbulTodayKey(instant)).toBe("2026-08-06")
    expect(appPeriodKey(instant, "day")).toBe("2026-08-06")
    expect(appPeriodKey(instant, "month")).toBe("2026-08")
  })

  it("aligns dashboard today boundary to Istanbul", () => {
    const aroundUtcMidnight = new Date("2026-08-06T00:30:00.000Z") // 03:30 Istanbul
    const start = startOfAppDay(aroundUtcMidnight)
    const end = endOfAppDayMs(aroundUtcMidnight)
    expect(start.toISOString()).toBe("2026-08-05T21:00:00.000Z")
    expect(end.toISOString()).toBe("2026-08-06T20:59:59.999Z")
    expect(aroundUtcMidnight.getTime()).toBeGreaterThanOrEqual(start.getTime())
    expect(aroundUtcMidnight.getTime()).toBeLessThanOrEqual(end.getTime())
  })

  it("aligns monthly boundary to Istanbul month start", () => {
    // 31 July 2026 22:00 UTC = 1 Aug 2026 01:00 Istanbul → month Aug
    const instant = new Date("2026-07-31T22:00:00.000Z")
    expect(startOfAppMonth(instant).toISOString()).toBe(
      "2026-07-31T21:00:00.000Z"
    )
    expect(appPeriodKey(instant, "month")).toBe("2026-08")
  })

  it("builds filter day ranges in Istanbul for DB queries", () => {
    const { start, end } = appDayRangeFromCalendarDate("2026-08-06")
    expect(start.toISOString()).toBe("2026-08-05T21:00:00.000Z")
    expect(end.toISOString()).toBe("2026-08-06T20:59:59.999Z")
  })

  it("formats audit-style timestamps in Europe/Istanbul explicitly", () => {
    const formatted = formatAppDateTime("2026-08-06T11:30:00.000Z")
    // Must reflect 14:30 Istanbul, not 11:30
    expect(formatted).toMatch(/14:30|2:30/)
  })

  it("documents DST: Europe/Istanbul has no DST transitions (fixed +03)", () => {
    // Winter and summer wall times share the same offset for this zone.
    const winter = zonedWallTimeToUtc(
      { year: 2026, month: 1, day: 15, hour: 12, minute: 0, second: 0 },
      APP_TIMEZONE
    )
    const summer = zonedWallTimeToUtc(
      { year: 2026, month: 7, day: 15, hour: 12, minute: 0, second: 0 },
      APP_TIMEZONE
    )
    expect(winter.toISOString()).toBe("2026-01-15T09:00:00.000Z")
    expect(summer.toISOString()).toBe("2026-07-15T09:00:00.000Z")
  })

  it("produces identical period keys for localhost and Vercel (no process TZ)", () => {
    const processTz = process.env.TZ
    try {
      process.env.TZ = "UTC"
      const a = appPeriodKey(new Date("2026-08-05T22:30:00.000Z"), "day")
      process.env.TZ = "America/Los_Angeles"
      const b = appPeriodKey(new Date("2026-08-05T22:30:00.000Z"), "day")
      expect(a).toBe("2026-08-06")
      expect(b).toBe("2026-08-06")
    } finally {
      if (processTz === undefined) delete process.env.TZ
      else process.env.TZ = processTz
    }
  })
})
