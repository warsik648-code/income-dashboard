import { z } from "zod"

const accountType = z.enum(["TRUST", "BINANCE", "BANK", "CASH", "OTHER"])
const assetClass = z.enum(["FIAT", "CRYPTO"])

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Currency or asset code is required")
  .max(16, "Currency or asset code is too long")
  .regex(/^[A-Z0-9]+$/, "Use letters/numbers only (e.g. USD, TRY, BTC)")

export const createAccountSchema = z
  .object({
    name: z.string().trim().min(1, "Account name is required").max(80),
    type: accountType,
    assetClass,
    currency: currencyCode,
    institution: z.string().trim().max(120).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    startingBalance: z.string().trim().optional().or(z.literal("")),
    exchangeRate: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const balance = data.startingBalance?.trim()
    if (!balance) return

    if (!/^\d+(\.\d+)?$/.test(balance) || /^0+(\.0+)?$/.test(balance)) {
      ctx.addIssue({
        code: "custom",
        path: ["startingBalance"],
        message: "Starting balance must be a positive amount",
      })
      return
    }

    if (data.currency !== "USD") {
      const rate = data.exchangeRate?.trim()
      if (!rate || !/^\d+(\.\d+)?$/.test(rate) || /^0+(\.0+)?$/.test(rate)) {
        ctx.addIssue({
          code: "custom",
          path: ["exchangeRate"],
          message: "Exchange rate (USD per 1 unit) is required for non-USD accounts",
        })
      }
    }
  })

export const updateAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Account name is required").max(80),
  institution: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
})

export const archiveAccountSchema = z.object({
  id: z.string().min(1),
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
