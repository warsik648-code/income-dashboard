import { z } from "zod"

const positiveDecimal = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Amount must be a positive decimal")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero")

const paymentMethod = z.enum([
  "POS",
  "CASH",
  "BANK_TRANSFER",
  "CRYPTO_TRANSFER",
  "BINANCE",
  "TRUST",
  "OTHER",
])

const baseExpenseSchema = z
  .object({
    accountId: z.string().min(1, "Account is required"),
    categoryId: z.string().min(1, "Category is required"),
    amount: positiveDecimal,
    exchangeRate: z.string().trim().optional().or(z.literal("")),
    transactionDate: z.string().min(1, "Date and time are required"),
    description: z.string().trim().min(1, "Description is required").max(200),
    counterparty: z
      .string()
      .trim()
      .min(1, "Merchant or recipient is required")
      .max(120),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    paymentMethod,
    allowOverdraft: z
      .union([z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
      .optional()
      .transform((v) => v === true || v === "true"),
  })
  .superRefine((data, ctx) => {
    const date = new Date(data.transactionDate)
    if (Number.isNaN(date.getTime())) {
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
  currency: z.string().trim().toUpperCase().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  deleted: z.enum(["1"]).optional(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>
