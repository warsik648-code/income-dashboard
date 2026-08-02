import { z } from "zod"

import { optionalCurrencyFilterSchema } from "@/lib/validations/currency"

export const analyticsPresetSchema = z.enum([
  "today",
  "this_week",
  "this_month",
  "last_30_days",
  "this_year",
  "custom",
])

export const analyticsFiltersSchema = z
  .object({
    preset: analyticsPresetSchema.default("this_month"),
    from: z.string().trim().optional().or(z.literal("")),
    to: z.string().trim().optional().or(z.literal("")),
    accountId: z.string().trim().optional().or(z.literal("")),
    currency: optionalCurrencyFilterSchema,
    incomeCategoryId: z.string().trim().optional().or(z.literal("")),
    expenseCategoryId: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.preset !== "custom") return
    if (!data.from?.trim() || !data.to?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["from"],
        message: "Custom range requires both start and end dates",
      })
      return
    }
    const from = new Date(data.from)
    const to = new Date(data.to)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["from"],
        message: "Enter valid custom dates",
      })
      return
    }
    if (from.getTime() > to.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "End date must be on or after start date",
      })
    }
  })

export type AnalyticsPreset = z.infer<typeof analyticsPresetSchema>
export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>
