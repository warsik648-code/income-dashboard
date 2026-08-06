import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { hasValidSessionUserId } from "@/lib/auth/session-guards"

import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const session = await auth()
  // Full Node auth (incl. jwt DB checks) — safe to send valid sessions home.
  // Middleware must not do this redirect from an edge-only JWT decode.
  if (hasValidSessionUserId(session)) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <LoginForm />
    </main>
  )
}
