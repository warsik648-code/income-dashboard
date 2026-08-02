import { describe, expect, it } from "vitest"

import { assertAttachmentMagicBytes } from "@/lib/validations/attachments"

describe("assertAttachmentMagicBytes", () => {
  it("accepts a PDF header", () => {
    const bytes = Buffer.from("%PDF-1.4\n%····\nrest of file")
    expect(() =>
      assertAttachmentMagicBytes(bytes, "application/pdf")
    ).not.toThrow()
  })

  it("rejects mismatched content", () => {
    const bytes = Buffer.from("not-a-pdf-file!!")
    expect(() =>
      assertAttachmentMagicBytes(bytes, "application/pdf")
    ).toThrow(/valid PDF/i)
  })
})
