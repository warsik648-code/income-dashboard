import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-medium tracking-tight">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        That URL does not match a page in Income Dashboard.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-7 items-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/80"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
