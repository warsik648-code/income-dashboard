"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app-error]", error.digest ?? error.message)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-medium tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page could not be loaded. Your data was not modified by this error
        screen. Try again, or return to the dashboard.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex h-7 items-center rounded-md border border-border px-2 text-xs font-medium hover:bg-input/50"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
