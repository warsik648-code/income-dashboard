import { redirect } from "next/navigation"

import { SettingsView } from "@/components/settings/settings-view"
import { auth } from "@/auth"
import { listSelectableAccounts } from "@/lib/services/accounts"
import { ensureExpenseCategories } from "@/lib/services/categories"
import {
  getAttachmentUsageSummary,
  getSettingsProfile,
  listManagedCategories,
} from "@/lib/services/settings"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  await ensureExpenseCategories(userId)

  const [profile, accounts, categories, attachmentUsage] = await Promise.all([
    getSettingsProfile(userId),
    listSelectableAccounts(userId),
    listManagedCategories(userId, { includeArchived: true }),
    getAttachmentUsageSummary(userId),
  ])

  return (
    <SettingsView
      profile={profile}
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
      }))}
      categories={categories}
      attachmentUsage={attachmentUsage}
      sessionInfo={{
        registrationDisabled: true,
        maxAgeHours: 8,
        strategy: "jwt",
      }}
    />
  )
}
