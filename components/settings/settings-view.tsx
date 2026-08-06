"use client"

import { useActionState } from "react"

import {
  archiveCategoryAction,
  changePasswordAction,
  createCategoryAction,
  restoreCategoryAction,
  updateCategoryAction,
  updatePreferencesAction,
  type SettingsActionState,
} from "@/app/(dashboard)/dashboard/settings/actions"
import {
  StreamerModeSettingsCard,
  useStreamerModeOptional,
} from "@/components/streamer-mode"
import {
  DATE_FORMATS,
  NUMBER_FORMATS,
} from "@/lib/validations/settings"
import { EXCHANGE_RATE_ATTRIBUTION } from "@/lib/exchange-rates/types"
import { SUPPORTED_CURRENCIES } from "@/lib/money/currency"
import {
  APP_TIMEZONE,
  formatAppDate,
  formatAppDateTime,
  istanbulDateKey,
  istanbulTodayKey,
  startOfAppMonth,
} from "@/lib/time"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CategoryManageItem, SettingsProfile } from "@/lib/services/settings"

const initialState: SettingsActionState = {}

type AccountOption = {
  id: string
  name: string
  currency: string
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function SettingsView({
  profile,
  accounts,
  categories,
  attachmentUsage,
  sessionInfo,
}: {
  profile: SettingsProfile
  accounts: AccountOption[]
  categories: CategoryManageItem[]
  attachmentUsage: { fileCount: number; totalBytes: number }
  sessionInfo: {
    registrationDisabled: boolean
    maxAgeHours: number
    strategy: string
  }
}) {
  const { enabled: streamerMode } = useStreamerModeOptional()
  const [prefState, prefAction, prefPending] = useActionState(
    updatePreferencesAction,
    initialState
  )
  const [pwdState, pwdAction, pwdPending] = useActionState(
    changePasswordAction,
    initialState
  )
  const [createState, createAction, createPending] = useActionState(
    createCategoryAction,
    initialState
  )
  const [updateState, updateAction, updatePending] = useActionState(
    updateCategoryAction,
    initialState
  )
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveCategoryAction,
    initialState
  )
  const [restoreState, restoreAction, restorePending] = useActionState(
    restoreCategoryAction,
    initialState
  )

  const incomeCategories = categories.filter((c) => c.kind === "INCOME")
  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE")
  const defaultTo = istanbulTodayKey()
  const monthStart = istanbulDateKey(startOfAppMonth())

  return (
    <section className="space-y-8">
      <PageHeader
        title="Settings"
        description="Owner profile, preferences, categories, export, and security — real data only."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base tracking-tight">Profile</CardTitle>
            <CardDescription>Owner account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{profile.email}</p>
            </div>
            {profile.name ? (
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p>{profile.name}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground">Member since</p>
              <p>{formatAppDate(profile.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base tracking-tight">
              Change password
            </CardTitle>
            <CardDescription>
              Requires current password. You will be signed out after a successful
              change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={pwdAction} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={pwdPending}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  disabled={pwdPending}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  disabled={pwdPending}
                />
              </div>
              {pwdState.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {pwdState.error}
                </p>
              ) : null}
              <Button type="submit" disabled={pwdPending}>
                {pwdPending ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base tracking-tight">Preferences</CardTitle>
            <CardDescription>
              Display and default account preferences. Live FX suggestions use
              USD as the reporting base (
              <a
                href={EXCHANGE_RATE_ATTRIBUTION.href}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {EXCHANGE_RATE_ATTRIBUTION.label}
              </a>
              ).
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form action={prefAction} className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="preferredCurrency">
                Preferred currency (reporting base is USD)
              </Label>
              <select
                id="preferredCurrency"
                name="preferredCurrency"
                defaultValue={profile.preferredCurrency}
                disabled={prefPending}
                className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <input type="hidden" name="timezone" value={APP_TIMEZONE} />
              <Input
                id="timezone"
                value={APP_TIMEZONE}
                disabled
                readOnly
                className="bg-muted/40"
              />
              <p className="text-xs text-muted-foreground">
                App-wide reporting and display zone (enforced).
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dateFormat">Date format</Label>
              <select
                id="dateFormat"
                name="dateFormat"
                defaultValue={profile.dateFormat}
                disabled={prefPending}
                className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
              >
                {DATE_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="numberFormat">Number format</Label>
              <select
                id="numberFormat"
                name="numberFormat"
                defaultValue={profile.numberFormat}
                disabled={prefPending}
                className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
              >
                {NUMBER_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="defaultIncomeAccountId">
                Default income account
              </Label>
              <select
                id="defaultIncomeAccountId"
                name="defaultIncomeAccountId"
                defaultValue={profile.defaultIncomeAccountId ?? ""}
                disabled={prefPending}
                className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
              >
                <option value="">None</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="defaultExpenseAccountId">
                Default expense account
              </Label>
              <select
                id="defaultExpenseAccountId"
                name="defaultExpenseAccountId"
                defaultValue={profile.defaultExpenseAccountId ?? ""}
                disabled={prefPending}
                className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
              >
                <option value="">None</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={prefPending}>
                {prefPending ? "Saving…" : "Save preferences"}
              </Button>
              {prefState.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {prefState.error}
                </p>
              ) : null}
              {prefState.message ? (
                <p className="text-sm text-muted-foreground">{prefState.message}</p>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">Categories</CardTitle>
          <CardDescription>
            Archive instead of deleting when a category is already in use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            action={createAction}
            className="grid gap-3 rounded-lg border border-border/60 bg-background/30 p-3 md:grid-cols-[140px_1fr_auto]"
          >
            <select
              name="kind"
              defaultValue="EXPENSE"
              disabled={createPending}
              className="h-8 rounded-md border border-input bg-input/20 px-2 text-sm"
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
            <Input
              name="name"
              placeholder="New category name"
              required
              disabled={createPending}
            />
            <Button type="submit" disabled={createPending}>
              {createPending ? "Adding…" : "Add"}
            </Button>
          </form>
          {createState.error ? (
            <p className="text-sm text-destructive">{createState.error}</p>
          ) : null}

          <CategoryGroup
            title="Income categories"
            rows={incomeCategories}
            updateAction={updateAction}
            archiveAction={archiveAction}
            restoreAction={restoreAction}
            pending={updatePending || archivePending || restorePending}
          />
          <CategoryGroup
            title="Expense categories"
            rows={expenseCategories}
            updateAction={updateAction}
            archiveAction={archiveAction}
            restoreAction={restoreAction}
            pending={updatePending || archivePending || restorePending}
          />

          {updateState.error || archiveState.error || restoreState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {updateState.error || archiveState.error || restoreState.error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/70 shadow-none xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base tracking-tight">Export</CardTitle>
            <CardDescription>
              CSV of your transactions (excludes soft-deleted)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              method="post"
              action="/dashboard/settings/export"
              className="grid gap-3"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  name="from"
                  type="date"
                  required
                  defaultValue={monthStart}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  name="to"
                  type="date"
                  required
                  defaultValue={defaultTo}
                />
              </div>
              {streamerMode ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Streamer Mode is on. CSV downloads still contain real amounts —
                  do not share the file while streaming.
                </p>
              ) : null}
              <Button type="submit" variant="outline">
                Download CSV
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base tracking-tight">Security</CardTitle>
            <CardDescription>Account protection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <StreamerModeSettingsCard />
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Registration disabled</Badge>
            </div>
            <p className="text-muted-foreground">
              This app is single-owner. Public sign-up is not available.
            </p>
            <div>
              <p className="text-xs text-muted-foreground">Last login</p>
              <p>
                {profile.lastLoginAt
                  ? formatAppDateTime(profile.lastLoginAt)
                  : "Not recorded yet"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active session</p>
              <p>
                JWT · max {sessionInfo.maxAgeHours}h · strategy{" "}
                {sessionInfo.strategy}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base tracking-tight">Storage</CardTitle>
            <CardDescription>
              Attachment usage summary (paths hidden)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Files:{" "}
              <span className="font-mono tabular-nums">
                {attachmentUsage.fileCount}
              </span>
            </p>
            <p>
              Total size:{" "}
              <span className="font-mono tabular-nums">
                {formatBytes(attachmentUsage.totalBytes)}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function CategoryGroup({
  title,
  rows,
  updateAction,
  archiveAction,
  restoreAction,
  pending,
}: {
  title: string
  rows: CategoryManageItem[]
  updateAction: (payload: FormData) => void
  archiveAction: (payload: FormData) => void
  restoreAction: (payload: FormData) => void
  pending: boolean
}) {
  if (rows.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/20 p-3 sm:flex-row sm:items-center"
          >
            <form
              action={updateAction}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            >
              <input type="hidden" name="id" value={row.id} />
              <Input
                name="name"
                defaultValue={row.name}
                disabled={pending || Boolean(row.deletedAt)}
                className="max-w-xs"
              />
              {row.isSystem ? (
                <Badge variant="outline">System</Badge>
              ) : null}
              {row.deletedAt ? (
                <Badge variant="destructive">Archived</Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                Used {row.usageCount}×
              </span>
              {!row.deletedAt ? (
                <Button type="submit" size="sm" variant="outline" disabled={pending}>
                  Save
                </Button>
              ) : null}
            </form>
            {!row.deletedAt ? (
              <form action={archiveAction}>
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" size="sm" variant="ghost" disabled={pending}>
                  Archive
                </Button>
              </form>
            ) : (
              <form action={restoreAction}>
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" size="sm" variant="outline" disabled={pending}>
                  Restore
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
