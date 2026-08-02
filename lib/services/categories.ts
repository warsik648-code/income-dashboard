import type { Category } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import { writeAuditLog } from "@/lib/services/audit"

export const EXPENSE_CATEGORY_NAMES = [
  "Food delivery",
  "Eating out",
  "Groceries",
  "Clothes",
  "Bills",
  "Transport",
  "Family or parents",
  "Personal purchase",
  "Business expense",
  "Debt repayment",
  "Subscription",
  "Other",
] as const

/** Idempotently ensure system expense categories exist for the user. */
export async function ensureExpenseCategories(
  userId: string
): Promise<Category[]> {
  await prisma.$transaction(
    async (tx) => {
      for (const name of EXPENSE_CATEGORY_NAMES) {
        const existing = await tx.category.findUnique({
          where: {
            userId_kind_name: {
              userId,
              kind: "EXPENSE",
              name,
            },
          },
        })

        if (!existing) {
          const created = await tx.category.create({
            data: {
              userId,
              kind: "EXPENSE",
              name,
              isSystem: true,
            },
          })
          await writeAuditLog(tx, {
            userId,
            entityType: "Category",
            entityId: created.id,
            action: "CREATE",
            before: null,
            after: created,
            reason: "System expense category ensured",
          })
          continue
        }

        if (existing.deletedAt || !existing.isSystem) {
          const updated = await tx.category.update({
            where: { id: existing.id },
            data: { deletedAt: null, isSystem: true },
          })
          await writeAuditLog(tx, {
            userId,
            entityType: "Category",
            entityId: updated.id,
            action: "RESTORE",
            before: existing,
            after: updated,
            reason: "System expense category restored",
          })
        }
      }
    },
    { timeout: 20_000 }
  )

  return prisma.category.findMany({
    where: {
      userId,
      kind: "EXPENSE",
      deletedAt: null,
    },
    orderBy: { name: "asc" },
  })
}
