/**
 * Domain services: create / update / soft-delete + AuditLog + balance recompute.
 * All financial writes must go through this layer inside a Prisma interactive transaction.
 */

export {
  cancelSubscription,
  confirmRenewalPayment,
  type ConfirmRenewalPaymentInput,
  type ConfirmRenewalPaymentResult,
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
