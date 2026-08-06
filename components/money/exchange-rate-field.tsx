"use client"

import { useEffect, useRef, useState } from "react"

import type { ExchangeRatesResult } from "@/lib/exchange-rates/types"
import { EXCHANGE_RATE_ATTRIBUTION } from "@/lib/exchange-rates/types"
import {
  formatRateLabel,
  previewBaseAmountUsd,
} from "@/lib/money/fx-preview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatAppDateTime } from "@/lib/time"

type RateMode = "fixed_usd" | "suggested" | "manual" | "saved"

type ExchangeRateFieldProps = {
  currency: string
  amount: string
  disabled?: boolean
  /** When editing an existing entry, pass the frozen saved rate. */
  savedExchangeRate?: string | null
  /** When true, start from saved rate and do not auto-load live rates. */
  editingExisting?: boolean
  idPrefix?: string
  /** Prefer inline validation over native browser required popups. */
  htmlRequired?: boolean
  /** Tighter layout for secondary / collapsible sections. */
  compact?: boolean
  /** Notify parent when rate readiness changes (for compact warnings). */
  onRateStateChange?: (state: {
    rate: string
    loading: boolean
    error: string | null
    isUsd: boolean
  }) => void
}

function statusLabel(mode: RateMode, isStale: boolean, unavailable: boolean) {
  if (mode === "fixed_usd") return "Fixed (USD = 1)"
  if (mode === "saved") return "Saved rate"
  if (mode === "manual") return "Manually entered"
  if (unavailable) return "Live rates unavailable"
  if (isStale) return "Cached (stale)"
  return "Live / cached suggestion"
}

function rateForCurrency(data: ExchangeRatesResult, currency: string) {
  if (currency === "PKR") return String(data.rates.PKR)
  if (currency === "TRY") return String(data.rates.TRY)
  return ""
}

function initialRate(
  currency: string,
  editingExisting: boolean,
  savedExchangeRate?: string | null
) {
  if (currency === "USD") return "1"
  if (editingExisting && savedExchangeRate) return savedExchangeRate
  return ""
}

function initialMode(
  currency: string,
  editingExisting: boolean,
  savedExchangeRate?: string | null
): RateMode {
  if (currency === "USD") return "fixed_usd"
  if (editingExisting && savedExchangeRate) return "saved"
  return "suggested"
}

export function ExchangeRateField({
  currency,
  amount,
  disabled,
  savedExchangeRate,
  editingExisting = false,
  idPrefix = "",
  htmlRequired = true,
  compact = false,
  onRateStateChange,
}: ExchangeRateFieldProps) {
  const rateInputId = `${idPrefix}exchangeRate`
  const isUsd = currency === "USD"

  const [rate, setRate] = useState(() =>
    initialRate(currency, editingExisting, savedExchangeRate)
  )
  const [mode, setMode] = useState<RateMode>(() =>
    initialMode(currency, editingExisting, savedExchangeRate)
  )
  const [payload, setPayload] = useState<ExchangeRatesResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [prevCurrency, setPrevCurrency] = useState(currency)
  const [prevEditing, setPrevEditing] = useState(editingExisting)
  const [prevSaved, setPrevSaved] = useState(savedExchangeRate)

  const onRateStateChangeRef = useRef(onRateStateChange)
  useEffect(() => {
    onRateStateChangeRef.current = onRateStateChange
  }, [onRateStateChange])
  useEffect(() => {
    onRateStateChangeRef.current?.({
      rate,
      loading,
      error: loadError,
      isUsd,
    })
  }, [rate, loading, loadError, isUsd])

  // Adjust local state when the selected currency / edit context changes.
  if (
    currency !== prevCurrency ||
    editingExisting !== prevEditing ||
    savedExchangeRate !== prevSaved
  ) {
    setPrevCurrency(currency)
    setPrevEditing(editingExisting)
    setPrevSaved(savedExchangeRate)
    setRate(initialRate(currency, editingExisting, savedExchangeRate))
    setMode(initialMode(currency, editingExisting, savedExchangeRate))
    setPayload(null)
    setLoadError(null)
  }

  async function fetchRates(opts: {
    forceRefresh: boolean
    applySuggestion: boolean
  }) {
    if (isUsd) return
    setLoading(true)
    setLoadError(null)
    try {
      const url = opts.forceRefresh
        ? "/api/exchange-rates?refresh=1"
        : "/api/exchange-rates"
      const response = await fetch(url, { credentials: "same-origin" })
      const data = (await response.json()) as
        | ExchangeRatesResult
        | { error?: string }

      if (!response.ok || !("rates" in data) || !data.rates) {
        setLoadError(
          "error" in data && data.error
            ? data.error
            : "Live exchange rates are unavailable"
        )
        return
      }

      setPayload(data)
      if (!opts.applySuggestion) return

      const next = rateForCurrency(data, currency)
      if (next) {
        setRate(next)
        setMode("suggested")
      }
    } catch {
      setLoadError("Live exchange rates are unavailable")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isUsd) return
    if (editingExisting && savedExchangeRate) return

    let cancelled = false
    // Defer so the effect only schedules an async fetch (no sync setState).
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return
        setLoading(true)
        setLoadError(null)
        try {
          const response = await fetch("/api/exchange-rates", {
            credentials: "same-origin",
          })
          const data = (await response.json()) as
            | ExchangeRatesResult
            | { error?: string }
          if (cancelled) return

          if (!response.ok || !("rates" in data) || !data.rates) {
            setLoadError(
              "error" in data && data.error
                ? data.error
                : "Live exchange rates are unavailable"
            )
            return
          }

          setPayload(data)
          const next = rateForCurrency(data, currency)
          if (next) {
            setRate(next)
            setMode("suggested")
          }
        } catch {
          if (!cancelled) {
            setLoadError("Live exchange rates are unavailable")
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [currency, editingExisting, savedExchangeRate, isUsd])

  const preview = previewBaseAmountUsd(amount, currency, isUsd ? "1" : rate)
  const sourceValue = isUsd
    ? "FIXED_USD"
    : mode === "manual" || mode === "saved"
      ? "USER_OVERRIDE"
      : "PROVIDER"

  const displaySuggested =
    payload && !isUsd ? rateForCurrency(payload, currency) : null

  return (
    <div
      className={
        compact
          ? "grid gap-2"
          : "grid gap-2 rounded-lg border border-border/70 bg-background/40 p-3"
      }
    >
      <input type="hidden" name="exchangeRateSource" value={sourceValue} />

      {isUsd ? (
        <>
          <input type="hidden" name="exchangeRate" value="1" />
          <p className="text-sm text-muted-foreground">
            Exchange rate fixed at{" "}
            <span className="font-medium text-foreground">1</span> (USD reporting
            base). Converted amount equals the entry amount.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="grid min-w-[12rem] flex-1 gap-1.5">
              <Label htmlFor={rateInputId}>
                Exchange rate (1 USD = X {currency})
              </Label>
              <Input
                id={rateInputId}
                name="exchangeRate"
                inputMode="decimal"
                required={htmlRequired}
                disabled={disabled || loading}
                value={rate}
                onChange={(e) => {
                  setRate(e.target.value)
                  setMode("manual")
                }}
                placeholder={
                  loading ? "Loading live rate…" : `${currency} per 1 USD`
                }
                className="h-11 text-base md:h-8 md:text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {editingExisting ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || loading}
                  onClick={() => {
                    void fetchRates({
                      forceRefresh: true,
                      applySuggestion: true,
                    })
                  }}
                >
                  Use today’s rate
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || loading}
                onClick={() => {
                  void fetchRates({
                    forceRefresh: true,
                    applySuggestion: mode !== "manual",
                  })
                }}
              >
                {loading ? "Refreshing…" : "Refresh live rate"}
              </Button>
            </div>
          </div>

          {displaySuggested && mode === "suggested" ? (
            <p className="text-sm text-muted-foreground">
              {formatRateLabel(currency, displaySuggested)}
            </p>
          ) : null}

          {mode === "saved" ? (
            <p className="text-xs text-muted-foreground">
              Showing the saved rate for this entry. It will not change unless you
              press “Use today’s rate” or edit the rate manually.
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Suggested using the latest available rate, not a historical rate.
          </p>

          <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline text-muted-foreground">Status: </dt>
              <dd className="inline text-foreground">
                {statusLabel(mode, Boolean(payload?.isStale), Boolean(loadError))}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Source: </dt>
              <dd className="inline text-foreground">
                {mode === "manual"
                  ? "Manual entry"
                  : mode === "saved"
                    ? "Saved on entry"
                    : (payload?.source ?? "—")}
              </dd>
            </div>
            {payload?.providerUpdatedAt ? (
              <div className="sm:col-span-2">
                <dt className="inline text-muted-foreground">Provider update: </dt>
                <dd className="inline text-foreground">
                  {formatAppDateTime(payload.providerUpdatedAt)}
                  {payload.isStale ? " (stale cache)" : ""}
                </dd>
              </div>
            ) : null}
          </dl>

          {loadError ? (
            <p className="text-xs text-destructive" role="alert">
              {loadError}. Enter a valid rate manually to continue.
            </p>
          ) : null}
        </>
      )}

      <p className="text-sm">
        <span className="text-muted-foreground">USD preview: </span>
        <span className="font-medium tabular-nums">{preview ?? "—"}</span>
      </p>

      <p className="text-[11px] text-muted-foreground">
        <a
          href={EXCHANGE_RATE_ATTRIBUTION.href}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {EXCHANGE_RATE_ATTRIBUTION.label}
        </a>
      </p>
    </div>
  )
}
