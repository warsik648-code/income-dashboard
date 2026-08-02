export type RankableCategory = { id: string; name: string }

/**
 * Prefer frequently used categories (from recent expenses), then A–Z.
 * Does not invent or duplicate categories.
 */
export function orderExpenseCategories(
  categories: RankableCategory[],
  recentCategoryIds: string[]
): RankableCategory[] {
  const counts = new Map<string, number>()
  for (const id of recentCategoryIds) {
    if (!id) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return [...categories].sort((a, b) => {
    const diff = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  })
}

export function frequentCategoryIds(
  recentCategoryIds: string[],
  limit = 6
): string[] {
  const counts = new Map<string, number>()
  for (const id of recentCategoryIds) {
    if (!id) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id)
}
