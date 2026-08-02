import { z } from "zod"

import { positiveDecimalString } from "@/lib/validations/decimal"

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Currency is required")
  .max(16)
  .regex(/^[A-Z0-9]+$/, "Use letters/numbers only (e.g. USD, TRY, PKR)")

const direction = z.enum(["LENT_OUT", "OWED_BY_ME"])
const status = z.enum(["OPEN", "PARTIALLY_PAID", "PAID", "WRITTEN_OFF"])

const baseDebtSchema = z
  .object({
    personName: z.string().trim().min(1, "Person name is required").max(120),
    direction,
    originalAmount: positiveDecimalString,
    currency: currencyCode,
    exchangeRate: z.string().trim().optional().or(z.literal("")),
    dueDate: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    status: status.optional(),
    accountId: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate) {
      if (Number.isNaN(new Date(data.dueDate).getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["dueDate"],
          message: "Enter a valid due date",
        })
      }
    }
    if (data.currency !== "USD" && !data.exchangeRate?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["exchangeRate"],
        message: "Exchange rate (USD per 1 unit) is required for non-USD debts",
      })
    }
  })

export const createDebtSchema = baseDebtSchema
export const updateDebtSchema = baseDebtSchema.safeExtend({
  id: z.string().min(1),
  status: status,
})

export const debtIdSchema = z.object({
  id: z.string().min(1),
})

export const recordDebtPaymentSchema = z
  .object({
    debtId: z.string().min(1),
    amount: z.string().trim().optional().or(z.literal("")),
    exchangeRate: z.string().trim().optional().or(z.literal("")),
    paymentDate: z.string().min(1, "Payment date is required"),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    /** When set, also create INCOME/EXPENSE on this account. */
    accountId: z.string().trim().optional().or(z.literal("")),
    allowOverdraft: z
      .union([z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
      .optional()
      .transform((v) => v === true || v === "true"),
    /** Convenience: pay the full remaining balance. */
    markFullyPaid: z
      .union([z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
      .optional()
      .transform((v) => v === true || v === "true"),
  })
  .superRefine((data, ctx) => {
    if (Number.isNaN(new Date(data.paymentDate).getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentDate"],
        message: "Enter a valid payment date",
      })
    }
    if (!data.markFullyPaid) {
      const amount = data.amount?.trim() ?? ""
      if (!/^\d+(\.\d+)?$/.test(amount) || /^0+(\.0+)?$/.test(amount)) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Amount must be a positive decimal",
        })
      }
    }
  })

export const debtFiltersSchema = z.object({
  direction: direction.optional(),
  status: status.optional(),
  currency: currencyCode.optional(),
  deleted: z.enum(["1"]).optional(),
})

export type CreateDebtInput = z.infer<typeof createDebtSchema>
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>
export type RecordDebtPaymentInput = z.infer<typeof recordDebtPaymentSchema>
export type DebtFilters = z.infer<typeof debtFiltersSchema>
