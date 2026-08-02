import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ChartCard({
  title,
  description,
  children,
  empty,
  isEmpty,
}: {
  title: string
  description?: string
  children: ReactNode
  empty?: string
  isEmpty?: boolean
}) {
  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base tracking-tight">{title}</CardTitle>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/20 px-4 text-center text-sm text-muted-foreground">
            {empty ?? "No data in this range."}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
