import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { AppShell } from "@/components/layout/app-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const userId = session?.user?.id?.trim()

  // Require a non-empty user id (rejects stale/invalid JWTs).
  if (!userId || !session?.user) {
    redirect("/login")
  }

  return (
    <AppShell
      user={{
        email: session.user.email,
        name: session.user.name,
      }}
    >
      {children}
    </AppShell>
  )
}
