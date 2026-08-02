import type { SubscriptionStatus } from "@/generated/prisma/client"

export type SubscriptionDueInput = {
  status: SubscriptionStatus
  nextRenewalDate: Date
  endDate?: Date | null
  deletedAt?: Date | null
  /** Defaults to UTC start of today when omitted. */
  asOf?: Date
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

/**
 * Computed "Due" label — not a stored enum.
 * Due when active/trial, not deleted, renewal date on/before today, and not ended.
 */
export function isSubscriptionDue(input: SubscriptionDueInput): boolean {
  if (input.deletedAt) return false
  if (input.status !== "ACTIVE" && input.status !== "TRIAL") return false

  const asOf = input.asOf ?? new Date()
  if (input.endDate && input.endDate.getTime() <= asOf.getTime()) {
    return false
  }

  return (
    startOfUtcDay(input.nextRenewalDate).getTime() <=
    startOfUtcDay(asOf).getTime()
  )
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
