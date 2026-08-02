"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth/session"
import {
  SubscriptionServiceError,
  cancelSubscription,
  confirmPaid,
  createSubscription,
  pauseSubscription,
  restoreSubscription,
  resumeSubscription,
  softDeleteSubscription,
  updateSubscription,
} from "@/lib/services/subscriptions"
import {
  confirmPaidSchema,
  createSubscriptionSchema,
  subscriptionIdSchema,
  updateSubscriptionSchema,
} from "@/lib/validations/subscriptions"

export type SubscriptionActionState = {
  ok?: boolean
  error?: string
}


function formFields(formData: FormData) {
  return {
    name: formData.get("name"),
    provider: formData.get("provider"),
    logoUrl: formData.get("logoUrl") ?? "",
    price: formData.get("price"),
    billingFrequency: formData.get("billingFrequency"),
    customIntervalDays: formData.get("customIntervalDays") ?? "",
    startDate: formData.get("startDate"),
    nextRenewalDate: formData.get("nextRenewalDate"),
    endDate: formData.get("endDate") ?? "",
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    status: formData.get("status") ?? "ACTIVE",
    autoRenew: formData.get("autoRenew") ?? "",
    notes: formData.get("notes") ?? "",
  }
}

function revalidateSubscriptionPaths() {
  revalidatePath("/dashboard/subscriptions")
  revalidatePath("/dashboard/expenses")
  revalidatePath("/dashboard/accounts")
}

export async function createSubscriptionAction(
  _prev: SubscriptionActionState,
  formData: FormData
): Promise<SubscriptionActionState> {
  try {
    const userId = await requireUserId()
    const parsed = createSubscriptionSchema.safeParse(formFields(formData))
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid subscription",
      }
    }
    await createSubscription(userId, parsed.data)
    revalidateSubscriptionPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof SubscriptionServiceError) return { error: error.message }
    return { error: "Could not create subscription" }
  }
}

export async function updateSubscriptionAction(
  _prev: SubscriptionActionState,
  formData: FormData
): Promise<SubscriptionActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updateSubscriptionSchema.safeParse({
      id: formData.get("id"),
      ...formFields(formData),
    })
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid subscription",
      }
    }
    await updateSubscription(userId, parsed.data)
    revalidateSubscriptionPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof SubscriptionServiceError) return { error: error.message }
    return { error: "Could not update subscription" }
  }
}

export async function pauseSubscriptionAction(
  _prev: SubscriptionActionState,
  formData: FormData
): Promise<SubscriptionActionState> {
  try {
    const userId = await requireUserId()
    const parsed = subscriptionIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid subscription" }
    await pauseSubscription(userId, parsed.data.id)
    revalidateSubscriptionPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof SubscriptionServiceError) return { error: error.message }
    return { error: "Could not pause subscription" }
  }
}

export async function resumeSubscriptionAction(
  _prev: SubscriptionActionState,
  formData: FormData
): Promise<SubscriptionActionState> {
  try {
    const userId = await requireUserId()
    const parsed = subscriptionIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid subscription" }
    await resumeSubscription(userId, parsed.data.id)
    revalidateSubscriptionPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof SubscriptionServiceError) return { error: error.message }
    return { error: "Could not resume subscription" }
  }
}

export async function cancelSubscriptionAction(
  _prev: SubscriptionActionState,
  formData: FormData
): Promise<SubscriptionActionState> {
  try {
    const userId = await requireUserId()
    const parsed = subscriptionIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid subscription" }
    await cancelSubscription({
      userId,
      subscriptionId: parsed.data.id,
    })
    revalidateSubscriptionPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof SubscriptionServiceError) return { error: error.message }
    return { error: "Could not cancel subscription" }
  }
}

export async function softDeleteSubscriptionAction(
  _prev: SubscriptionActionState,
  formData: FormData
): Promise<SubscriptionActionState> {
  try {
    const userId = await requireUserId()
    const parsed = subscriptionIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid subscription" }
    await softDeleteSubscription(userId, parsed.data.id)
    revalidateSubscriptionPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof SubscriptionServiceError) return { error: error.message }
    return { error: "Could not archive subscription" }
  }
}

export async function restoreSubscriptionAction(
  _prev: SubscriptionActionState,
  formData: FormData
): Promise<SubscriptionActionState> {
  try {
    const userId = await requireUserId()
    const parsed = subscriptionIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid subscription" }
    await restoreSubscription(userId, parsed.data.id)
    revalidateSubscriptionPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof SubscriptionServiceError) return { error: error.message }
    return { error: "Could not restore subscription" }
  }
}

export async function confirmPaidAction(
  _prev: SubscriptionActionState,
  formData: FormData
): Promise<SubscriptionActionState> {
  try {
    const userId = await requireUserId()
    const parsed = confirmPaidSchema.safeParse({
      id: formData.get("id"),
      accountId: formData.get("accountId") ?? "",
      exchangeRate: formData.get("exchangeRate") ?? "",
      exchangeRateSource: formData.get("exchangeRateSource") ?? "",
      allowOverdraft: formData.get("allowOverdraft") ?? "",
      paymentDate: formData.get("paymentDate") ?? "",
    })
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid confirmation",
      }
    }
    await confirmPaid(userId, parsed.data)
    revalidateSubscriptionPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof SubscriptionServiceError) return { error: error.message }
    return { error: "Could not confirm payment" }
  }
}
