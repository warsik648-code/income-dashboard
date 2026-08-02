"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth/session"
import {
  TransferServiceError,
  cancelPendingTransfer,
  createTransfer,
  reverseTransfer,
  updatePendingTransfer,
  updateTransferMeta,
} from "@/lib/services/transfers"
import {
  createTransferSchema,
  transferIdSchema,
  updatePendingTransferSchema,
  updateTransferMetaSchema,
} from "@/lib/validations/transfers"

export type TransferActionState = {
  ok?: boolean
  error?: string
  transferId?: string
}

function formFields(formData: FormData) {
  return {
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    sourceAmount: formData.get("sourceAmount"),
    destinationAmount: formData.get("destinationAmount"),
    suggestedExchangeRate: formData.get("suggestedExchangeRate") ?? "",
    effectiveExchangeRate: formData.get("effectiveExchangeRate") ?? "",
    suggestedDestinationAmount:
      formData.get("suggestedDestinationAmount") ?? "",
    sourceUsdRate: formData.get("sourceUsdRate") ?? "",
    destinationUsdRate: formData.get("destinationUsdRate") ?? "",
    feeAmount: formData.get("feeAmount") ?? "",
    feeCurrency: formData.get("feeCurrency") ?? "",
    feePaidSeparately: formData.get("feePaidSeparately") ?? "",
    feeUsdRate: formData.get("feeUsdRate") ?? "",
    status: formData.get("status") ?? "COMPLETED",
    transferredAt: formData.get("transferredAt"),
    reference: formData.get("reference") ?? "",
    notes: formData.get("notes") ?? "",
    idempotencyKey: formData.get("idempotencyKey") ?? "",
    allowOverdraft: formData.get("allowOverdraft") ?? "",
  }
}

function revalidateTransferPaths() {
  revalidatePath("/dashboard/transfers")
  revalidatePath("/dashboard/accounts")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/expenses")
  revalidatePath("/dashboard/analytics")
}

export async function createTransferAction(
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  try {
    const userId = await requireUserId()
    const raw = formFields(formData)
    if (!raw.idempotencyKey) {
      raw.idempotencyKey = randomUUID()
    }
    const parsed = createTransferSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid transfer details",
      }
    }
    const created = await createTransfer(userId, parsed.data)
    revalidateTransferPaths()
    return { ok: true, transferId: created.id }
  } catch (error) {
    if (error instanceof TransferServiceError) return { error: error.message }
    return { error: "Could not create transfer" }
  }
}

export async function updatePendingTransferAction(
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updatePendingTransferSchema.safeParse({
      id: formData.get("id"),
      ...formFields(formData),
    })
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid transfer details",
      }
    }
    await updatePendingTransfer(userId, parsed.data)
    revalidateTransferPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof TransferServiceError) return { error: error.message }
    return { error: "Could not update transfer" }
  }
}

export async function updateTransferMetaAction(
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updateTransferMetaSchema.safeParse({
      id: formData.get("id"),
      reference: formData.get("reference") ?? "",
      notes: formData.get("notes") ?? "",
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid details" }
    }
    await updateTransferMeta(userId, parsed.data)
    revalidateTransferPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof TransferServiceError) return { error: error.message }
    return { error: "Could not update transfer" }
  }
}

export async function reverseTransferAction(
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  try {
    const userId = await requireUserId()
    const parsed = transferIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Transfer not found" }
    await reverseTransfer(userId, parsed.data.id)
    revalidateTransferPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof TransferServiceError) return { error: error.message }
    return { error: "Could not reverse transfer" }
  }
}

export async function cancelPendingTransferAction(
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  try {
    const userId = await requireUserId()
    const parsed = transferIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Transfer not found" }
    await cancelPendingTransfer(userId, parsed.data.id)
    revalidateTransferPaths()
    return { ok: true }
  } catch (error) {
    if (error instanceof TransferServiceError) return { error: error.message }
    return { error: "Could not cancel transfer" }
  }
}
