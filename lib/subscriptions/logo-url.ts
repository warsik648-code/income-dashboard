/**
 * Allowed hosts for subscription logo images.
 * Keep in sync with `images.remotePatterns` in next.config.ts.
 * Intentionally narrow — no catch-all hostname wildcards.
 */
export const SUBSCRIPTION_LOGO_REMOTE_PATTERNS = [
  { protocol: "https" as const, hostname: "cdn.jsdelivr.net" },
  { protocol: "https" as const, hostname: "raw.githubusercontent.com" },
  { protocol: "https" as const, hostname: "images.unsplash.com" },
  { protocol: "https" as const, hostname: "logo.clearbit.com" },
  { protocol: "https" as const, hostname: "www.google.com", pathname: "/s2/favicons/**" },
  { protocol: "https" as const, hostname: "upload.wikimedia.org" },
  { protocol: "https" as const, hostname: "images.seeklogo.com" },
  { protocol: "https" as const, hostname: "uxwing.com" },
  // Google thumbnail CDN used by many pasted logo URLs
  { protocol: "https" as const, hostname: "encrypted-tbn0.gstatic.com" },
  { protocol: "https" as const, hostname: "encrypted-tbn1.gstatic.com" },
  { protocol: "https" as const, hostname: "encrypted-tbn2.gstatic.com" },
  { protocol: "https" as const, hostname: "encrypted-tbn3.gstatic.com" },
]

const ALLOWED_HOSTS = new Set(
  SUBSCRIPTION_LOGO_REMOTE_PATTERNS.map((pattern) => pattern.hostname.toLowerCase())
)

/** Clearbit serves logos under logo.clearbit.com and related subdomains. */
function isAllowedLogoHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (ALLOWED_HOSTS.has(host)) return true
  return host === "clearbit.com" || host.endsWith(".clearbit.com")
}

export function isSafeHttpsLogoUrl(
  value: string | null | undefined
): value is string {
  if (!value?.trim()) return false
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:") return false
    return isAllowedLogoHost(url.hostname)
  } catch {
    return false
  }
}
