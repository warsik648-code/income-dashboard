"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useActionState } from "react"
import Decimal from "decimal.js"
import { SensitiveValue, useStreamerModeOptional, maskSensitivePlain } from "@/components/streamer-mode"

import {
  createTransferAction,
  type TransferActionState,
} from "@/app/(dashboard)/dashboard/transfers/actions"
import type { ExchangeRatesResult } from "@/lib/exchange-rates/types"
import { EXCHANGE_RATE_ATTRIBUTION } from "@/lib/exchange-rates/types"
import {
  computeEffectiveExchangeRate,
  hasValidTransferRates,
  suggestDestinationAmount,
} from "@/lib/money/transfer-fx"
import { previewBaseAmountUsd } from "@/lib/money/fx-preview"
import { nextTransferIdempotencyKey } from "@/lib/transfers/idempotency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type TransferAccountOption = {
  id: string
  name: string
  currency: string
  cachedBalance: string
}

const initialState: TransferActionState = {}

function toDateTimeLocalValue(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function rateFor(currency: string, payload: ExchangeRatesResult | null) {
  if (!payload) return ""
  if (currency === "USD") return "1"
  if (currency === "PKR") return String(payload.rates.PKR)
  if (currency === "TRY") return String(payload.rates.TRY)
  return ""
}

function sameCurrencySuggested(
  sourceAmount: string,
  feeAmount: string,
  feePaidSeparately: boolean
): string | null {
  try {
    const src = new Decimal(sourceAmount.trim())
    if (!src.isFinite() || src.lte(0)) return null
    const fee = feePaidSeparately
      ? new Decimal(0)
      : new Decimal(feeAmount.trim() || "0")
    const value = src.minus(fee.gt(0) ? fee : 0)
    if (value.lte(0)) return null
    return value.toDecimalPlaces(2).toFixed(2)
  } catch {
    return null
  }
}

export function TransferForm({
  accounts,
}: {
  accounts: TransferAccountOption[]
}) {
  const { enabled: streamerMode } = useStreamerModeOptional()
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "")
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "")
  const [sourceAmount, setSourceAmount] = useState("")
  const [destinationAmount, setDestinationAmount] = useState("")
  const [destManual, setDestManual] = useState(false)
  const [feeAmount, setFeeAmount] = useState("")
  const [feePaidSeparately, setFeePaidSeparately] = useState(false)
  const [status, setStatus] = useState<"COMPLETED" | "PENDING">("COMPLETED")
  const [payload, setPayload] = useState<ExchangeRatesResult | null>(null)
  const [rateError, setRateError] = useState<string | null>(null)
  const [loadingRates, setLoadingRates] = useState(false)
  const [destError, setDestError] = useState<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID()
  )
  const wasPending = useRef(false)

  const [state, formAction, pending] = useActionState(
    createTransferAction,
    initialState
  )

  // Rotate the idempotency key only after a confirmed success so retries keep
  // the same key, while the next legitimate transfer gets a fresh one.
  useEffect(() => {
    if (!(wasPending.current && !pending)) {
      wasPending.current = pending
      return
    }
    wasPending.current = pending
    if (!state.ok) return
    const timer = window.setTimeout(() => {
      setIdempotencyKey((current) =>
        nextTransferIdempotencyKey({
          outcome: "success",
          currentKey: current,
          generate: () => crypto.randomUUID(),
        })
      )
    }, 0)
    return () => window.clearTimeout(timer)
  }, [pending, state.ok])

  const from = useMemo(
    () => accounts.find((a) => a.id === fromAccountId),
    [accounts, fromAccountId]
  )
  const to = useMemo(
    () => accounts.find((a) => a.id === toAccountId),
    [accounts, toAccountId]
  )

  const sameCurrency = Boolean(from && to && from.currency === to.currency)
  const crossCurrency = Boolean(from && to && from.currency !== to.currency)

  const ratePair = useMemo(() => {
    if (!payload) return null
    return {
      PKR: String(payload.rates.PKR),
      TRY: String(payload.rates.TRY),
    }
  }, [payload])

  const ratesReady = hasValidTransferRates(ratePair)

  const suggestedDest = useMemo(() => {
    if (!from || !to || !sourceAmount.trim()) return null
    if (sameCurrency) {
      return sameCurrencySuggested(sourceAmount, feeAmount, feePaidSeparately)
    }
    if (!ratePair || !ratesReady) return null
    return suggestDestinationAmount({
      sourceAmount,
      sourceCurrency: from.currency,
      destinationCurrency: to.currency,
      rates: ratePair,
      displayDecimals: 2,
    })
  }, [
    from,
    to,
    sourceAmount,
    sameCurrency,
    feePaidSeparately,
    feeAmount,
    ratePair,
    ratesReady,
  ])

  function applySuggestion(next: string | null) {
    if (!next) return
    setDestinationAmount(next)
    setDestManual(false)
    setDestError(null)
  }

  async function loadRates(opts: {
    forceRefresh: boolean
    applySuggestion: boolean
  }) {
    if (!crossCurrency) return
    setLoadingRates(true)
    setRateError(null)
    try {
      const url = opts.forceRefresh
        ? "/api/exchange-rates?refresh=1"
        : "/api/exchange-rates"
      const response = await fetch(url, { credentials: "same-origin" })
      const data = (await response.json()) as
        | ExchangeRatesResult
        | { error?: string }
      if (!response.ok || !("rates" in data) || !data.rates) {
        setRateError(
          "error" in data && data.error
            ? data.error
            : "Live rates unavailable"
        )
        return
      }
      setPayload(data)
      if (opts.applySuggestion && from && to && sourceAmount.trim()) {
        const next = suggestDestinationAmount({
          sourceAmount,
          sourceCurrency: from.currency,
          destinationCurrency: to.currency,
          rates: {
            PKR: String(data.rates.PKR),
            TRY: String(data.rates.TRY),
          },
          displayDecimals: 2,
        })
        applySuggestion(next)
      }
    } catch {
      setRateError("Live rates unavailable")
    } finally {
      setLoadingRates(false)
    }
  }

  const [pairKey, setPairKey] = useState(`${fromAccountId}|${toAccountId}`)
  const nextPairKey = `${fromAccountId}|${toAccountId}`
  if (nextPairKey !== pairKey) {
    setPairKey(nextPairKey)
    setPayload(null)
    setRateError(null)
    setLoadingRates(false)
  }

  // Load live rates when cross-currency pair is selected.
  useEffect(() => {
    if (!crossCurrency) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return
        setLoadingRates(true)
        setRateError(null)
        try {
          const response = await fetch("/api/exchange-rates", {
            credentials: "same-origin",
          })
          const data = (await response.json()) as
            | ExchangeRatesResult
            | { error?: string }
          if (cancelled) return
          if (!response.ok || !("rates" in data) || !data.rates) {
            setRateError(
              "error" in data && data.error
                ? data.error
                : "Live rates unavailable"
            )
            return
          }
          setPayload(data)
        } catch {
          if (!cancelled) setRateError("Live rates unavailable")
        } finally {
          if (!cancelled) setLoadingRates(false)
        }
      })()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [fromAccountId, toAccountId, crossCurrency])

  // Auto-fill destination when suggestion is available and user has not overridden.
  useEffect(() => {
    if (destManual || !suggestedDest) return
    const timer = window.setTimeout(() => {
      setDestinationAmount(suggestedDest)
      setDestError(null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [suggestedDest, destManual])

  const effectiveRate =
    from && to && sourceAmount.trim() && destinationAmount.trim()
      ? computeEffectiveExchangeRate({
          sourceAmount,
          sourceCurrency: from.currency,
          destinationAmount,
          destinationCurrency: to.currency,
        })
      : null

  const sourceUsdPreview = from
    ? previewBaseAmountUsd(
        sourceAmount,
        from.currency,
        rateFor(from.currency, payload) || (from.currency === "USD" ? "1" : "")
      )
    : null
  const destUsdPreview = to
    ? previewBaseAmountUsd(
        destinationAmount,
        to.currency,
        rateFor(to.currency, payload) || (to.currency === "USD" ? "1" : "")
      )
    : null

  const liveRateLabel = (() => {
    if (!from || !to || !payload) return null
    if (from.currency === "USD") {
      return `1 USD = ${rateFor(to.currency, payload)} ${to.currency}`
    }
    if (to.currency === "USD") {
      return `1 USD = ${rateFor(from.currency, payload)} ${from.currency}`
    }
    return `Via USD · 1 USD = ${ratePair?.PKR} PKR · 1 USD = ${ratePair?.TRY} TRY`
  })()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setDestError(null)
    if (from?.id === to?.id) {
      event.preventDefault()
      return
    }
    const dest = destinationAmount.trim()
    if (!dest || !/^\d+(\.\d+)?$/.test(dest) || /^0+(\.0+)?$/.test(dest)) {
      event.preventDefault()
      setDestError("Enter the destination amount actually received.")
    }
  }

  if (accounts.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Create at least two active accounts before transferring funds.
      </p>
    )
  }

  const destinationPlaceholder = (() => {
    if (crossCurrency && loadingRates) return "Loading live rate…"
    if (crossCurrency && rateError && !destinationAmount) {
      return "Enter amount received"
    }
    if (suggestedDest) return suggestedDest
    return "0.00"
  })()

  return (
    <form
      action={formAction}
      className="grid gap-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input
        type="hidden"
        name="suggestedDestinationAmount"
        value={suggestedDest ?? ""}
      />
      <input
        type="hidden"
        name="effectiveExchangeRate"
        value={effectiveRate ?? ""}
      />
      <input
        type="hidden"
        name="suggestedExchangeRate"
        value={
          sameCurrency
            ? "1"
            : from?.currency === "USD" && to
              ? rateFor(to.currency, payload)
              : to?.currency === "USD" && from
                ? rateFor(from.currency, payload)
                : rateFor(to?.currency ?? "USD", payload)
        }
      />
      <input
        type="hidden"
        name="sourceUsdRate"
        value={rateFor(from?.currency ?? "USD", payload)}
      />
      <input
        type="hidden"
        name="destinationUsdRate"
        value={rateFor(to?.currency ?? "USD", payload)}
      />
      <input
        type="hidden"
        name="feeUsdRate"
        value={rateFor(from?.currency ?? "USD", payload)}
      />
      {/* Fee currency is derived server-side from the source account. */}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="fromAccountId">From account</Label>
          <select
            id="fromAccountId"
            name="fromAccountId"
            required
            disabled={pending}
            value={fromAccountId}
            onChange={(e) => {
              setFromAccountId(e.target.value)
              setDestManual(false)
              setDestinationAmount("")
              setDestError(null)
            }}
            className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency}) · {maskSensitivePlain(streamerMode, account.cachedBalance)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="toAccountId">To account</Label>
          <select
            id="toAccountId"
            name="toAccountId"
            required
            disabled={pending}
            value={toAccountId}
            onChange={(e) => {
              setToAccountId(e.target.value)
              setDestManual(false)
              setDestinationAmount("")
              setDestError(null)
            }}
            className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency}) · {maskSensitivePlain(streamerMode, account.cachedBalance)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {from && to && from.id === to.id ? (
        <p className="text-sm text-destructive" role="alert">
          Source and destination must be different accounts.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="sourceAmount">
            Source amount {from ? `(${from.currency})` : ""}
          </Label>
          <Input
            id="sourceAmount"
            name="sourceAmount"
            inputMode="decimal"
            required
            disabled={pending}
            value={sourceAmount}
            onChange={(e) => {
              setSourceAmount(e.target.value)
              setDestManual(false)
              setDestError(null)
            }}
          />
          <p className="text-xs text-muted-foreground">
            Currency locked to account: {from?.currency}
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="destinationAmount">
            Destination amount {to ? `(${to.currency})` : ""}
          </Label>
          <Input
            id="destinationAmount"
            name="destinationAmount"
            inputMode="decimal"
            disabled={pending || (crossCurrency && loadingRates && !destinationAmount)}
            value={destinationAmount}
            placeholder={destinationPlaceholder}
            aria-invalid={Boolean(destError)}
            onChange={(e) => {
              setDestinationAmount(e.target.value)
              setDestManual(true)
              setDestError(null)
            }}
          />
          {destError ? (
            <p className="text-xs text-destructive" role="alert">
              {destError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {crossCurrency && loadingRates && !destinationAmount
                ? "Waiting for live rate…"
                : destManual
                  ? "Manual amount — won’t be overwritten until you refresh or use suggested."
                  : `Currency locked to account: ${to?.currency}`}
            </p>
          )}
        </div>
      </div>

      {crossCurrency ? (
        <div className="grid gap-2 rounded-lg border border-border/70 bg-background/40 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Live rate suggestion</p>
            <div className="flex flex-wrap gap-2">
              {suggestedDest ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || loadingRates}
                  onClick={() => applySuggestion(suggestedDest)}
                >
                  Use suggested amount
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || loadingRates}
                onClick={() =>
                  void loadRates({ forceRefresh: true, applySuggestion: true })
                }
              >
                {loadingRates ? "Refreshing…" : "Refresh live rate"}
              </Button>
            </div>
          </div>

          {loadingRates && !payload ? (
            <p className="text-muted-foreground">Loading live rate…</p>
          ) : null}

          {liveRateLabel ? (
            <p className="text-muted-foreground">
              {liveRateLabel}
              {payload?.isStale ? " (stale cache)" : ""}
            </p>
          ) : null}

          {suggestedDest ? (
            <p>
              Suggested received:{" "}
              <span className="font-medium">
                {suggestedDest} {to?.currency}
              </span>
            </p>
          ) : sourceAmount.trim() && !loadingRates && !rateError ? (
            <p className="text-muted-foreground">
              Enter a source amount to see the suggested destination.
            </p>
          ) : null}

          {effectiveRate && from && to && destinationAmount.trim() ? (
            <p>
              Effective rate:{" "}
              <span className="font-medium">
                {from.currency === "USD"
                  ? `1 USD = ${effectiveRate} ${to.currency}`
                  : to.currency === "USD"
                    ? `1 USD = ${effectiveRate} ${from.currency}`
                    : `1 ${from.currency} = ${effectiveRate} ${to.currency}`}
              </span>
              {destManual ? " (from your entered amount)" : ""}
            </p>
          ) : null}

          {rateError ? (
            <p className="text-xs text-destructive" role="alert">
              {rateError}. Enter the actual amount received manually to continue.
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Suggested using the latest available rate, not a historical rate.
          </p>
          <a
            href={EXCHANGE_RATE_ATTRIBUTION.href}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
          >
            {EXCHANGE_RATE_ATTRIBUTION.label}
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Same-currency transfer · exchange rate fixed at 1.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="feeAmount">
            Transfer fee {from ? `(${from.currency})` : ""}
          </Label>
          <Input
            id="feeAmount"
            name="feeAmount"
            inputMode="decimal"
            disabled={pending}
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            disabled={pending}
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "COMPLETED" | "PENDING")
            }
            className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
          >
            <option value="COMPLETED">COMPLETED — update balances</option>
            <option value="PENDING">PENDING — track only</option>
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/40 p-3 text-sm">
        <input
          type="checkbox"
          name="feePaidSeparately"
          value="true"
          checked={feePaidSeparately}
          disabled={pending}
          onChange={(e) => setFeePaidSeparately(e.target.checked)}
          className="mt-1"
        />
        <span>
          Fee paid separately from the source account
          <span className="mt-1 block text-xs text-muted-foreground">
            Creates a Transfer Fees expense. Leave unchecked if the fee is
            already reflected in a lower destination amount.
          </span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="transferredAt">Transfer date & time</Label>
          <Input
            id="transferredAt"
            name="transferredAt"
            type="datetime-local"
            required
            disabled={pending}
            defaultValue={toDateTimeLocalValue()}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reference">Reference / transaction ID</Label>
          <Input
            id="reference"
            name="reference"
            disabled={pending}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          disabled={pending}
          placeholder="Optional"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="allowOverdraft"
          value="true"
          disabled={pending}
          className="mt-1"
        />
        Allow overdraft if source balance is insufficient
      </label>

      {from && to && sourceAmount.trim() && destinationAmount.trim() ? (
        <div className="rounded-lg border border-border/70 bg-card/50 p-4 text-sm leading-relaxed">
          <p className="font-medium">Review</p>
          <p className="mt-2 text-muted-foreground">
            You are transferring{" "}
            <SensitiveValue>
              {sourceAmount} {from.currency}
            </SensitiveValue>{" "}
            from{" "}
            <span className="text-foreground">{from.name}</span> to{" "}
            <span className="text-foreground">{to.name}</span>.
          </p>
          {suggestedDest ? (
            <p className="text-muted-foreground">
              Suggested received: {suggestedDest} {to.currency}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Actual received:{" "}
            <SensitiveValue>
              {destinationAmount} {to.currency}
            </SensitiveValue>
          </p>
          {effectiveRate ? (
            <p className="text-muted-foreground">
              Effective rate: {effectiveRate}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Fee:{" "}
            <SensitiveValue>
              {feeAmount || "0"} {from.currency}
            </SensitiveValue>
            {feePaidSeparately ? " (separate expense)" : ""}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            USD preview · sent ≈ {sourceUsdPreview ?? "—"} · received ≈{" "}
            {destUsdPreview ?? "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This movement is not income or expense
            {feePaidSeparately ? " (except the separate fee)" : ""}.
          </p>
        </div>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p
          className="text-sm text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          {state.reused
            ? "Already saved — this submission matched a previous request (no duplicate transfer created)."
            : "Transfer saved."}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || from?.id === to?.id}>
        {pending
          ? "Saving…"
          : status === "PENDING"
            ? "Save pending transfer"
            : "Complete transfer"}
      </Button>
    </form>
  )
}
