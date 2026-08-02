import { redirect } from "next/navigation"

import { DebtsView } from "@/components/debts/debts-view"
import { auth } from "@/auth"
import { listSelectableAccounts } from "@/lib/services/accounts"
import { listDebts, summarizeDebts } from "@/lib/services/debts"
import { debtFiltersSchema } from "@/lib/validations/debts"

type DebtsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function serializeDebt(item: Awaited<ReturnType<typeof listDebts>>[number]) {
  return {
    id: item.id,
    personName: item.personName,
    direction: item.direction,
    originalAmount: item.originalAmount.toString(),
    remainingAmount: item.remainingAmount.toString(),
    paidAmount: item.paidAmount,
    currency: item.currency,
    exchangeRate: item.exchangeRate.toString(),
    baseAmountUsd: item.baseAmountUsd.toString(),
    dueDate: item.dueDate?.toISOString() ?? null,
    status: item.status,
    notes: item.notes,
    accountId: item.accountId,
    createdAt: item.createdAt.toISOString(),
    deletedAt: item.deletedAt?.toISOString() ?? null,
    account: item.account
      ? {
          id: item.account.id,
          name: item.account.name,
          currency: item.account.currency,
        }
      : null,
    payments: item.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount.toString(),
      currency: payment.currency,
      paymentDate: payment.paymentDate.toISOString(),
      notes: payment.notes,
      transactionId: payment.transactionId,
    })),
  }
}

export default async function DebtsPage({ searchParams }: DebtsPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const raw = await searchParams
  const flat: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(raw)) {
    flat[key] = Array.isArray(value) ? value[0] : value
  }

  const filters = debtFiltersSchema.parse({
    direction: flat.direction || undefined,
    status: flat.status || undefined,
    currency: flat.currency || undefined,
    deleted: flat.deleted === "1" ? "1" : undefined,
  })

  const [accounts, entries] = await Promise.all([
    listSelectableAccounts(session.user.id),
    listDebts(session.user.id, filters),
  ])

  const summary = summarizeDebts(filters.deleted === "1" ? [] : entries)
  const currencies = [
    ...new Set([
      ...accounts.map((a) => a.currency),
      ...entries.map((e) => e.currency),
    ]),
  ].sort()

  return (
    <DebtsView
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        cachedBalance: account.cachedBalance.toString(),
      }))}
      entries={entries.map(serializeDebt)}
      summary={summary}
      filters={filters}
      currencies={currencies}
    />
  )
}
