export function formatUsd(value: string | number) {
  const num = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(num)) return "—"
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatAmount(value: string, currency: string) {
  const num = Number(value)
  if (!Number.isFinite(num)) return `${value} ${currency}`
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 4,
  }).format(num)} ${currency}`
}

export function toChartNumber(value: string) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export const CHART_COLORS = {
  income: "var(--chart-1)",
  expense: "var(--chart-4)",
  net: "var(--chart-2)",
  accent: "var(--chart-3)",
  muted: "var(--chart-5)",
} as const

export const CATEGORY_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const
