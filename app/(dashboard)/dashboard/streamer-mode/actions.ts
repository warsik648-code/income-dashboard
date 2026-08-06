"use server"

import { z } from "zod"

import { UnauthorizedError, requireUserId } from "@/lib/auth/session"
import { setStreamerMode } from "@/lib/services/streamer-mode"

const streamerModeInputSchema = z.object({
  enabled: z.boolean(),
  requestId: z.number().int().positive().optional(),
})

export type SetStreamerModeResult =
  | { ok: true; enabled: boolean; requestId?: number }
  | { ok: false; error: string; requestId?: number }

/**
 * Persist Streamer Mode. Intentionally does NOT revalidate the dashboard layout:
 * client state already reflects the toggle, and layout revalidation remounted
 * Recharts with incompatible tick props (crash on OFF).
 */
export async function setStreamerModeAction(
  input: boolean | { enabled: boolean; requestId?: number }
): Promise<SetStreamerModeResult> {
  const parsed = streamerModeInputSchema.safeParse(
    typeof input === "boolean" ? { enabled: input } : input
  )
  if (!parsed.success) {
    return { ok: false, error: "Invalid Streamer Mode value" }
  }

  const { enabled, requestId } = parsed.data

  try {
    const userId = await requireUserId()
    const next = await setStreamerMode(userId, enabled)
    return { ok: true, enabled: next, requestId }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        ok: false,
        error: "You must be signed in to change Streamer Mode",
        requestId,
      }
    }
    // Log shape only — never amounts or financial payloads.
    console.error("[streamer-mode] setStreamerModeAction failed", {
      enabled,
      requestId,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown",
    })
    return {
      ok: false,
      error: "Could not update Streamer Mode",
      requestId,
    }
  }
}
