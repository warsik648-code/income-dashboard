/** Prisma requires a non-null description; quick entry may omit it. */
export function resolveExpenseDescription(
  description: string | undefined | null,
  categoryName: string
): string {
  const trimmed = description?.trim()
  return trimmed ? trimmed : categoryName
}
