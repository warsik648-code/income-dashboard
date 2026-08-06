import { z } from "zod"

import { isSafeHttpsLogoUrl } from "@/lib/subscriptions/logo-url"
import { isValidCalendarDate } from "@/lib/time"
import { optionalCurrencyFilterSchema } from "@/lib/validations/currency"
import { positiveDecimalString } from "@/lib/validations/decimal"

const billingFrequency = z.enum([
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "CUSTOM",
])

const status = z.enum(["ACTIVE", "PAUSED", "CANCELLED", "TRIAL", "EXPIRED"])

const paymentMethod = z.enum([
  "POS",
  "CASH",
  "BANK_TRANSFER",
  "CRYPTO_TRANSFER",
  "BINANCE",
  "TRUST",
  "OTHER",
  "",
])

const logoUrlSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) return true
    return isSafeHttpsLogoUrl(value)
  }, "Logo URL must use an allowed https image host")

const baseSubscriptionSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    provider: z.string().trim().min(1, "Provider is required").max(120),
    logoUrl: logoUrlSchema,
    price: positiveDecimalString,
    exchangeRate: z.string().trim().optional().or(z.literal("")),
    billingFrequency,
    customIntervalDays: z.string().trim().optional().or(z.literal("")),
    startDate: z.string().min(1, "Start date is required"),
    nextRenewalDate: z.string().min(1, "Next renewal date is required"),
    endDate: z.string().trim().optional().or(z.literal("")),
    accountId: z.string().min(1, "Payment account is required"),
    categoryId: z.string().trim().optional().or(z.literal("")),
    paymentMethod,
    status: status.default("ACTIVE"),
    autoRenew: z
      .union([z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
      .optional()
      .transform((v) => v === true || v === "true"),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.billingFrequency === "CUSTOM") {
      const days = Number(data.customIntervalDays)
      if (!Number.isInteger(days) || days <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["customIntervalDays"],
          message: "Custom interval days must be a positive whole number",
        })
      }
    }

    for (const key of ["startDate", "nextRenewalDate", "endDate"] as const) {
      const raw = data[key]
      if (!raw) continue
      if (!isValidCalendarDate(raw)) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Enter a valid date",
        })
      }
    }
  })

export const createSubscriptionSchema = baseSubscriptionSchema
export const updateSubscriptionSchema = baseSubscriptionSchema.safeExtend({
  id: z.string().min(1),
})

export const subscriptionIdSchema = z.object({
  id: z.string().min(1),
})

export const confirmPaidSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().optional().or(z.literal("")),
  exchangeRate: z.string().trim().optional().or(z.literal("")),
  exchangeRateSource: z
    .enum(["MANUAL", "USER_OVERRIDE", "PROVIDER", "FIXED_USD", ""])
    .optional(),
  allowOverdraft: z
    .union([z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  paymentDate: z.string().optional().or(z.literal("")),
})

export const subscriptionFiltersSchema = z.object({
  status: status.optional(),
  accountId: z.string().optional(),
  currency: optionalCurrencyFilterSchema,
  billingFrequency: billingFrequency.optional(),
  deleted: z.enum(["1"]).optional(),
})

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>
export type ConfirmPaidInput = z.infer<typeof confirmPaidSchema>
export type SubscriptionFilters = z.infer<typeof subscriptionFiltersSchema>
