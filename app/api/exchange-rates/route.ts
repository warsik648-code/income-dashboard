import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { hasValidSessionUserId } from "@/lib/auth/session"
import {
  checkExchangeRateRefreshLimit,
  recordExchangeRateRefresh,
} from "@/lib/exchange-rates/rate-limit"
import {
  ExchangeRateProviderError,
  getExchangeRates,
} from "@/lib/exchange-rates/service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await auth()
  if (!hasValidSessionUserId(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session!.user!.id.trim()
  const url = new URL(request.url)
  const forceRefresh =
    url.searchParams.get("refresh") === "1" ||
    url.searchParams.get("refresh") === "true"

  if (forceRefresh) {
    const limit = checkExchangeRateRefreshLimit(userId)
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "Too many refresh requests. Try again shortly.",
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
          },
        }
      )
    }
    recordExchangeRateRefresh(userId)
  }

  try {
    const rates = await getExchangeRates({ forceRefresh })
    return NextResponse.json(rates)
  } catch (error) {
    const message =
      error instanceof ExchangeRateProviderError
        ? error.message
        : "Live exchange rates are unavailable"
    return NextResponse.json(
      {
        error: message,
        baseCurrency: "USD",
        rates: null,
        source: "ExchangeRate-API",
        isCached: false,
        isStale: false,
      },
      { status: 503 }
    )
  }
}
