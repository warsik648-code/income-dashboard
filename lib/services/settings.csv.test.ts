import { describe, expect, it } from "vitest"

import { csvEscape } from "@/lib/services/settings"

describe("csvEscape", () => {
  it("neutralizes formula-like prefixes", () => {
    expect(csvEscape("=CMD()")).toBe("'=CMD()")
    expect(csvEscape("+123")).toBe("'+123")
    expect(csvEscape("-123")).toBe("'-123")
    expect(csvEscape("@sum")).toBe("'@sum")
  })

  it("quotes fields with commas", () => {
    expect(csvEscape("a,b")).toBe('"a,b"')
  })
})
