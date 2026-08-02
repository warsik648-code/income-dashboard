import { z } from "zod"

/** Positive decimal string without coercing through IEEE Number. */
export const positiveDecimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Amount must be a positive decimal")
  .refine((v) => !/^0+(\.0+)?$/.test(v), "Amount must be greater than zero")
