import { CreateAccountDialog } from "@/components/accounts/create-account-dialog"
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog"
import type {
  ExpenseAccountOption,
  ExpenseCategoryOption,
} from "@/components/expenses/expense-form-fields"
import { CreateIncomeDialog } from "@/components/income/create-income-dialog"
import type { IncomeAccountOption } from "@/components/income/income-form-fields"
import { CreateSubscriptionDialog } from "@/components/subscriptions/create-subscription-dialog"
import type {
  SubscriptionAccountOption,
  SubscriptionCategoryOption,
} from "@/components/subscriptions/subscription-form-fields"

export type DashboardAccountOption = ExpenseAccountOption &
  SubscriptionAccountOption &
  IncomeAccountOption

export function DashboardQuickActions({
  accounts,
  expenseCategories,
}: {
  accounts: DashboardAccountOption[]
  expenseCategories: Array<
    ExpenseCategoryOption & SubscriptionCategoryOption
  >
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CreateIncomeDialog accounts={accounts} />
      <CreateExpenseDialog
        accounts={accounts}
        categories={expenseCategories}
      />
      <CreateSubscriptionDialog
        accounts={accounts}
        categories={expenseCategories}
      />
      <CreateAccountDialog />
    </div>
  )
}
