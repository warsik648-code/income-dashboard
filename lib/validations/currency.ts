import { z } from "zod"

import { SUPPORTED_CURRENCIES } from "@/lib/money/currency"

export const supportedCurrencySchema = z.enum(SUPPORTED_CURRENCIES)

/** Optional filter value: empty string means “all”. */
export const optionalCurrencyFilterSchema = z
  .union([z.literal(""), supportedCurrencySchema])
  .optional()
