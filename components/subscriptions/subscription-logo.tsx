"use client"

import { useState } from "react"

const LOGO_HOST_ALLOWLIST = new Set([
  "cdn.jsdelivr.net",
  "raw.githubusercontent.com",
  "images.unsplash.com",
  "logo.clearbit.com",
  "www.google.com",
  "upload.wikimedia.org",
])

function isSafeHttpsLogoUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:") return false
    const host = url.hostname.toLowerCase()
    return LOGO_HOST_ALLOWLIST.has(host) || host.endsWith(".clearbit.com")
  } catch {
    return false
  }
}

function initialsFrom(name: string, provider: string) {
  const source = (name || provider || "?").trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function SubscriptionLogo({
  name,
  provider,
  logoUrl,
}: {
  name: string
  provider: string
  logoUrl?: string | null
}) {
  const safeUrl = isSafeHttpsLogoUrl(logoUrl) ? logoUrl.trim() : null
  const [broken, setBroken] = useState(false)
  const showImage = Boolean(safeUrl) && !broken

  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground">
      {showImage ? (
        // Remote logos are user-supplied https URLs; onError falls back to initials.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeUrl!}
          alt=""
          className="size-full object-contain p-1"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <span aria-hidden>{initialsFrom(name, provider)}</span>
      )}
    </div>
  )
}
