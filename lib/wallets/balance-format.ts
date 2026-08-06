import { Prisma } from "@/generated/prisma/client"

/** Convert integer smallest-units string to a decimal asset amount. */
export function fromSmallestUnits(
  amount: string | number | bigint,
  decimals: number
): string {
  const raw =
    typeof amount === "bigint"
      ? amount.toString()
      : String(amount).trim().replace(/^-/, "")
  if (!/^\d+$/.test(raw)) {
    throw new Error("Invalid smallest-unit amount")
  }
  const decimal = new Prisma.Decimal(raw).div(new Prisma.Decimal(10).pow(decimals))
  return decimal.toFixed()
}

export function subtractBalances(live: string, recorded: string): string {
  return new Prisma.Decimal(live || "0")
    .minus(new Prisma.Decimal(recorded || "0"))
    .toFixed()
}
