import { describe, expect, it } from "vitest"

import { buildFxSnapshot, isSameFrozenFx } from "@/lib/money"
import {
  frequentCategoryIds,
  orderExpenseCategories,
} from "@/lib/expenses/category-order"
import { resolveExpenseDescription } from "@/lib/expenses/description"
import {
  createExpenseSchema,
  updateExpenseSchema,
} from "@/lib/validations/expenses"

const now = "2026-08-02T12:00"

function requiredOnly(overrides: Record<string, unknown> = {}) {
  return {
    accountId: "acc_usd",
    categoryId: "cat_food",
    amount: "12.50",
    transactionDate: now,
    description: "",
    counterparty: "",
    notes: "",
    paymentMethod: "",
    exchangeRate: "",
    exchangeRateSource: "",
    allowOverdraft: "",
    ...overrides,
  }
}

describe("quick expense validation", () => {
  it("accepts USD expense with only required fields", () => {
    const parsed = createExpenseSchema.safeParse(requiredOnly())
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.accountId).toBe("acc_usd")
    expect(parsed.data.categoryId).toBe("cat_food")
    expect(parsed.data.amount).toBe("12.50")
    expect(parsed.data.description).toBe("")
    expect(parsed.data.counterparty).toBe("")
    expect(parsed.data.paymentMethod).toBe("")
  })

  it("allows omitting optional text fields", () => {
    const parsed = createExpenseSchema.safeParse({
      accountId: "acc_usd",
      categoryId: "cat_food",
      amount: "3",
      transactionDate: now,
    })
    expect(parsed.success).toBe(true)
  })

  it("accepts PKR quick expense with live/cached FX rate", () => {
    const parsed = createExpenseSchema.safeParse(
      requiredOnly({
        accountId: "acc_pkr",
        amount: "500",
        exchangeRate: "277.58",
        exchangeRateSource: "PROVIDER",
      })
    )
    expect(parsed.success).toBe(true)
    const fx = buildFxSnapshot({
      amount: "500",
      currency: "PKR",
      exchangeRate: "277.58",
      exchangeRateSource: "PROVIDER",
    })
    expect(fx.baseAmountUsd.toString()).toBe("1.8013")
  })

  it("accepts TRY quick expense with live/cached FX rate", () => {
    const parsed = createExpenseSchema.safeParse(
      requiredOnly({
        accountId: "acc_try",
        amount: "100",
        exchangeRate: "47.54776",
        exchangeRateSource: "PROVIDER",
      })
    )
    expect(parsed.success).toBe(true)
    const fx = buildFxSnapshot({
      amount: "100",
      currency: "TRY",
      exchangeRate: "47.54776",
      exchangeRateSource: "PROVIDER",
    })
    expect(Number(fx.baseAmountUsd.toString())).toBeCloseTo(2.1031, 3)
  })

  it("accepts manual FX fallback for non-USD", () => {
    const parsed = createExpenseSchema.safeParse(
      requiredOnly({
        accountId: "acc_try",
        amount: "40",
        exchangeRate: "40",
        exchangeRateSource: "USER_OVERRIDE",
      })
    )
    expect(parsed.success).toBe(true)
  })

  it("rejects invalid amount", () => {
    const parsed = createExpenseSchema.safeParse(
      requiredOnly({ amount: "0" })
    )
    expect(parsed.success).toBe(false)
  })

  it("rejects missing category", () => {
    const parsed = createExpenseSchema.safeParse(
      requiredOnly({ categoryId: "" })
    )
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues[0]?.message).toMatch(/category/i)
  })

  it("still accepts detailed expense entry", () => {
    const parsed = createExpenseSchema.safeParse(
      requiredOnly({
        description: "Lunch near office",
        counterparty: "Cafe X",
        notes: "Team lunch",
        paymentMethod: "POS",
        exchangeRate: "1",
        exchangeRateSource: "FIXED_USD",
      })
    )
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.description).toBe("Lunch near office")
    expect(parsed.data.counterparty).toBe("Cafe X")
    expect(parsed.data.paymentMethod).toBe("POS")
  })

  it("keeps historical FX frozen when amount and rate unchanged", () => {
    const existing = buildFxSnapshot({
      amount: "100",
      currency: "TRY",
      exchangeRate: "40",
      exchangeRateSource: "PROVIDER",
    })
    const next = buildFxSnapshot({
      amount: "100",
      currency: "TRY",
      exchangeRate: "40",
      exchangeRateSource: "PROVIDER",
    })
    expect(isSameFrozenFx(existing, next)).toBe(true)
  })

  it("update schema accepts optional fields like create", () => {
    const parsed = updateExpenseSchema.safeParse({
      id: "txn_1",
      ...requiredOnly({ amount: "9.99" }),
    })
    expect(parsed.success).toBe(true)
  })
})

describe("expense description and category ordering", () => {
  it("defaults description to category name when omitted", () => {
    expect(resolveExpenseDescription("", "Groceries")).toBe("Groceries")
    expect(resolveExpenseDescription("  Coffee  ", "Groceries")).toBe("Coffee")
  })

  it("orders frequent categories first without duplicates", () => {
    const categories = [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
      { id: "c", name: "Chi" },
    ]
    const ordered = orderExpenseCategories(categories, ["b", "b", "c", "b"])
    expect(ordered.map((c) => c.id)).toEqual(["b", "c", "a"])
    expect(frequentCategoryIds(["b", "b", "c", "b"], 2)).toEqual(["b", "c"])
  })
})

describe("save and add another intent", () => {
  it("create schema does not require optional fields between rapid saves", () => {
    const first = createExpenseSchema.safeParse(requiredOnly({ amount: "5" }))
    const second = createExpenseSchema.safeParse(requiredOnly({ amount: "8" }))
    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
  })
})
