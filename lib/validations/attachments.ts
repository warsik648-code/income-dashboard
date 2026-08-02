import { z } from "zod"

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_ENTITY = 10

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
] as const

export type AllowedAttachmentMime =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]

const entityType = z.enum([
  "TRANSACTION",
  "DEBT",
  "DEBT_PAYMENT",
  "SUBSCRIPTION",
])

export const attachmentParentSchema = z.object({
  entityType,
  entityId: z.string().min(1),
})

export const attachmentIdSchema = z.object({
  id: z.string().min(1),
})

export type AttachmentParentInput = z.infer<typeof attachmentParentSchema>

const MIME_TO_EXTS: Record<AllowedAttachmentMime, readonly string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
}

export function getFileExtension(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? fileName
  const parts = base.toLowerCase().split(".")
  if (parts.length < 2) return ""
  return parts[parts.length - 1] ?? ""
}

const EXT_TO_MIME: Record<string, AllowedAttachmentMime> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

/** Infer MIME from extension when the browser sends a generic type. */
export function resolveAttachmentMimeType(
  fileName: string,
  mimeType: string
): string {
  const normalized = mimeType.trim().toLowerCase()
  if (
    (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(normalized)
  ) {
    return normalized
  }
  if (
    !normalized ||
    normalized === "application/octet-stream" ||
    normalized === "binary/octet-stream"
  ) {
    return EXT_TO_MIME[getFileExtension(fileName)] ?? normalized
  }
  return normalized
}

/** Strip paths and unsafe characters; keep a readable original basename. */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "file"
  const cleaned = base
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^\.+/, "")
    .replace(/\s+/g, " ")
    .trim()
  const limited = cleaned.slice(0, 120)
  return limited || "file"
}

/** Verify file content signatures match the declared MIME type. */
export function assertAttachmentMagicBytes(
  bytes: Buffer,
  mimeType: AllowedAttachmentMime
) {
  if (bytes.byteLength < 12) {
    throw new Error("File is too small or corrupt.")
  }

  if (mimeType === "application/pdf") {
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("File content is not a valid PDF.")
    }
    return
  }

  if (mimeType === "image/png") {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    if (!bytes.subarray(0, 8).equals(png)) {
      throw new Error("File content is not a valid PNG.")
    }
    return
  }

  if (mimeType === "image/jpeg") {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new Error("File content is not a valid JPEG.")
    }
    return
  }

  if (mimeType === "image/webp") {
    if (
      bytes.subarray(0, 4).toString("ascii") !== "RIFF" ||
      bytes.subarray(8, 12).toString("ascii") !== "WEBP"
    ) {
      throw new Error("File content is not a valid WebP.")
    }
  }
}

export function assertSafeAttachmentFile(input: {
  fileName: string
  mimeType: string
  sizeBytes: number
}): {
  fileName: string
  mimeType: AllowedAttachmentMime
  extension: string
} {
  if (input.sizeBytes <= 0) {
    throw new Error("File is empty.")
  }
  if (input.sizeBytes > MAX_ATTACHMENT_BYTES) {
    throw new Error("File exceeds the 10 MB limit.")
  }

  const mimeType = input.mimeType.trim().toLowerCase()
  if (
    !(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType)
  ) {
    throw new Error(
      "Unsupported file type. Allowed: PDF, PNG, JPG/JPEG, WEBP."
    )
  }

  const extension = getFileExtension(input.fileName)
  if (
    !(ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(extension)
  ) {
    throw new Error(
      "Unsupported file extension. Allowed: .pdf, .png, .jpg, .jpeg, .webp."
    )
  }

  const allowedExts = MIME_TO_EXTS[mimeType as AllowedAttachmentMime]
  if (!allowedExts.includes(extension)) {
    throw new Error("File extension does not match its MIME type.")
  }

  // Block double-extension tricks like invoice.pdf.exe
  const base = input.fileName.split(/[/\\]/).pop() ?? ""
  if (/\.(exe|sh|bat|cmd|js|mjs|cjs|html|htm|svg|php)$/i.test(base)) {
    throw new Error("Executable or unsafe file types are not allowed.")
  }

  return {
    fileName: sanitizeFileName(input.fileName),
    mimeType: mimeType as AllowedAttachmentMime,
    extension,
  }
}
