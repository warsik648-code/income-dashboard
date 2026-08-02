/**
 * Zod schemas for domain inputs.
 * Strip server-controlled fields (cachedBalance, deletedAt, passwordHash, userId from body).
 */

export { loginSchema, type LoginInput } from "./auth"
export {
  archiveAccountSchema,
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "./accounts"
