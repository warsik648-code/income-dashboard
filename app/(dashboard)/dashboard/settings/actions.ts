"use server"

import { revalidatePath } from "next/cache"
import { signOut } from "@/auth"

import { requireUserId } from "@/lib/auth/session"
import {
  SettingsServiceError,
  archiveCategory,
  changePassword,
  createCategory,
  restoreCategory,
  updateCategory,
  updatePreferences,
} from "@/lib/services/settings"
import {
  categoryIdSchema,
  changePasswordSchema,
  createCategorySchema,
  updateCategorySchema,
  updatePreferencesSchema,
} from "@/lib/validations/settings"

export type SettingsActionState = {
  ok?: boolean
  error?: string
  message?: string
}


function revalidateSettings() {
  revalidatePath("/dashboard/settings")
}

export async function updatePreferencesAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updatePreferencesSchema.safeParse({
      preferredCurrency: formData.get("preferredCurrency"),
      timezone: formData.get("timezone"),
      dateFormat: formData.get("dateFormat"),
      numberFormat: formData.get("numberFormat"),
      defaultIncomeAccountId: formData.get("defaultIncomeAccountId") ?? "",
      defaultExpenseAccountId: formData.get("defaultExpenseAccountId") ?? "",
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid preferences" }
    }
    await updatePreferences(userId, parsed.data)
    revalidateSettings()
    return { ok: true, message: "Preferences saved." }
  } catch (error) {
    if (error instanceof SettingsServiceError) return { error: error.message }
    return { error: "Could not save preferences" }
  }
}

export async function changePasswordAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireUserId()
    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid password" }
    }
    await changePassword(userId, parsed.data)
    // End current session; other JWTs fail pwdAt check.
    await signOut({ redirectTo: "/login" })
    return { ok: true }
  } catch (error) {
    if (error instanceof SettingsServiceError) return { error: error.message }
    // signOut may throw NEXT_REDIRECT — rethrow
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error
    }
    return { error: "Could not change password" }
  }
}

export async function createCategoryAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireUserId()
    const parsed = createCategorySchema.safeParse({
      kind: formData.get("kind"),
      name: formData.get("name"),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid category" }
    }
    await createCategory(userId, parsed.data)
    revalidateSettings()
    return { ok: true, message: "Category created." }
  } catch (error) {
    if (error instanceof SettingsServiceError) return { error: error.message }
    return { error: "Could not create category" }
  }
}

export async function updateCategoryAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updateCategorySchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid category" }
    }
    await updateCategory(userId, parsed.data)
    revalidateSettings()
    return { ok: true, message: "Category updated." }
  } catch (error) {
    if (error instanceof SettingsServiceError) return { error: error.message }
    return { error: "Could not update category" }
  }
}

export async function archiveCategoryAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireUserId()
    const parsed = categoryIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid category" }
    await archiveCategory(userId, parsed.data.id)
    revalidateSettings()
    return { ok: true, message: "Category archived." }
  } catch (error) {
    if (error instanceof SettingsServiceError) return { error: error.message }
    return { error: "Could not archive category" }
  }
}

export async function restoreCategoryAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireUserId()
    const parsed = categoryIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid category" }
    await restoreCategory(userId, parsed.data.id)
    revalidateSettings()
    return { ok: true, message: "Category restored." }
  } catch (error) {
    if (error instanceof SettingsServiceError) return { error: error.message }
    return { error: "Could not restore category" }
  }
}
