import { z } from "zod"

import { isValidDateTimeLocal } from "@/lib/time"
import { optionalCurrencyFilterSchema } from "@/lib/validations/currency"
import { positiveDecimalString } from "@/lib/validations/decimal"

const paymentMethod = z
  .enum([
    "POS",
    "CASH",
    "BANK_TRANSFER",
    "CRYPTO_TRANSFER",
    "BINANCE",
    "TRUST",
    "OTHER",
    "",
  ])
  .optional()

const exchangeRateSource = z
  .enum(["MANUAL", "USER_OVERRIDE", "PROVIDER", "FIXED_USD", ""])
  .optional()

const baseExpenseSchema = z
  .object({
    accountId: z.string().min(1, "Account is required"),
    categoryId: z.string().min(1, "Category is required"),
    amount: positiveDecimalString,
    exchangeRate: z.string().trim().optional().or(z.literal("")),
    exchangeRateSource,
    transactionDate: z.string().min(1, "Date and time are required"),
    description: z
      .string()
      .trim()
      .max(200)
      .optional()
      .or(z.literal("")),
    counterparty: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    paymentMethod,
    allowOverdraft: z
      .union([z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
      .optional()
      .transform((v) => v === true || v === "true"),
  })
  .superRefine((data, ctx) => {
    if (!isValidDateTimeLocal(data.transactionDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["transactionDate"],
        message: "Enter a valid date and time",
      })
    }
  })

export const createExpenseSchema = baseExpenseSchema
export const updateExpenseSchema = baseExpenseSchema.safeExtend({
  id: z.string().min(1),
})

export const softDeleteExpenseSchema = z.object({
  id: z.string().min(1),
})

export const restoreExpenseSchema = z.object({
  id: z.string().min(1),
})

export const expenseFiltersSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMethod: z
    .enum([
      "POS",
      "CASH",
      "BANK_TRANSFER",
      "CRYPTO_TRANSFER",
      "BINANCE",
      "TRUST",
      "OTHER",
    ])
    .optional(),
  currency: optionalCurrencyFilterSchema,
  from: z.string().optional(),
  to: z.string().optional(),
  deleted: z.enum(["1"]).optional(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>
