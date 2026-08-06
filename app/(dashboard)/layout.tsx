import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { hasValidSessionUserId } from "@/lib/auth/session-guards"
import { getStreamerMode } from "@/lib/services/streamer-mode"
import { AppShell } from "@/components/layout/app-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Read-only in RSC: never call signOut/signIn here — they write cookies
  // via cookies().set, which Next.js forbids outside Server Actions / Route Handlers.
  // Invalid sessions simply redirect; cookie clearing happens in logoutAction.
  if (!session?.user || !hasValidSessionUserId(session)) {
    redirect("/login")
  }

  const user = session.user
  const streamerMode = await getStreamerMode(user.id)

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
      }}
      streamerMode={streamerMode}
    >
      {children}
    </AppShell>
  )
}
