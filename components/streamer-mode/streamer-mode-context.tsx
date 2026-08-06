"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react"

import { setStreamerModeAction } from "@/app/(dashboard)/dashboard/streamer-mode/actions"
import {
  STREAMER_MODE_STORAGE_PREFIX,
  parseStreamerModeStored,
  serializeStreamerMode,
  streamerModeStorageKey,
} from "@/lib/streamer-mode/constants"
import { shouldApplyStreamerModeResult } from "@/lib/streamer-mode/request"

type StreamerModeContextValue = {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  toggle: () => void
  pending: boolean
  lastError: string | null
}

const StreamerModeContext = createContext<StreamerModeContextValue | null>(null)

function writeLocalFallback(userId: string, enabled: boolean) {
  try {
    localStorage.setItem(
      streamerModeStorageKey(userId),
      serializeStreamerMode(enabled)
    )
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
  // Initialize once from SSR/DB. Do not reset from props on every render —
  // that fought optimistic toggles and caused refresh loops after OFF.
  const [enabled, setEnabledState] = useState(() => initialEnabled === true)
  const [pending, startTransition] = useTransition()
  const [lastError, setLastError] = useState<string | null>(null)
  const [inflight, setInflight] = useState(0)

  const requestIdRef = useRef(0)
  const inflightRef = useRef(0)
  const enabledRef = useRef(initialEnabled === true)

  const persist = useCallback(
    (next: boolean, previous: boolean) => {
      const requestId = ++requestIdRef.current
      writeLocalFallback(userId, next)
      setLastError(null)
      inflightRef.current += 1
      setInflight(inflightRef.current)

      startTransition(() => {
        void setStreamerModeAction({ enabled: next, requestId })
          .then((result) => {
            if (
              !shouldApplyStreamerModeResult({
                responseRequestId: result.requestId,
                latestRequestId: requestIdRef.current,
              })
            ) {
              return
            }

            if (!result.ok) {
              setEnabledState((current) => {
                // Only roll back if UI still shows the failed target.
                if (current !== next) return current
                enabledRef.current = previous
                writeLocalFallback(userId, previous)
                return previous
              })
              setLastError(result.error)
              return
            }

            // Confirm server boolean (including false) without truthy checks.
            if (result.enabled === true || result.enabled === false) {
              enabledRef.current = result.enabled
              setEnabledState(result.enabled)
              writeLocalFallback(userId, result.enabled)
            }
          })
          .finally(() => {
            inflightRef.current = Math.max(0, inflightRef.current - 1)
            setInflight(inflightRef.current)
          })
      })
    },
    [userId]
  )

  const setEnabled = useCallback(
    (next: boolean) => {
      const normalized = next === true
      const previous = enabledRef.current === true
      if (normalized === previous) return
      enabledRef.current = normalized
      setEnabledState(normalized)
      persist(normalized, previous)
    },
    [persist]
  )

  const toggle = useCallback(() => {
    const previous = enabledRef.current === true
    const next = !previous
    enabledRef.current = next
    setEnabledState(next)
    persist(next, previous)
  }, [persist])

  // Cmd/Ctrl + Shift + S — ignore while typing in fields or while a write is in flight.
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
      if (inflightRef.current > 0) return
      toggle()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggle])

  // Align document attribute for portaled dialogs. Single source: React state.
  useEffect(() => {
    document.documentElement.dataset.streamerMode = enabled ? "on" : "off"
    return () => {
      delete document.documentElement.dataset.streamerMode
    }
  }, [enabled])

  // One-time localStorage sync: never let a stale "true" overwrite DB false.
  // SSR/DB is authoritative; rewrite storage to match the seed after mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(streamerModeStorageKey(userId))
      const stored = parseStreamerModeStored(raw)
      // If storage claimed ON but DB seed is OFF, keep DB (do not flip client on).
      void stored
      writeLocalFallback(userId, initialEnabled === true)
    } catch {
      // Ignore storage failures.
    }
  }, [userId, initialEnabled])

  const busy = pending || inflight > 0

  return (
    <StreamerModeContext.Provider
      value={{ enabled, setEnabled, toggle, pending: busy, lastError }}
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
      lastError: null,
    }
  )
}
