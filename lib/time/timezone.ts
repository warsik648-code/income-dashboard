/**
 * App-wide time-zone policy.
 *
 * - Reporting / display / period boundaries: Europe/Istanbul (IANA)
 * - Absolute instants: stored & transported as UTC (JS Date / ISO Z)
 * - Calendar-only fields: civil YYYY-MM-DD, stored as UTC midnight of that date
 *
 * Do not use server-local or browser-default TZ for reporting boundaries.
 */

export const APP_TIMEZONE = "Europe/Istanbul" as const

export type AppTimeZone = typeof APP_TIMEZONE

const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

type ZoneParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

/** Read calendar/clock parts of an instant in a named IANA zone. */
export function getTimeZoneParts(
  instant: Date,
  timeZone: string = APP_TIMEZONE
): ZoneParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const map = new Map<string, string>()
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") map.set(part.type, part.value)
  }
  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day")),
    hour: Number(map.get("hour")),
    minute: Number(map.get("minute")),
    second: Number(map.get("second")),
  }
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC instant.
 * Uses Intl offset probing (works with IANA zones; Istanbul is currently UTC+3).
 */
export function zonedWallTimeToUtc(
  parts: {
    year: number
    month: number
    day: number
    hour?: number
    minute?: number
    second?: number
  },
  timeZone: string = APP_TIMEZONE
): Date {
  const hour = parts.hour ?? 0
  const minute = parts.minute ?? 0
  const second = parts.second ?? 0
  // Initial guess: treat wall time as if it were UTC, then correct by zone offset.
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    minute,
    second
  )
  const asZone = getTimeZoneParts(new Date(guess), timeZone)
  const zoneAsUtc = Date.UTC(
    asZone.year,
    asZone.month - 1,
    asZone.day,
    asZone.hour,
    asZone.minute,
    asZone.second
  )
  return new Date(guess - (zoneAsUtc - guess))
}

/**
 * Parse a user/API datetime into a UTC instant.
 * - `YYYY-MM-DDTHH:mm[:ss]` (datetime-local, no offset) → Europe/Istanbul wall time
 * - ISO-8601 with `Z` or numeric offset → absolute instant (unchanged)
 */
export function parseAppDateTimeLocal(value: string): Date {
  const trimmed = value.trim()

  // Absolute ISO instant (tests, exports, already-UTC payloads)
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const absolute = new Date(trimmed)
    if (Number.isNaN(absolute.getTime())) {
      throw new Error("Invalid datetime value")
    }
    return absolute
  }

  // Date-only → UTC midnight of that civil date (legacy `new Date("YYYY-MM-DD")`)
  if (CALENDAR_DATE_RE.test(trimmed)) {
    return parseCalendarDate(trimmed)
  }

  const match = DATETIME_LOCAL_RE.exec(trimmed)
  if (!match) {
    throw new Error("Invalid datetime-local value")
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = match[6] != null ? Number(match[6]) : 0
  const date = zonedWallTimeToUtc(
    { year, month, day, hour, minute, second },
    APP_TIMEZONE
  )
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid datetime-local value")
  }
  return date
}

/** Format a UTC instant for a `datetime-local` input in Europe/Istanbul. */
export function formatAppDateTimeLocal(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid instant")
  }
  const p = getTimeZoneParts(date, APP_TIMEZONE)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`
}

/**
 * Calendar-only date: preserve YYYY-MM-DD exactly.
 * Stored as UTC midnight of that civil date (no Istanbul offset applied),
 * so the selected day never shifts across zones.
 */
export function parseCalendarDate(value: string): Date {
  const trimmed = value.trim()
  const match = CALENDAR_DATE_RE.exec(trimmed)
  if (!match) {
    throw new Error("Invalid calendar date")
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  // Reject JS Date overflow (e.g. 2026-02-31 → March)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Invalid calendar date")
  }
  return date
}

/** Format a calendar-only DateTime back to YYYY-MM-DD (UTC date parts). */
export function formatCalendarDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid calendar date")
  }
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

export function calendarDateKey(value: Date | string): string {
  return formatCalendarDate(value)
}

/** Civil date in Europe/Istanbul as YYYY-MM-DD for an instant. */
export function istanbulDateKey(instant: Date = new Date()): string {
  const p = getTimeZoneParts(instant, APP_TIMEZONE)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

/** Today's civil date in Europe/Istanbul as YYYY-MM-DD. */
export function istanbulTodayKey(now: Date = new Date()): string {
  return istanbulDateKey(now)
}

export function startOfAppDay(instant: Date = new Date()): Date {
  const p = getTimeZoneParts(instant, APP_TIMEZONE)
  return zonedWallTimeToUtc(
    { year: p.year, month: p.month, day: p.day, hour: 0, minute: 0, second: 0 },
    APP_TIMEZONE
  )
}

export function endOfAppDay(instant: Date = new Date()): Date {
  const p = getTimeZoneParts(instant, APP_TIMEZONE)
  return zonedWallTimeToUtc(
    {
      year: p.year,
      month: p.month,
      day: p.day,
      hour: 23,
      minute: 59,
      second: 59,
    },
    APP_TIMEZONE
  )
}

/** Inclusive end-of-day with ms for DB `lte` filters. */
export function endOfAppDayMs(instant: Date = new Date()): Date {
  const end = endOfAppDay(instant)
  end.setUTCMilliseconds(999)
  return end
}

export function addAppCalendarDays(instant: Date, days: number): Date {
  const p = getTimeZoneParts(instant, APP_TIMEZONE)
  // Move civil date via UTC date arithmetic on the calendar key, then map back.
  const civil = parseCalendarDate(
    `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
  )
  civil.setUTCDate(civil.getUTCDate() + days)
  return zonedWallTimeToUtc(
    {
      year: civil.getUTCFullYear(),
      month: civil.getUTCMonth() + 1,
      day: civil.getUTCDate(),
      hour: p.hour,
      minute: p.minute,
      second: p.second,
    },
    APP_TIMEZONE
  )
}

export function startOfAppWeek(instant: Date = new Date()): Date {
  // Monday-start week in Europe/Istanbul.
  const start = startOfAppDay(instant)
  const p = getTimeZoneParts(start, APP_TIMEZONE)
  // day of week in Istanbul: 0=Sun..6=Sat via UTC noon of civil date
  const civilNoon = Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0)
  const dow = new Date(civilNoon).getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow
  return startOfAppDay(addAppCalendarDays(start, diff))
}

export function startOfAppMonth(instant: Date = new Date()): Date {
  const p = getTimeZoneParts(instant, APP_TIMEZONE)
  return zonedWallTimeToUtc(
    { year: p.year, month: p.month, day: 1, hour: 0, minute: 0, second: 0 },
    APP_TIMEZONE
  )
}

export function startOfAppYear(instant: Date = new Date()): Date {
  const p = getTimeZoneParts(instant, APP_TIMEZONE)
  return zonedWallTimeToUtc(
    { year: p.year, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
    APP_TIMEZONE
  )
}

/** Period key for charts: day or month in Europe/Istanbul. */
export function appPeriodKey(
  instant: Date,
  bucket: "day" | "month"
): string {
  const p = getTimeZoneParts(instant, APP_TIMEZONE)
  if (bucket === "month") return `${p.year}-${pad2(p.month)}`
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

export function formatAppDateTime(
  value: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  const base: Intl.DateTimeFormatOptions = options
    ? { timeZone: APP_TIMEZONE, ...options }
    : { timeZone: APP_TIMEZONE, dateStyle: "short", timeStyle: "short" }
  return new Intl.DateTimeFormat(undefined, base).format(date)
}

export function formatAppDate(
  value: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  const base: Intl.DateTimeFormatOptions = options
    ? { timeZone: APP_TIMEZONE, ...options }
    : { timeZone: APP_TIMEZONE, dateStyle: "medium" }
  return new Intl.DateTimeFormat(undefined, base).format(date)
}

/** Display a calendar-only field without zone shift (UTC date parts as civil date). */
export function formatAppCalendarDate(
  value: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const key = formatCalendarDate(value)
  const [y, m, d] = key.split("-").map(Number)
  // Format as a pure calendar label via UTC + timeZone UTC so the civil date sticks.
  const utc = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0))
  const base: Intl.DateTimeFormatOptions = options
    ? { timeZone: "UTC", ...options }
    : { timeZone: "UTC", dateStyle: "medium" }
  return new Intl.DateTimeFormat(undefined, base).format(utc)
}

/**
 * Inclusive Istanbul-day range for a YYYY-MM-DD filter bound, as UTC instants
 * for Prisma `gte` / `lte`.
 */
export function appDayRangeFromCalendarDate(value: string): {
  start: Date
  end: Date
} {
  const calendar = parseCalendarDate(value)
  const start = zonedWallTimeToUtc(
    {
      year: calendar.getUTCFullYear(),
      month: calendar.getUTCMonth() + 1,
      day: calendar.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    },
    APP_TIMEZONE
  )
  const end = endOfAppDayMs(start)
  return { start, end }
}

export function isValidDateTimeLocal(value: string): boolean {
  try {
    parseAppDateTimeLocal(value)
    return true
  } catch {
    return false
  }
}

/** @deprecated alias — accepts datetime-local, date-only, and absolute ISO. */
export const isValidAppDateTime = isValidDateTimeLocal

export function isValidCalendarDate(value: string): boolean {
  try {
    parseCalendarDate(value)
    return true
  } catch {
    return false
  }
}
