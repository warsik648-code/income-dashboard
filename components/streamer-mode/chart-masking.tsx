"use client"

import type { ReactNode } from "react"

import { STREAMER_MODE_A11Y_LABEL } from "@/lib/streamer-mode/constants"
import { cn } from "@/lib/utils"

import { useStreamerModeOptional } from "./streamer-mode-context"

/** Y-axis tick formatter that hides amounts when Streamer Mode is on. */
export function useStreamerYTickFormatter() {
  const { enabled } = useStreamerModeOptional()
  if (!enabled) return undefined
  return () => ""
}

/** Tooltip formatter that never emits raw financial values while streaming. */
export function useStreamerTooltipFormatter(
  formatValue: (value: number | string) => string
) {
  const { enabled } = useStreamerModeOptional()
  return (value: number | string | undefined) => {
    if (enabled) return STREAMER_MODE_A11Y_LABEL
    if (value == null) return ""
    return formatValue(value)
  }
}

/**
 * Wraps a chart plot. When Streamer Mode is on, blurs the plot area so
 * hover/tooltip DOM cannot leak amounts even if a tooltip briefly mounts.
 */
export function SensitiveChart({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { enabled } = useStreamerModeOptional()
  return (
    <div
      className={cn(
        "sensitive-chart relative h-full w-full min-w-0",
        enabled && "sensitive-chart--active",
        className
      )}
      aria-label={enabled ? STREAMER_MODE_A11Y_LABEL : undefined}
    >
      <div
        className="sensitive-chart__plot h-full w-full"
        aria-hidden={enabled || undefined}
      >
        {children}
      </div>
      {enabled ? (
        <span className="sr-only">{STREAMER_MODE_A11Y_LABEL}</span>
      ) : null}
    </div>
  )
}
