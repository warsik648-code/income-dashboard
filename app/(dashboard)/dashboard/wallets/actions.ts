"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth/session"
import {
  WalletIntegrationServiceError,
  refreshAllWalletIntegrations,
  refreshWalletIntegration,
  testWalletConnection,
  updateWalletIntegration,
} from "@/lib/services/wallet-integrations"
import {
  updateWalletIntegrationSchema,
  walletIntegrationIdSchema,
} from "@/lib/validations/wallet-integrations"

export type WalletActionState = {
  ok?: boolean
  error?: string
  message?: string
  balance?: string
}

function revalidateWallets() {
  revalidatePath("/dashboard/wallets")
  revalidatePath("/dashboard/settings")
}

export async function updateWalletIntegrationAction(
  _prev: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  try {
    const userId = await requireUserId()
    const enabledRaw = formData.get("isEnabled")
    const parsed = updateWalletIntegrationSchema.safeParse({
      id: formData.get("id"),
      publicAddress: formData.get("publicAddress") ?? "",
      financialAccountId: formData.get("financialAccountId") ?? "",
      network: formData.get("network") || undefined,
      isEnabled:
        enabledRaw === null || enabledRaw === undefined
          ? undefined
          : enabledRaw,
    })
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid wallet settings",
      }
    }
    await updateWalletIntegration(userId, parsed.data)
    revalidateWallets()
    return { ok: true, message: "Wallet integration saved." }
  } catch (error) {
    if (error instanceof WalletIntegrationServiceError) {
      return { error: error.message }
    }
    return { error: "Could not save wallet integration" }
  }
}

export async function disableWalletIntegrationAction(
  _prev: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  try {
    const userId = await requireUserId()
    const parsed = updateWalletIntegrationSchema.safeParse({
      id: formData.get("id"),
      publicAddress: formData.get("publicAddress") ?? "",
      financialAccountId: formData.get("financialAccountId") ?? "",
      network: formData.get("network") || undefined,
      isEnabled: false,
    })
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid wallet settings",
      }
    }
    await updateWalletIntegration(userId, parsed.data)
    revalidateWallets()
    return { ok: true, message: "Wallet integration disabled." }
  } catch (error) {
    if (error instanceof WalletIntegrationServiceError) {
      return { error: error.message }
    }
    return { error: "Could not disable wallet integration" }
  }
}

export async function testWalletConnectionAction(
  _prev: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  try {
    const userId = await requireUserId()
    const parsed = walletIntegrationIdSchema.safeParse({
      id: formData.get("id"),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid id" }
    }
    const result = await testWalletConnection(userId, parsed.data.id)
    revalidateWallets()
    if (!result.ok) {
      return { error: result.error ?? "Connection test failed" }
    }
    return {
      ok: true,
      message: "Connection OK",
      balance: result.balance ?? undefined,
    }
  } catch (error) {
    if (error instanceof WalletIntegrationServiceError) {
      return { error: error.message }
    }
    return { error: "Could not test connection" }
  }
}

export async function refreshWalletIntegrationAction(
  _prev: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  try {
    const userId = await requireUserId()
    const parsed = walletIntegrationIdSchema.safeParse({
      id: formData.get("id"),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid id" }
    }
    const row = await refreshWalletIntegration(userId, parsed.data.id)
    revalidateWallets()
    if (row.error) {
      return { error: row.error }
    }
    return {
      ok: true,
      message: "Balance refreshed.",
      balance: row.liveBalance ?? undefined,
    }
  } catch (error) {
    if (error instanceof WalletIntegrationServiceError) {
      return { error: error.message }
    }
    return { error: "Could not refresh balance" }
  }
}

export async function refreshAllWalletIntegrationsAction(
  _prev: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  void formData
  try {
    const userId = await requireUserId()
    await refreshAllWalletIntegrations(userId)
    revalidateWallets()
    return { ok: true, message: "All enabled wallets refreshed." }
  } catch (error) {
    if (error instanceof WalletIntegrationServiceError) {
      return { error: error.message }
    }
    return { error: "Could not refresh wallets" }
  }
}
