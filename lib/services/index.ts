/**
 * Domain services: create / update / soft-delete + AuditLog + balance recompute.
 * All financial writes must go through this layer inside a Prisma interactive transaction.
 */

export {
  SubscriptionServiceError,
  cancelSubscription,
  confirmPaid,
  confirmRenewalPayment,
  createSubscription,
  listSubscriptions,
  pauseSubscription,
  restoreSubscription,
  resumeSubscription,
  softDeleteSubscription,
  summarizeSubscriptions,
  updateSubscription,
  type ConfirmRenewalPaymentInput,
  type ConfirmRenewalPaymentResult,
  type SubscriptionListItem,
} from "./subscriptions"

export {
  AccountServiceError,
  archiveAccount,
  createAccount,
  listAccounts,
  listSelectableAccounts,
  unarchiveAccount,
  updateAccount,
  type AccountListItem,
} from "./accounts"

export { toAuditJson, writeAuditLog } from "./audit"

export { recomputeCachedBalance } from "./balances"

export {
  IncomeServiceError,
  createIncome,
  listIncome,
  softDeleteIncome,
  updateIncome,
  type IncomeListItem,
} from "./income"

export {
  EXPENSE_CATEGORY_NAMES,
  ensureExpenseCategories,
} from "./categories"

export {
  ExpenseServiceError,
  createExpense,
  listExpenses,
  restoreExpense,
  softDeleteExpense,
  updateExpense,
  type ExpenseListItem,
} from "./expenses"

export {
  DebtServiceError,
  createDebt,
  listDebts,
  markDebtFullyPaid,
  recordDebtPayment,
  restoreDebt,
  softDeleteDebt,
  summarizeDebts,
  updateDebt,
  type DebtListItem,
} from "./debts"

export {
  getAnalytics,
  listAnalyticsCategories,
  type AnalyticsResult,
} from "./analytics"

export { getDashboard, type DashboardResult } from "./dashboard"

export {
  AttachmentServiceError,
  createSignedPreviewUrl,
  listAttachments,
  softDeleteAttachment,
  uploadAttachment,
  type AttachmentListItem,
} from "./attachments"
