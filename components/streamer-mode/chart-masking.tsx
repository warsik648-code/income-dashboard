"use client"

import { useMemo, type ReactNode } from "react"

import { STREAMER_MODE_A11Y_LABEL } from "@/lib/streamer-mode/constants"
import { formatStreamerAxisTick } from "@/lib/streamer-mode/request"
import { cn } from "@/lib/utils"

import { useStreamerModeOptional } from "./streamer-mode-context"

export { formatStreamerAxisTick }

/** Stable Recharts tick style — never swap `tick={false}` ↔ object (crashes Recharts). */
export const STREAMER_CHART_TICK_STYLE = {
  fill: "var(--muted-foreground)",
  fontSize: 11,
} as const

/**
 * Numeric axis tick formatter. Always returns a function so Recharts prop
 * types stay stable across Streamer Mode ON/OFF transitions.
 */
export function useStreamerAxisTickFormatter() {
  const { enabled } = useStreamerModeOptional()
  return useMemo(
    () => (value: string | number) => formatStreamerAxisTick(enabled, value),
    [enabled]
  )
}

/** @deprecated use useStreamerAxisTickFormatter — kept for import compatibility */
export function useStreamerYTickFormatter() {
  return useStreamerAxisTickFormatter()
}

/** Tooltip formatter that never emits raw financial values while streaming. */
export function useStreamerTooltipFormatter(
  formatValue: (value: number | string) => string
) {
  const { enabled } = useStreamerModeOptional()
  return useMemo(
    () => (value: number | string | undefined) => {
      if (enabled) return STREAMER_MODE_A11Y_LABEL
      if (value == null) return ""
      return formatValue(value)
    },
    [enabled, formatValue]
  )
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
