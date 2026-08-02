"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth/session"
import {
  ExpenseServiceError,
  createExpense,
  restoreExpense,
  softDeleteExpense,
  updateExpense,
} from "@/lib/services/expenses"
import {
  createExpenseSchema,
  restoreExpenseSchema,
  softDeleteExpenseSchema,
  updateExpenseSchema,
} from "@/lib/validations/expenses"

export type ExpenseActionState = {
  ok?: boolean
  error?: string
}


function formFields(formData: FormData) {
  return {
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    exchangeRate: formData.get("exchangeRate") ?? "",
    transactionDate: formData.get("transactionDate"),
    description: formData.get("description"),
    counterparty: formData.get("counterparty"),
    notes: formData.get("notes") ?? "",
    paymentMethod: formData.get("paymentMethod"),
    allowOverdraft: formData.get("allowOverdraft") ?? "",
  }
}

function revalidateExpensePaths() {
  revalidatePath("/dashboard/expenses")
  revalidatePath("/dashboard/accounts")
}

export async function createExpenseAction(
  _prev: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  try {
    const userId = await requireUserId()
    const parsed = createExpenseSchema.safeParse(formFields(formData))
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid expense" }
    }
    await createExpense(userId, parsed.data)
    revalidateExpensePaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof ExpenseServiceError) return { error: error.message }
    return { error: "Could not create expense" }
  }
}

export async function updateExpenseAction(
  _prev: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updateExpenseSchema.safeParse({
      id: formData.get("id"),
      ...formFields(formData),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid expense" }
    }
    await updateExpense(userId, parsed.data)
    revalidateExpensePaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof ExpenseServiceError) return { error: error.message }
    return { error: "Could not update expense" }
  }
}

export async function softDeleteExpenseAction(
  _prev: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  try {
    const userId = await requireUserId()
    const parsed = softDeleteExpenseSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid expense" }
    await softDeleteExpense(userId, parsed.data.id)
    revalidateExpensePaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof ExpenseServiceError) return { error: error.message }
    return { error: "Could not delete expense" }
  }
}

export async function restoreExpenseAction(
  _prev: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  try {
    const userId = await requireUserId()
    const parsed = restoreExpenseSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid expense" }
    await restoreExpense(userId, parsed.data.id, {
      allowOverdraft: formData.get("allowOverdraft") === "true",
    })
    revalidateExpensePaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof ExpenseServiceError) return { error: error.message }
    return { error: "Could not restore expense" }
  }
}
