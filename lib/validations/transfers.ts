import { z } from "zod"

import { supportedCurrencySchema } from "@/lib/validations/currency"
import { positiveDecimalString } from "@/lib/validations/decimal"

const transferStatus = z.enum([
  "PENDING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REVERSED",
])

export const createTransferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Source account is required"),
    toAccountId: z.string().min(1, "Destination account is required"),
    sourceAmount: positiveDecimalString,
    destinationAmount: positiveDecimalString,
    suggestedExchangeRate: z.string().trim().optional().or(z.literal("")),
    effectiveExchangeRate: z.string().trim().optional().or(z.literal("")),
    suggestedDestinationAmount: z.string().trim().optional().or(z.literal("")),
    /** Units-per-USD rates used to freeze USD snapshots for non-USD legs */
    sourceUsdRate: z.string().trim().optional().or(z.literal("")),
    destinationUsdRate: z.string().trim().optional().or(z.literal("")),
    feeAmount: z.string().trim().optional().or(z.literal("")),
    feeCurrency: supportedCurrencySchema.optional().or(z.literal("")),
    feePaidSeparately: z
      .union([z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
      .optional()
      .transform((v) => v === true || v === "true"),
    feeUsdRate: z.string().trim().optional().or(z.literal("")),
    status: z.enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED"]).default("COMPLETED"),
    transferredAt: z.string().min(1, "Transfer date is required"),
    reference: z.string().trim().max(200).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    idempotencyKey: z.string().trim().max(80).optional().or(z.literal("")),
    allowOverdraft: z
      .union([z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
      .optional()
      .transform((v) => v === true || v === "true"),
  })
  .superRefine((data, ctx) => {
    if (data.fromAccountId === data.toAccountId) {
      ctx.addIssue({
        code: "custom",
        path: ["toAccountId"],
        message: "Source and destination accounts must be different",
      })
    }
    if (Number.isNaN(new Date(data.transferredAt).getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["transferredAt"],
        message: "Enter a valid transfer date and time",
      })
    }
    const fee = data.feeAmount?.trim()
    if (fee && (!/^\d+(\.\d+)?$/.test(fee) || Number(fee) < 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["feeAmount"],
        message: "Fee must be a non-negative amount",
      })
    }
    if (data.feePaidSeparately && (!fee || /^0+(\.0+)?$/.test(fee))) {
      ctx.addIssue({
        code: "custom",
        path: ["feeAmount"],
        message: "Enter a fee amount when charging a separate fee",
      })
    }
  })

export const updateTransferMetaSchema = z.object({
  id: z.string().min(1),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
})

export const updatePendingTransferSchema = createTransferSchema.safeExtend({
  id: z.string().min(1),
})

export const transferIdSchema = z.object({
  id: z.string().min(1),
})

export const transferFiltersSchema = z.object({
  status: transferStatus.optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  deleted: z.enum(["1"]).optional(),
})

export type CreateTransferInput = z.infer<typeof createTransferSchema>
export type UpdatePendingTransferInput = z.infer<typeof updatePendingTransferSchema>
export type UpdateTransferMetaInput = z.infer<typeof updateTransferMetaSchema>
export type TransferFilters = z.infer<typeof transferFiltersSchema>
