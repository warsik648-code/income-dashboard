"use client"

import Image from "next/image"
import { useState } from "react"

import { isSafeHttpsLogoUrl } from "@/lib/subscriptions/logo-url"

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
    <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground">
      {showImage ? (
        <Image
          src={safeUrl!}
          alt=""
          width={40}
          height={40}
          className="size-full object-contain p-1"
          // Hotlink-sensitive CDNs (e.g. gstatic) often block the optimizer.
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <span aria-hidden>{initialsFrom(name, provider)}</span>
      )}
    </div>
  )
}
