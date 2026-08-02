import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/auth/actions"

export default async function DashboardShellPage() {
  const session = await auth()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-xl font-medium tracking-tight">Signed in</h1>
        <p className="text-sm text-muted-foreground">
          Authentication is working. The finance dashboard UI will be built in a
          later phase.
        </p>
        <p className="text-sm text-muted-foreground">
          Session user: {session?.user?.email ?? "unknown"}
        </p>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  )
}
