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

export {
  createDebtSchema,
  debtFiltersSchema,
  debtIdSchema,
  recordDebtPaymentSchema,
  updateDebtSchema,
  type CreateDebtInput,
  type DebtFilters,
  type RecordDebtPaymentInput,
  type UpdateDebtInput,
} from "./debts"

export {
  analyticsFiltersSchema,
  analyticsPresetSchema,
  type AnalyticsFilters,
  type AnalyticsPreset,
} from "./analytics"

export {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ENTITY,
  assertSafeAttachmentFile,
  attachmentIdSchema,
  attachmentParentSchema,
  sanitizeFileName,
  type AttachmentParentInput,
} from "./attachments"
