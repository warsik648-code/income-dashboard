import type { SubscriptionStatus } from "@/generated/prisma/client"

import { calendarDateKey, istanbulTodayKey } from "@/lib/time"

export type SubscriptionDueInput = {
  status: SubscriptionStatus
  nextRenewalDate: Date
  endDate?: Date | null
  deletedAt?: Date | null
  /** Defaults to "now"; due compares civil dates in Europe/Istanbul. */
  asOf?: Date
}

/**
 * Computed "Due" label — not a stored enum.
 * Due when active/trial, not deleted, renewal civil date on/before Istanbul today,
 * and not ended on/before Istanbul today.
 */
export function isSubscriptionDue(input: SubscriptionDueInput): boolean {
  if (input.deletedAt) return false
  if (input.status !== "ACTIVE" && input.status !== "TRIAL") return false

  const asOf = input.asOf ?? new Date()
  const today = istanbulTodayKey(asOf)

  if (input.endDate && calendarDateKey(input.endDate) <= today) {
    return false
  }

  return calendarDateKey(input.nextRenewalDate) <= today
}

export type SubscriptionDisplayState =
  | "DUE"
  | "UPCOMING"
  | "PAUSED"
  | "CANCELLED"
  | "TRIAL"
  | "EXPIRED"

export function getSubscriptionDisplayState(
  input: SubscriptionDueInput
): SubscriptionDisplayState {
  if (input.deletedAt || input.status === "EXPIRED") return "EXPIRED"
  if (input.status === "CANCELLED") return "CANCELLED"
  if (input.status === "PAUSED") return "PAUSED"
  if (isSubscriptionDue(input)) return "DUE"
  if (input.status === "TRIAL") return "TRIAL"
  return "UPCOMING"
}
