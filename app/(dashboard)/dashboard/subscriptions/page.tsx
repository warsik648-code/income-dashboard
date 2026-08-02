import { redirect } from "next/navigation"

import { SubscriptionsView } from "@/components/subscriptions/subscriptions-view"
import { auth } from "@/auth"
import { listSelectableAccounts } from "@/lib/services/accounts"
import { ensureExpenseCategories } from "@/lib/services/categories"
import {
  listSubscriptions,
  summarizeSubscriptions,
} from "@/lib/services/subscriptions"
import { subscriptionFiltersSchema } from "@/lib/validations/subscriptions"

type SubscriptionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function serializeSubscription(
  item: Awaited<ReturnType<typeof listSubscriptions>>[number]
) {
  return {
    id: item.id,
    name: item.name,
    provider: item.provider,
    logoUrl: item.logoUrl,
    price: item.price.toString(),
    currency: item.currency,
    billingFrequency: item.billingFrequency,
    customIntervalDays: item.customIntervalDays,
    startDate: item.startDate.toISOString(),
    nextRenewalDate: item.nextRenewalDate.toISOString(),
    endDate: item.endDate?.toISOString() ?? null,
    accountId: item.accountId,
    categoryId: item.categoryId,
    paymentMethod: item.paymentMethod,
    status: item.status,
    autoRenew: item.autoRenew,
    notes: item.notes,
    deletedAt: item.deletedAt?.toISOString() ?? null,
    displayState: item.displayState,
    isDue: item.isDue,
    monthlyEquivalent: item.monthlyEquivalent,
    account: {
      id: item.account.id,
      name: item.account.name,
      currency: item.account.currency,
      cachedBalance: item.account.cachedBalance.toString(),
    },
    category: item.category,
  }
}

export default async function SubscriptionsPage({
  searchParams,
}: SubscriptionsPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const raw = await searchParams
  const flat: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(raw)) {
    flat[key] = Array.isArray(value) ? value[0] : value
  }

  const filters = subscriptionFiltersSchema.parse({
    status: flat.status || undefined,
    accountId: flat.accountId || undefined,
    currency: flat.currency || undefined,
    billingFrequency: flat.billingFrequency || undefined,
    deleted: flat.deleted === "1" ? "1" : undefined,
  })

  const [accounts, categories, entries] = await Promise.all([
    listSelectableAccounts(session.user.id),
    ensureExpenseCategories(session.user.id),
    listSubscriptions(session.user.id, filters),
  ])

  const summary = summarizeSubscriptions(
    filters.deleted === "1" ? [] : entries
  )

  return (
    <SubscriptionsView
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        cachedBalance: account.cachedBalance.toString(),
      }))}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
      entries={entries.map(serializeSubscription)}
      summary={{
        activeCount: summary.activeCount,
        dueCount: summary.dueCount,
        monthlyByCurrency: summary.monthlyByCurrency,
        upcoming: summary.upcoming.map((item) => ({
          id: item.id,
          name: item.name,
          nextRenewalDate: item.nextRenewalDate.toISOString(),
          price: item.price.toString(),
          currency: item.currency,
        })),
        due: summary.due.map((item) => ({
          id: item.id,
          name: item.name,
          nextRenewalDate: item.nextRenewalDate.toISOString(),
          price: item.price.toString(),
          currency: item.currency,
        })),
      }}
      filters={filters}
    />
  )
}
