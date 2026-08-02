"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth/session"
import {
  AccountServiceError,
  archiveAccount,
  createAccount,
  unarchiveAccount,
  updateAccount,
} from "@/lib/services/accounts"
import {
  archiveAccountSchema,
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validations/accounts"

export type AccountActionState = {
  ok?: boolean
  error?: string
}


export async function createAccountAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const userId = await requireUserId()
    const parsed = createAccountSchema.safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      assetClass: formData.get("assetClass"),
      currency: formData.get("currency"),
      institution: formData.get("institution") ?? "",
      notes: formData.get("notes") ?? "",
      startingBalance: formData.get("startingBalance") ?? "",
      exchangeRate: formData.get("exchangeRate") ?? "",
      exchangeRateSource: formData.get("exchangeRateSource") ?? "",
    })

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid account details",
      }
    }

    await createAccount(userId, parsed.data)
    revalidatePath("/dashboard/accounts")
    return { ok: true }
  } catch (error) {
    if (error instanceof AccountServiceError) {
      return { error: error.message }
    }
    return { error: "Could not create account" }
  }
}

export async function updateAccountAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updateAccountSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      institution: formData.get("institution") ?? "",
      notes: formData.get("notes") ?? "",
    })

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid account details",
      }
    }

    await updateAccount(userId, parsed.data)
    revalidatePath("/dashboard/accounts")
    return { ok: true }
  } catch (error) {
    if (error instanceof AccountServiceError) {
      return { error: error.message }
    }
    return { error: "Could not update account" }
  }
}

export async function archiveAccountAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const userId = await requireUserId()
    const parsed = archiveAccountSchema.safeParse({
      id: formData.get("id"),
    })
    if (!parsed.success) {
      return { error: "Invalid account" }
    }

    await archiveAccount(userId, parsed.data.id)
    revalidatePath("/dashboard/accounts")
    return { ok: true }
  } catch (error) {
    if (error instanceof AccountServiceError) {
      return { error: error.message }
    }
    return { error: "Could not archive account" }
  }
}

export async function unarchiveAccountAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const userId = await requireUserId()
    const parsed = archiveAccountSchema.safeParse({
      id: formData.get("id"),
    })
    if (!parsed.success) {
      return { error: "Invalid account" }
    }

    await unarchiveAccount(userId, parsed.data.id)
    revalidatePath("/dashboard/accounts")
    return { ok: true }
  } catch (error) {
    if (error instanceof AccountServiceError) {
      return { error: error.message }
    }
    return { error: "Could not restore account" }
  }
}
