import { createHash, randomUUID } from "node:crypto"

import type {
  Attachment,
  AttachmentEntityType,
} from "@/generated/prisma/client"

import { prisma } from "@/lib/db"
import { writeAuditLog } from "@/lib/services/audit"
import {
  getAttachmentsBucket,
  getSignedUrlTtlSeconds,
  getSupabaseAdmin,
  StorageConfigError,
} from "@/lib/storage/supabase"
import {
  assertAttachmentMagicBytes,
  assertSafeAttachmentFile,
  MAX_ATTACHMENTS_PER_ENTITY,
  resolveAttachmentMimeType,
} from "@/lib/validations/attachments"

export class AttachmentServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AttachmentServiceError"
  }
}

export type AttachmentListItem = {
  id: string
  entityType: AttachmentEntityType
  entityId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  provider: string
}

function toListItem(row: Attachment): AttachmentListItem {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
    provider: row.provider,
  }
}

async function assertParentOwned(
  userId: string,
  entityType: AttachmentEntityType,
  entityId: string
) {
  switch (entityType) {
    case "TRANSACTION": {
      const row = await prisma.transaction.findFirst({
        where: { id: entityId, userId, deletedAt: null },
        select: { id: true },
      })
      if (!row) throw new AttachmentServiceError("Transaction not found.")
      return
    }
    case "DEBT": {
      const row = await prisma.debt.findFirst({
        where: { id: entityId, userId, deletedAt: null },
        select: { id: true },
      })
      if (!row) throw new AttachmentServiceError("Debt not found.")
      return
    }
    case "DEBT_PAYMENT": {
      const row = await prisma.debtPayment.findFirst({
        where: {
          id: entityId,
          deletedAt: null,
          debt: { userId, deletedAt: null },
        },
        select: { id: true },
      })
      if (!row) throw new AttachmentServiceError("Debt payment not found.")
      return
    }
    case "SUBSCRIPTION": {
      const row = await prisma.subscription.findFirst({
        where: { id: entityId, userId, deletedAt: null },
        select: { id: true },
      })
      if (!row) throw new AttachmentServiceError("Subscription not found.")
      return
    }
    default:
      throw new AttachmentServiceError("Unsupported entity type.")
  }
}

function buildStorageKey(input: {
  userId: string
  entityType: AttachmentEntityType
  entityId: string
  safeFileName: string
  extension: string
}) {
  // Server-generated only — never accept client storage paths.
  const unique = randomUUID()
  const baseName = input.safeFileName.replace(/\.[^.]+$/, "") || "file"
  const objectName = `${unique}-${baseName}.${input.extension}`
  const key = `${input.userId}/${input.entityType}/${input.entityId}/${objectName}`

  if (
    key.includes("..") ||
    key.startsWith("/") ||
    key.includes("\\") ||
    !key.startsWith(`${input.userId}/`)
  ) {
    throw new AttachmentServiceError("Invalid storage path.")
  }
  return key
}

export async function listAttachments(
  userId: string,
  entityType: AttachmentEntityType,
  entityId: string
): Promise<AttachmentListItem[]> {
  await assertParentOwned(userId, entityType, entityId)

  const rows = await prisma.attachment.findMany({
    where: {
      userId,
      entityType,
      entityId,
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }],
  })

  return rows.map(toListItem)
}

export async function uploadAttachment(input: {
  userId: string
  entityType: AttachmentEntityType
  entityId: string
  fileName: string
  mimeType: string
  bytes: Buffer
}): Promise<AttachmentListItem> {
  try {
    await assertParentOwned(input.userId, input.entityType, input.entityId)

    const safe = assertSafeAttachmentFile({
      fileName: input.fileName,
      mimeType: resolveAttachmentMimeType(input.fileName, input.mimeType),
      sizeBytes: input.bytes.byteLength,
    })

    try {
      assertAttachmentMagicBytes(input.bytes, safe.mimeType)
    } catch (error) {
      throw new AttachmentServiceError(
        error instanceof Error ? error.message : "Invalid file content."
      )
    }

    const storageKey = buildStorageKey({
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      safeFileName: safe.fileName,
      extension: safe.extension,
    })

    const checksumSha256 = createHash("sha256")
      .update(input.bytes)
      .digest("hex")

    const supabase = getSupabaseAdmin()
    const bucket = getAttachmentsBucket()
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storageKey, input.bytes, {
        contentType: safe.mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error("[attachments] Upload failed:", uploadError.message)
      throw new AttachmentServiceError(
        "Could not upload attachment. Please try again."
      )
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        // Serialize per-entity uploads so count cannot race past the max.
        const lockKey = `${input.userId}:${input.entityType}:${input.entityId}`
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`

        const activeCount = await tx.attachment.count({
          where: {
            userId: input.userId,
            entityType: input.entityType,
            entityId: input.entityId,
            deletedAt: null,
          },
        })
        if (activeCount >= MAX_ATTACHMENTS_PER_ENTITY) {
          throw new AttachmentServiceError(
            `Maximum of ${MAX_ATTACHMENTS_PER_ENTITY} files per record.`
          )
        }

        const row = await tx.attachment.create({
          data: {
            userId: input.userId,
            entityType: input.entityType,
            entityId: input.entityId,
            provider: "SUPABASE",
            storageKey,
            fileName: safe.fileName,
            mimeType: safe.mimeType,
            sizeBytes: input.bytes.byteLength,
            checksumSha256,
          },
        })

        await writeAuditLog(tx, {
          userId: input.userId,
          entityType: "Attachment",
          entityId: row.id,
          action: "CREATE",
          before: null,
          after: {
            id: row.id,
            entityType: row.entityType,
            entityId: row.entityId,
            fileName: row.fileName,
            mimeType: row.mimeType,
            sizeBytes: row.sizeBytes,
            storageKey: row.storageKey,
            provider: row.provider,
          },
          reason: "Attachment uploaded",
        })

        return row
      })

      return toListItem(created)
    } catch (error) {
      // Quarantine/remove orphaned storage object if DB write fails.
      await supabase.storage.from(bucket).remove([storageKey]).catch(() => {})
      throw error
    }
  } catch (error) {
    if (error instanceof AttachmentServiceError) throw error
    if (error instanceof StorageConfigError) {
      throw new AttachmentServiceError(
        "File storage is unavailable. Try again later."
      )
    }
    console.error("[attachments] Upload error:", error)
    throw new AttachmentServiceError("Could not upload attachment.")
  }
}

export async function createSignedPreviewUrl(
  userId: string,
  attachmentId: string
): Promise<{ url: string; fileName: string; mimeType: string; expiresIn: number }> {
  try {
    const row = await prisma.attachment.findFirst({
      where: { id: attachmentId, userId, deletedAt: null },
    })
    if (!row) {
      throw new AttachmentServiceError("Attachment not found.")
    }

    // Defense in depth: parent must still belong to the user.
    await assertParentOwned(userId, row.entityType, row.entityId)

    if (
      row.storageKey.includes("..") ||
      !row.storageKey.startsWith(`${userId}/`)
    ) {
      throw new AttachmentServiceError("Invalid storage path.")
    }

    const expiresIn = getSignedUrlTtlSeconds()
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.storage
      .from(getAttachmentsBucket())
      .createSignedUrl(row.storageKey, expiresIn)

    if (error || !data?.signedUrl) {
      console.error(
        "[attachments] Signed URL failed:",
        error?.message ?? "missing signedUrl"
      )
      throw new AttachmentServiceError("Could not create preview URL.")
    }

    return {
      url: data.signedUrl,
      fileName: row.fileName,
      mimeType: row.mimeType,
      expiresIn,
    }
  } catch (error) {
    if (error instanceof AttachmentServiceError) throw error
    if (error instanceof StorageConfigError) {
      throw new AttachmentServiceError(
        "File storage is unavailable. Try again later."
      )
    }
    console.error("[attachments] Preview error:", error)
    throw new AttachmentServiceError("Could not create preview URL.")
  }
}

export async function softDeleteAttachment(
  userId: string,
  attachmentId: string
): Promise<void> {
  try {
    const existing = await prisma.attachment.findFirst({
      where: { id: attachmentId, userId, deletedAt: null },
    })
    if (!existing) {
      throw new AttachmentServiceError("Attachment not found.")
    }

    await assertParentOwned(userId, existing.entityType, existing.entityId)

    await prisma.$transaction(async (tx) => {
      const deleted = await tx.attachment.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      })

      await writeAuditLog(tx, {
        userId,
        entityType: "Attachment",
        entityId: deleted.id,
        action: "SOFT_DELETE",
        before: {
          id: existing.id,
          storageKey: existing.storageKey,
          fileName: existing.fileName,
        },
        after: {
          id: deleted.id,
          deletedAt: deleted.deletedAt,
        },
        reason: "Attachment soft-deleted",
      })
    })

    // Best-effort storage cleanup after metadata soft-delete.
    const supabase = getSupabaseAdmin()
    const bucket = getAttachmentsBucket()
    const { error } = await supabase.storage
      .from(bucket)
      .remove([existing.storageKey])

    if (error) {
      // Quarantine copy attempt if hard delete fails.
      const quarantineKey = `quarantine/${existing.storageKey}`
      await supabase.storage
        .from(bucket)
        .move(existing.storageKey, quarantineKey)
        .catch(() => {})
    }
  } catch (error) {
    if (error instanceof AttachmentServiceError) throw error
    if (error instanceof StorageConfigError) {
      throw new AttachmentServiceError(
        "File storage is unavailable. Try again later."
      )
    }
    console.error("[attachments] Delete error:", error)
    throw new AttachmentServiceError("Could not delete attachment.")
  }
}
