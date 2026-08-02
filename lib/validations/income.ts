import { z } from "zod"

const positiveDecimal = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Amount must be a positive decimal")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero")

export const createIncomeSchema = z
  .object({
    accountId: z.string().min(1, "Account is required"),
    amount: positiveDecimal,
    exchangeRate: z.string().trim().optional().or(z.literal("")),
    transactionDate: z.string().min(1, "Date and time are required"),
    description: z.string().trim().min(1, "Source or description is required").max(200),
    counterparty: z.string().trim().max(120).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    paymentMethod: z
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
      .optional(),
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

export const updateIncomeSchema = createIncomeSchema.safeExtend({
  id: z.string().min(1),
})

export const softDeleteIncomeSchema = z.object({
  id: z.string().min(1),
})

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>
