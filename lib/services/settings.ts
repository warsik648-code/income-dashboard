import type { Category, TransactionType, User } from "@/generated/prisma/client"

import { hashPassword, verifyPassword } from "@/lib/auth/password"
import { prisma } from "@/lib/db"
import { normalizeCurrencyCode } from "@/lib/money"
import { writeAuditLog } from "@/lib/services/audit"
import type {
  ChangePasswordInput,
  CreateCategoryInput,
  ExportTransactionsInput,
  UpdateCategoryInput,
  UpdatePreferencesInput,
} from "@/lib/validations/settings"

export class SettingsServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SettingsServiceError"
  }
}

export type SettingsProfile = {
  id: string
  email: string
  name: string | null
  preferredCurrency: string
  timezone: string
  dateFormat: string
  numberFormat: string
  defaultIncomeAccountId: string | null
  defaultExpenseAccountId: string | null
  lastLoginAt: string | null
  createdAt: string
}

export type CategoryManageItem = {
  id: string
  name: string
  kind: TransactionType
  isSystem: boolean
  deletedAt: string | null
  usageCount: number
}

async function assertOwnedActiveAccount(userId: string, accountId: string) {
  const account = await prisma.financialAccount.findFirst({
    where: {
      id: accountId,
      userId,
      deletedAt: null,
      isArchived: false,
    },
    select: { id: true },
  })
  if (!account) {
    throw new SettingsServiceError(
      "Select an active account that belongs to you."
    )
  }
  return account
}

export async function getSettingsProfile(userId: string): Promise<SettingsProfile> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      preferredCurrency: true,
      timezone: true,
      dateFormat: true,
      numberFormat: true,
      defaultIncomeAccountId: true,
      defaultExpenseAccountId: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })
  if (!user) throw new SettingsServiceError("User not found.")

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    preferredCurrency: user.preferredCurrency,
    timezone: user.timezone,
    dateFormat: user.dateFormat,
    numberFormat: user.numberFormat,
    defaultIncomeAccountId: user.defaultIncomeAccountId,
    defaultExpenseAccountId: user.defaultExpenseAccountId,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  }
}

export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput
): Promise<SettingsProfile> {
  const incomeId = input.defaultIncomeAccountId?.trim() || null
  const expenseId = input.defaultExpenseAccountId?.trim() || null

  if (incomeId) await assertOwnedActiveAccount(userId, incomeId)
  if (expenseId) await assertOwnedActiveAccount(userId, expenseId)

  return prisma.$transaction(async (tx) => {
    const before = await tx.user.findFirst({
      where: { id: userId, deletedAt: null },
    })
    if (!before) throw new SettingsServiceError("User not found.")

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        preferredCurrency: normalizeCurrencyCode(input.preferredCurrency),
        timezone: input.timezone.trim(),
        dateFormat: input.dateFormat,
        numberFormat: input.numberFormat,
        defaultIncomeAccountId: incomeId,
        defaultExpenseAccountId: expenseId,
      },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "User",
      entityId: userId,
      action: "UPDATE",
      before: sanitizeUserForAudit(before),
      after: sanitizeUserForAudit(updated),
      reason: "Preferences updated",
    })

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      preferredCurrency: updated.preferredCurrency,
      timezone: updated.timezone,
      dateFormat: updated.dateFormat,
      numberFormat: updated.numberFormat,
      defaultIncomeAccountId: updated.defaultIncomeAccountId,
      defaultExpenseAccountId: updated.defaultExpenseAccountId,
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    }
  })
}

function sanitizeUserForAudit(user: User) {
  return {
    id: user.id,
    email: user.email,
    preferredCurrency: user.preferredCurrency,
    timezone: user.timezone,
    dateFormat: user.dateFormat,
    numberFormat: user.numberFormat,
    defaultIncomeAccountId: user.defaultIncomeAccountId,
    defaultExpenseAccountId: user.defaultExpenseAccountId,
    lastLoginAt: user.lastLoginAt,
    passwordChangedAt: user.passwordChangedAt,
    // Never include passwordHash
  }
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, passwordHash: true, passwordChangedAt: true },
  })
  if (!user) throw new SettingsServiceError("User not found.")

  const valid = await verifyPassword(user.passwordHash, input.currentPassword)
  if (!valid) {
    throw new SettingsServiceError("Current password is incorrect.")
  }

  const passwordHash = await hashPassword(input.newPassword)
  const passwordChangedAt = new Date()

  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "User",
      entityId: userId,
      action: "UPDATE",
      before: { passwordChangedAt: user.passwordChangedAt },
      after: { passwordChangedAt: updated.passwordChangedAt },
      reason: "Password changed",
    })
  })
}

export async function listManagedCategories(
  userId: string,
  options?: { includeArchived?: boolean }
): Promise<CategoryManageItem[]> {
  const includeArchived = options?.includeArchived ?? true
  const rows = await prisma.category.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { deletedAt: null }),
    },
    include: {
      _count: {
        select: {
          transactions: { where: { deletedAt: null } },
          subscriptions: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    isSystem: row.isSystem,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    usageCount: row._count.transactions + row._count.subscriptions,
  }))
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<Category> {
  const name = input.name.trim()
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findFirst({
      where: { userId, kind: input.kind, name },
    })
    if (existing && !existing.deletedAt) {
      throw new SettingsServiceError("A category with this name already exists.")
    }

    const row = existing
      ? await tx.category.update({
          where: { id: existing.id },
          data: { deletedAt: null, isSystem: false },
        })
      : await tx.category.create({
          data: {
            userId,
            kind: input.kind,
            name,
            isSystem: false,
          },
        })

    await writeAuditLog(tx, {
      userId,
      entityType: "Category",
      entityId: row.id,
      action: existing ? "RESTORE" : "CREATE",
      before: existing,
      after: row,
      reason: existing ? "Category restored via create" : "Category created",
    })

    return row
  })
}

export async function updateCategory(
  userId: string,
  input: UpdateCategoryInput
): Promise<Category> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findFirst({
      where: { id: input.id, userId, deletedAt: null },
    })
    if (!existing) throw new SettingsServiceError("Category not found.")

    const name = input.name.trim()
    const clash = await tx.category.findFirst({
      where: {
        userId,
        kind: existing.kind,
        name,
        deletedAt: null,
        NOT: { id: existing.id },
      },
    })
    if (clash) {
      throw new SettingsServiceError("A category with this name already exists.")
    }

    const updated = await tx.category.update({
      where: { id: existing.id },
      data: { name },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Category",
      entityId: updated.id,
      action: "UPDATE",
      before: existing,
      after: updated,
      reason: "Category renamed",
    })

    return updated
  })
}

export async function archiveCategory(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findFirst({
      where: { id, userId, deletedAt: null },
    })
    if (!existing) throw new SettingsServiceError("Category not found.")

    const archived = await tx.category.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Category",
      entityId: archived.id,
      action: "SOFT_DELETE",
      before: existing,
      after: archived,
      reason: "Category archived",
    })

    return archived
  })
}

export async function restoreCategory(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findFirst({
      where: { id, userId, deletedAt: { not: null } },
    })
    if (!existing) throw new SettingsServiceError("Archived category not found.")

    const restored = await tx.category.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "Category",
      entityId: restored.id,
      action: "RESTORE",
      before: existing,
      after: restored,
      reason: "Category restored",
    })

    return restored
  })
}

/** Hard-delete only when unused; otherwise refuse. */
export async function deleteCategoryIfUnused(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: {
            transactions: true,
            subscriptions: true,
          },
        },
      },
    })
    if (!existing) throw new SettingsServiceError("Category not found.")

    const usage =
      existing._count.transactions + existing._count.subscriptions
    if (usage > 0) {
      throw new SettingsServiceError(
        "This category is in use. Archive it instead of deleting."
      )
    }

    await tx.category.delete({ where: { id: existing.id } })

    await writeAuditLog(tx, {
      userId,
      entityType: "Category",
      entityId: existing.id,
      action: "SOFT_DELETE",
      before: existing,
      after: null,
      reason: "Unused category permanently removed",
    })
  })
}

export async function getAttachmentUsageSummary(userId: string) {
  const aggregate = await prisma.attachment.aggregate({
    where: { userId, deletedAt: null },
    _count: { id: true },
    _sum: { sizeBytes: true },
  })
  return {
    fileCount: aggregate._count.id,
    totalBytes: aggregate._sum.sizeBytes ?? 0,
  }
}

/** Neutralize spreadsheet formula injection and quote CSV fields safely. */
export function csvEscape(value: string) {
  let safe = value
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`
  }
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

export async function exportTransactionsCsv(
  userId: string,
  input: ExportTransactionsInput
): Promise<string> {
  const from = new Date(input.from)
  from.setHours(0, 0, 0, 0)
  const to = new Date(input.to)
  to.setHours(23, 59, 59, 999)

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      transactionDate: { gte: from, lte: to },
    },
    include: {
      account: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  })

  const header = [
    "id",
    "type",
    "transactionDate",
    "description",
    "counterparty",
    "account",
    "category",
    "amount",
    "currency",
    "exchangeRate",
    "baseAmountUsd",
    "paymentMethod",
    "notes",
  ]

  const lines = [header.join(",")]
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.type,
        row.transactionDate.toISOString(),
        csvEscape(row.description),
        csvEscape(row.counterparty ?? ""),
        csvEscape(row.account.name),
        csvEscape(row.category?.name ?? ""),
        row.amount.toString(),
        row.currency,
        row.exchangeRate.toString(),
        row.baseAmountUsd.toString(),
        row.paymentMethod ?? "",
        csvEscape(row.notes ?? ""),
      ].join(",")
    )
  }

  return `${lines.join("\n")}\n`
}
