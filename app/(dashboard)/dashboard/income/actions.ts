"use server"

import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import {
  IncomeServiceError,
  createIncome,
  softDeleteIncome,
  updateIncome,
} from "@/lib/services/income"
import {
  createIncomeSchema,
  softDeleteIncomeSchema,
  updateIncomeSchema,
} from "@/lib/validations/income"

export type IncomeActionState = {
  ok?: boolean
  error?: string
}

async function requireUserId() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session.user.id
}

function formFields(formData: FormData) {
  return {
    accountId: formData.get("accountId"),
    amount: formData.get("amount"),
    exchangeRate: formData.get("exchangeRate") ?? "",
    transactionDate: formData.get("transactionDate"),
    description: formData.get("description"),
    counterparty: formData.get("counterparty") ?? "",
    notes: formData.get("notes") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
  }
}

export async function createIncomeAction(
  _prev: IncomeActionState,
  formData: FormData
): Promise<IncomeActionState> {
  try {
    const userId = await requireUserId()
    const parsed = createIncomeSchema.safeParse(formFields(formData))
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid income details" }
    }
    await createIncome(userId, parsed.data)
    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard/accounts")
    return { ok: true }
  } catch (error) {
    if (error instanceof IncomeServiceError) return { error: error.message }
    return { error: "Could not create income entry" }
  }
}

export async function updateIncomeAction(
  _prev: IncomeActionState,
  formData: FormData
): Promise<IncomeActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updateIncomeSchema.safeParse({
      id: formData.get("id"),
      ...formFields(formData),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid income details" }
    }
    await updateIncome(userId, parsed.data)
    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard/accounts")
    return { ok: true }
  } catch (error) {
    if (error instanceof IncomeServiceError) return { error: error.message }
    return { error: "Could not update income entry" }
  }
}

export async function softDeleteIncomeAction(
  _prev: IncomeActionState,
  formData: FormData
): Promise<IncomeActionState> {
  try {
    const userId = await requireUserId()
    const parsed = softDeleteIncomeSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid income entry" }
    await softDeleteIncome(userId, parsed.data.id)
    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard/accounts")
    return { ok: true }
  } catch (error) {
    if (error instanceof IncomeServiceError) return { error: error.message }
    return { error: "Could not delete income entry" }
  }
}
