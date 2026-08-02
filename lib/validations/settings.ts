import { z } from "zod"

import { SUPPORTED_CRYPTO, SUPPORTED_FIAT } from "@/lib/money/currency"

const currencyCodes = [...SUPPORTED_FIAT, ...SUPPORTED_CRYPTO] as [string, ...string[]]

export const DATE_FORMATS = [
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "DD MMM YYYY",
] as const

export const NUMBER_FORMATS = ["en-US", "en-GB", "de-DE", "fr-FR", "tr-TR"] as const

export const COMMON_TIMEZONES = [
  "UTC",
  "Europe/Istanbul",
  "Asia/Karachi",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Europe/Berlin",
  "Asia/Tokyo",
] as const

export const updatePreferencesSchema = z.object({
  preferredCurrency: z.enum(currencyCodes),
  timezone: z.string().trim().min(1).max(64),
  dateFormat: z.enum(DATE_FORMATS),
  numberFormat: z.enum(NUMBER_FORMATS),
  defaultIncomeAccountId: z.string().trim().optional().or(z.literal("")),
  defaultExpenseAccountId: z.string().trim().optional().or(z.literal("")),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: z
      .string()
      .min(12, "New password must be at least 12 characters")
      .max(128, "New password is too long"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      })
    }
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must be different from the current password",
      })
    }
  })

export const categoryKindSchema = z.enum(["INCOME", "EXPENSE"])

export const createCategorySchema = z.object({
  kind: categoryKindSchema,
  name: z.string().trim().min(1, "Name is required").max(80),
})

export const updateCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(80),
})

export const categoryIdSchema = z.object({
  id: z.string().min(1),
})

export const exportTransactionsSchema = z
  .object({
    from: z.string().min(1, "Start date is required"),
    to: z.string().min(1, "End date is required"),
  })
  .superRefine((data, ctx) => {
    const from = new Date(data.from)
    const to = new Date(data.to)
    if (Number.isNaN(from.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["from"],
        message: "Enter a valid start date",
      })
    }
    if (Number.isNaN(to.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "Enter a valid end date",
      })
    }
    if (
      !Number.isNaN(from.getTime()) &&
      !Number.isNaN(to.getTime()) &&
      from.getTime() > to.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "End date must be on or after start date",
      })
    }
  })

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type ExportTransactionsInput = z.infer<typeof exportTransactionsSchema>
