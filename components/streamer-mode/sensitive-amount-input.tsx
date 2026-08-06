"use client"

import { useState, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { useStreamerModeOptional } from "./streamer-mode-context"

type SensitiveAmountInputProps = Omit<
  ComponentProps<typeof Input>,
  "type"
> & {
  /** When true, never blur (password fields should not use this component). */
  disableMask?: boolean
}

/**
 * Amount inputs stay fully usable. While Streamer Mode is on and the field
 * is not focused, the control is visually blurred. The underlying value is
 * never rewritten — saved data cannot be corrupted by masking.
 */
export function SensitiveAmountInput({
  className,
  disableMask = false,
  onFocus,
  onBlur,
  ...props
}: SensitiveAmountInputProps) {
  const { enabled } = useStreamerModeOptional()
  const [focused, setFocused] = useState(false)
  const mask = enabled && !disableMask && !focused

  return (
    <Input
      {...props}
      type="text"
      inputMode={props.inputMode ?? "decimal"}
      autoComplete="off"
      className={cn(mask && "sensitive-value sensitive-input-masked", className)}
      title={undefined}
      onFocus={(event) => {
        setFocused(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        onBlur?.(event)
      }}
    />
  )
}
