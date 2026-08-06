"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react"

import { setStreamerModeAction } from "@/app/(dashboard)/dashboard/streamer-mode/actions"
import {
  STREAMER_MODE_STORAGE_PREFIX,
  streamerModeStorageKey,
} from "@/lib/streamer-mode/constants"

type StreamerModeContextValue = {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  toggle: () => void
  pending: boolean
}

const StreamerModeContext = createContext<StreamerModeContextValue | null>(null)

function writeLocalFallback(userId: string, enabled: boolean) {
  try {
    localStorage.setItem(streamerModeStorageKey(userId), enabled ? "1" : "0")
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function StreamerModeProvider({
  userId,
  initialEnabled,
  children,
}: {
  userId: string
  /** Persisted DB preference — drives first paint (no flash). */
  initialEnabled: boolean
  children: ReactNode
}) {
  // Seed from SSR/DB so the first paint already has data-streamer-mode set.
  const [enabled, setEnabledState] = useState(initialEnabled)
  const [pending, startTransition] = useTransition()

  const persist = useCallback(
    (next: boolean) => {
      writeLocalFallback(userId, next)
      startTransition(() => {
        void setStreamerModeAction(next)
      })
    },
    [userId]
  )

  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next)
      persist(next)
    },
    [persist]
  )

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev
      persist(next)
      return next
    })
  }, [persist])

  // Cmd/Ctrl + Shift + S — ignore while typing in fields.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey
      if (!meta || !event.shiftKey) return
      if (event.key.toLowerCase() !== "s") return

      const target = event.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      ) {
        return
      }

      event.preventDefault()
      toggle()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggle])

  // Keep document attribute in sync for portaled dialogs / charts.
  useEffect(() => {
    document.documentElement.dataset.streamerMode = enabled ? "on" : "off"
    return () => {
      delete document.documentElement.dataset.streamerMode
    }
  }, [enabled])

  return (
    <StreamerModeContext.Provider
      value={{ enabled, setEnabled, toggle, pending }}
    >
      <div
        data-streamer-mode={enabled ? "on" : "off"}
        data-streamer-storage={STREAMER_MODE_STORAGE_PREFIX}
        className="contents"
      >
        {children}
      </div>
    </StreamerModeContext.Provider>
  )
}

export function useStreamerMode(): StreamerModeContextValue {
  const ctx = useContext(StreamerModeContext)
  if (!ctx) {
    throw new Error("useStreamerMode must be used within StreamerModeProvider")
  }
  return ctx
}

/** Safe for optional use outside the provider (defaults to off). */
export function useStreamerModeOptional(): StreamerModeContextValue {
  const ctx = useContext(StreamerModeContext)
  return (
    ctx ?? {
      enabled: false,
      setEnabled: () => {},
      toggle: () => {},
      pending: false,
    }
  )
}
