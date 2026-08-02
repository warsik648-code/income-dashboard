import type { Category } from "@/generated/prisma/client"

import { prisma } from "@/lib/db"

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
    EXPENSE_CATEGORY_NAMES.map((name) =>
      prisma.category.upsert({
        where: {
          userId_kind_name: {
            userId,
            kind: "EXPENSE",
            name,
          },
        },
        create: {
          userId,
          kind: "EXPENSE",
          name,
          isSystem: true,
        },
        update: {
          deletedAt: null,
          isSystem: true,
        },
      })
    )
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
