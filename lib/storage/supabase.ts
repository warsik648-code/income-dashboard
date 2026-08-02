import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export class StorageConfigError extends Error {
  constructor(message = "File storage is not configured.") {
    super(message)
    this.name = "StorageConfigError"
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    // Do not include env var names in thrown messages that may reach clients.
    console.error(`[storage] Missing required environment variable: ${name}`)
    throw new StorageConfigError()
  }
  return value
}

let client: SupabaseClient | null = null

/** Server-only Supabase client using the service role key. Never import in client components. */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY")

  client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return client
}

export function getAttachmentsBucket(): string {
  return (
    process.env.SUPABASE_ATTACHMENTS_BUCKET?.trim() || "financial-attachments"
  )
}

export function getSignedUrlTtlSeconds(): number {
  const raw = process.env.SUPABASE_SIGNED_URL_TTL_SECONDS?.trim()
  const parsed = raw ? Number(raw) : 120
  if (!Number.isFinite(parsed) || parsed < 30 || parsed > 3600) return 120
  return Math.floor(parsed)
}
