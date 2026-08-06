import { redirect } from "next/navigation"

import { auth, signOut } from "@/auth"
import { hasValidSessionUserId } from "@/lib/auth/session-guards"
import { AppShell } from "@/components/layout/app-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Require a non-empty user id (rejects stale/invalid JWTs).
  // Clear the cookie so middleware cannot bounce us back to /dashboard.
  if (!session?.user || !hasValidSessionUserId(session)) {
    await signOut({ redirect: false })
    redirect("/login")
  }

  const user = session.user

  return (
    <AppShell
      user={{
        email: user.email,
        name: user.name,
      }}
    >
      {children}
    </AppShell>
  )
}
