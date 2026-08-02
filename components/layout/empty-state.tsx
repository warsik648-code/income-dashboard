import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[min(28rem,60vh)] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-muted-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.04)]">
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <h2 className="font-heading text-lg tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
