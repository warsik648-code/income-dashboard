import { describe, expect, it } from "vitest"

import {
  frequentCategoryIds,
  orderExpenseCategories,
} from "@/lib/expenses/category-order"

describe("orderExpenseCategories", () => {
  it("preserves every category exactly once", () => {
    const categories = [
      { id: "1", name: "Zulu" },
      { id: "2", name: "Alpha" },
    ]
    const ordered = orderExpenseCategories(categories, ["1"])
    expect(ordered).toHaveLength(2)
    expect(new Set(ordered.map((c) => c.id)).size).toBe(2)
  })
})

describe("frequentCategoryIds", () => {
  it("returns empty list when there is no history", () => {
    expect(frequentCategoryIds([])).toEqual([])
  })
})
