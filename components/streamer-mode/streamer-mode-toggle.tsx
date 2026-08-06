"use client"

import { Eye, EyeOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { useStreamerMode } from "./streamer-mode-context"

export function StreamerModeHeaderToggle({ className }: { className?: string }) {
  const { enabled, toggle, pending } = useStreamerMode()

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {enabled ? (
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Streamer Mode on
        </Badge>
      ) : null}
      <Button
        type="button"
        variant={enabled ? "default" : "outline"}
        size="sm"
        disabled={pending}
        onClick={() => toggle()}
        aria-pressed={enabled}
        title="Toggle Streamer Mode (⌘/Ctrl+Shift+S)"
        className="gap-1.5"
      >
        {enabled ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        <span className="hidden md:inline">
          {enabled ? "Hide Streamer Mode" : "Streamer Mode"}
        </span>
      </Button>
    </div>
  )
}

export function StreamerModeSidebarControl() {
  const { enabled, setEnabled, pending } = useStreamerMode()

  return (
    <div className="space-y-2 rounded-xl border border-sidebar-border/80 bg-sidebar-accent/30 p-2.5 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="streamer-mode-sidebar" className="text-xs font-medium">
          Streamer Mode
        </Label>
        {enabled ? (
          <Badge variant="secondary" className="text-[10px]">
            Active
          </Badge>
        ) : null}
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Blur balances and amounts for screen sharing. Shortcut: ⌘/Ctrl+Shift+S
      </p>
      <Button
        id="streamer-mode-sidebar"
        type="button"
        size="sm"
        variant={enabled ? "default" : "outline"}
        className="w-full gap-1.5"
        disabled={pending}
        aria-pressed={enabled}
        onClick={() => setEnabled(!enabled)}
      >
        {enabled ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {enabled ? "Turn off" : "Turn on"}
      </Button>
    </div>
  )
}

export function StreamerModeSettingsCard() {
  const { enabled, setEnabled, pending } = useStreamerMode()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Streamer Mode</p>
        {enabled ? <Badge variant="secondary">Active</Badge> : null}
      </div>
      <p className="text-sm text-muted-foreground">
        When enabled, financial amounts, balances, fees, rates, and chart values
        are blurred across the dashboard. This is visual privacy only — it does
        not change permissions or stored data. Shortcut: ⌘/Ctrl+Shift+S
      </p>
      <Button
        type="button"
        variant={enabled ? "default" : "outline"}
        disabled={pending}
        aria-pressed={enabled}
        className="gap-1.5"
        onClick={() => setEnabled(!enabled)}
      >
        {enabled ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {enabled ? "Disable Streamer Mode" : "Enable Streamer Mode"}
      </Button>
    </div>
  )
}
