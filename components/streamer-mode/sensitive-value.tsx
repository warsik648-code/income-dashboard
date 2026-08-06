"use client"

import type { ReactNode } from "react"

import { STREAMER_MODE_A11Y_LABEL } from "@/lib/streamer-mode/constants"
import { cn } from "@/lib/utils"

import { useStreamerModeOptional } from "./streamer-mode-context"

type SensitiveValueProps = {
  children: ReactNode
  className?: string
  as?: "span" | "p" | "div"
}

/**
 * Marks financial content for Streamer Mode.
 * Blur is CSS-driven via `[data-streamer-mode=on]` so the first paint
 * matches the server preference (no unblurred flash).
 */
export function SensitiveValue({
  children,
  className,
  as: Tag = "span",
}: SensitiveValueProps) {
  const { enabled } = useStreamerModeOptional()

  return (
    <Tag
      className={cn("sensitive-value", className)}
      data-sensitive=""
      title={undefined}
      aria-label={enabled ? STREAMER_MODE_A11Y_LABEL : undefined}
      onCopy={
        enabled
          ? (event) => {
              event.preventDefault()
            }
          : undefined
      }
      onCut={
        enabled
          ? (event) => {
              event.preventDefault()
            }
          : undefined
      }
    >
      <span
        className="sensitive-value__content"
        aria-hidden={enabled || undefined}
      >
        {children}
      </span>
      {enabled ? (
        <span className="sr-only">{STREAMER_MODE_A11Y_LABEL}</span>
      ) : null}
    </Tag>
  )
}

/** Alias for prose-style sensitive text (same behavior). */
export function SensitiveText(props: SensitiveValueProps) {
  return <SensitiveValue {...props} />
}
