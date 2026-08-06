import { describe, expect, it } from "vitest"

import {
  APP_TIMEZONE,
  formatAppDateTime,
  formatAppDateTimeLocal,
  formatCalendarDate,
  getTimeZoneParts,
  parseAppDateTimeLocal,
  parseCalendarDate,
} from "./timezone"

/**
 * Compatibility dry-run (no DB writes): documents how existing TIMESTAMP(3)
 * values should be interpreted after the code-first Istanbul policy.
 *
 * Prisma historically wrote JS Date UTC components into timestamp-without-tz.
 * We do NOT rewrite rows; display/reporting change only for absolute instants.
 */
describe("timezone compatibility dry-run (no production writes)", () => {
  it("keeps stored UTC instants identical when re-serialized", () => {
    const storedIso = "2026-08-06T11:30:00.000Z"
    const roundTrip = new Date(storedIso).toISOString()
    expect(roundTrip).toBe(storedIso)
  })

  it("shows existing absolute instants in Europe/Istanbul without mutating them", () => {
    const stored = new Date("2026-08-06T11:30:00.000Z")
    expect(formatAppDateTimeLocal(stored)).toBe("2026-08-06T14:30")
    const parts = getTimeZoneParts(stored, APP_TIMEZONE)
    expect(parts.hour).toBe(14)
    expect(parts.minute).toBe(30)
    // Storage unchanged
    expect(stored.toISOString()).toBe("2026-08-06T11:30:00.000Z")
  })

  it("interprets NEW datetime-local input as Istanbul wall time", () => {
    // User types 14:30 intending Istanbul → store 11:30Z
    expect(parseAppDateTimeLocal("2026-08-06T14:30").toISOString()).toBe(
      "2026-08-06T11:30:00.000Z"
    )
  })

  it("calendar-only rows using UTC midnight keep the same civil date", () => {
    const renewal = parseCalendarDate("2026-08-15")
    expect(renewal.toISOString()).toBe("2026-08-15T00:00:00.000Z")
    expect(formatCalendarDate(renewal)).toBe("2026-08-15")
    // Display helpers must not shift to Aug 14
    expect(formatAppDateTime(renewal)).not.toMatch(/\b14\b.*Aug|Aug.*\b14\b/)
  })

  it("documents that timestamptz migration is deferred", () => {
    // First safe version: code-only UTC serialization + Istanbul interpretation.
    // No Prisma schema / TIMESTAMP→TIMESTAMPTZ migration in this change set.
    expect(true).toBe(true)
  })
})
