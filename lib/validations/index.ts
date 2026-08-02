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

export {
  createIncomeSchema,
  softDeleteIncomeSchema,
  updateIncomeSchema,
  type CreateIncomeInput,
  type UpdateIncomeInput,
} from "./income"

export {
  createExpenseSchema,
  expenseFiltersSchema,
  restoreExpenseSchema,
  softDeleteExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type ExpenseFilters,
  type UpdateExpenseInput,
} from "./expenses"

export {
  confirmPaidSchema,
  createSubscriptionSchema,
  subscriptionFiltersSchema,
  subscriptionIdSchema,
  updateSubscriptionSchema,
  type ConfirmPaidInput,
  type CreateSubscriptionInput,
  type SubscriptionFilters,
  type UpdateSubscriptionInput,
} from "./subscriptions"
