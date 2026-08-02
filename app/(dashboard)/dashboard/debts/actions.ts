"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth/session"
import {
  DebtServiceError,
  createDebt,
  markDebtFullyPaid,
  recordDebtPayment,
  restoreDebt,
  softDeleteDebt,
  updateDebt,
} from "@/lib/services/debts"
import {
  createDebtSchema,
  debtIdSchema,
  recordDebtPaymentSchema,
  updateDebtSchema,
} from "@/lib/validations/debts"

export type DebtActionState = {
  ok?: boolean
  error?: string
}


function debtFormFields(formData: FormData) {
  return {
    personName: formData.get("personName"),
    direction: formData.get("direction"),
    originalAmount: formData.get("originalAmount"),
    currency: formData.get("currency"),
    exchangeRate: formData.get("exchangeRate") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    notes: formData.get("notes") ?? "",
    status: formData.get("status") ?? "OPEN",
    accountId: formData.get("accountId") ?? "",
  }
}

function revalidateDebtPaths() {
  revalidatePath("/dashboard/debts")
  revalidatePath("/dashboard/income")
  revalidatePath("/dashboard/expenses")
  revalidatePath("/dashboard/accounts")
}

export async function createDebtAction(
  _prev: DebtActionState,
  formData: FormData
): Promise<DebtActionState> {
  try {
    const userId = await requireUserId()
    const parsed = createDebtSchema.safeParse(debtFormFields(formData))
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid debt" }
    }
    await createDebt(userId, parsed.data)
    revalidateDebtPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof DebtServiceError) return { error: error.message }
    return { error: "Could not create debt" }
  }
}

export async function updateDebtAction(
  _prev: DebtActionState,
  formData: FormData
): Promise<DebtActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updateDebtSchema.safeParse({
      id: formData.get("id"),
      ...debtFormFields(formData),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid debt" }
    }
    await updateDebt(userId, parsed.data)
    revalidateDebtPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof DebtServiceError) return { error: error.message }
    return { error: "Could not update debt" }
  }
}

export async function recordDebtPaymentAction(
  _prev: DebtActionState,
  formData: FormData
): Promise<DebtActionState> {
  try {
    const userId = await requireUserId()
    const parsed = recordDebtPaymentSchema.safeParse({
      debtId: formData.get("debtId"),
      amount: formData.get("amount") ?? "",
      exchangeRate: formData.get("exchangeRate") ?? "",
      paymentDate: formData.get("paymentDate"),
      notes: formData.get("notes") ?? "",
      accountId: formData.get("accountId") ?? "",
      allowOverdraft: formData.get("allowOverdraft") ?? "",
      markFullyPaid: formData.get("markFullyPaid") ?? "",
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid payment" }
    }
    await recordDebtPayment(userId, parsed.data)
    revalidateDebtPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof DebtServiceError) return { error: error.message }
    return { error: "Could not record payment" }
  }
}

export async function markDebtFullyPaidAction(
  _prev: DebtActionState,
  formData: FormData
): Promise<DebtActionState> {
  try {
    const userId = await requireUserId()
    const parsed = recordDebtPaymentSchema.safeParse({
      debtId: formData.get("debtId"),
      amount: "",
      exchangeRate: formData.get("exchangeRate") ?? "",
      paymentDate: formData.get("paymentDate"),
      notes: formData.get("notes") ?? "",
      accountId: formData.get("accountId") ?? "",
      allowOverdraft: formData.get("allowOverdraft") ?? "",
      markFullyPaid: "true",
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid payment" }
    }
    await markDebtFullyPaid(userId, parsed.data)
    revalidateDebtPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof DebtServiceError) return { error: error.message }
    return { error: "Could not mark debt as paid" }
  }
}

export async function softDeleteDebtAction(
  _prev: DebtActionState,
  formData: FormData
): Promise<DebtActionState> {
  try {
    const userId = await requireUserId()
    const parsed = debtIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid debt" }
    await softDeleteDebt(userId, parsed.data.id)
    revalidateDebtPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof DebtServiceError) return { error: error.message }
    return { error: "Could not archive debt" }
  }
}

export async function restoreDebtAction(
  _prev: DebtActionState,
  formData: FormData
): Promise<DebtActionState> {
  try {
    const userId = await requireUserId()
    const parsed = debtIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid debt" }
    await restoreDebt(userId, parsed.data.id)
    revalidateDebtPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof DebtServiceError) return { error: error.message }
    return { error: "Could not restore debt" }
  }
}
