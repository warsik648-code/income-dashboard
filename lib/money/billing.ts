import { Prisma, type BillingFrequency } from "@/generated/prisma/client"

/** Advance a renewal date by billing frequency (calendar-safe for month/year). */
export function advanceRenewalDate(
  from: Date,
  frequency: BillingFrequency,
  customIntervalDays?: number | null
): Date {
  const next = new Date(from.getTime())

  switch (frequency) {
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7)
      return next
    case "MONTHLY":
      next.setUTCMonth(next.getUTCMonth() + 1)
      return next
    case "QUARTERLY":
      next.setUTCMonth(next.getUTCMonth() + 3)
      return next
    case "YEARLY":
      next.setUTCFullYear(next.getUTCFullYear() + 1)
      return next
    case "CUSTOM": {
      const days = customIntervalDays ?? 0
      if (days <= 0) {
        throw new Error("Custom billing frequency requires customIntervalDays > 0")
      }
      next.setUTCDate(next.getUTCDate() + days)
      return next
    }
    default:
      throw new Error("Unsupported billing frequency")
  }
}

/** Monthly equivalent in the subscription's own currency (never cross-currency). */
export function monthlyEquivalent(
  price: Prisma.Decimal,
  frequency: BillingFrequency,
  customIntervalDays?: number | null
): Prisma.Decimal {
  switch (frequency) {
    case "WEEKLY":
      // 52/12
      return price.mul(52).div(12).toDecimalPlaces(4)
    case "MONTHLY":
      return price.toDecimalPlaces(4)
    case "QUARTERLY":
      return price.div(3).toDecimalPlaces(4)
    case "YEARLY":
      return price.div(12).toDecimalPlaces(4)
    case "CUSTOM": {
      const days = customIntervalDays ?? 0
      if (days <= 0) return new Prisma.Decimal(0)
      // Approximate month length 30.436875 days
      return price.mul("30.436875").div(days).toDecimalPlaces(4)
    }
    default:
      return new Prisma.Decimal(0)
  }
}

export function renewalPeriodKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
