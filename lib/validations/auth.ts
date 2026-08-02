import { z } from "zod"

const invalid = "Invalid email or password"

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, invalid)
    .max(254, invalid)
    .email({ error: invalid }),
  password: z.string().min(1, invalid).max(128, invalid),
})

export type LoginInput = z.infer<typeof loginSchema>
