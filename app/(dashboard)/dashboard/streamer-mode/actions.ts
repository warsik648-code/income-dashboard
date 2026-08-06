"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth/session"
import { setStreamerMode } from "@/lib/services/streamer-mode"

export async function setStreamerModeAction(
  enabled: boolean
): Promise<{ ok: true; enabled: boolean } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId()
    const next = await setStreamerMode(userId, Boolean(enabled))
    // Preference affects every protected page's first paint.
    revalidatePath("/dashboard", "layout")
    return { ok: true, enabled: next }
  } catch {
    return { ok: false, error: "Could not update Streamer Mode" }
  }
}
