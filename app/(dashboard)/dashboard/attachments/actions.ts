"use server"

import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import {
  AttachmentServiceError,
  createSignedPreviewUrl,
  listAttachments,
  softDeleteAttachment,
  uploadAttachment,
  type AttachmentListItem,
} from "@/lib/services/attachments"
import {
  attachmentIdSchema,
  attachmentParentSchema,
} from "@/lib/validations/attachments"

export type AttachmentActionState = {
  ok?: boolean
  error?: string
  items?: AttachmentListItem[]
  previewUrl?: string
  previewFileName?: string
  previewMimeType?: string
}

async function requireUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

function revalidateAttachmentHosts() {
  revalidatePath("/dashboard/income")
  revalidatePath("/dashboard/expenses")
  revalidatePath("/dashboard/subscriptions")
  revalidatePath("/dashboard/debts")
  revalidatePath("/dashboard")
}

export async function listAttachmentsAction(
  entityType: string,
  entityId: string
): Promise<AttachmentActionState> {
  try {
    const userId = await requireUserId()
    const parsed = attachmentParentSchema.safeParse({ entityType, entityId })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid parent" }
    }
    const items = await listAttachments(
      userId,
      parsed.data.entityType,
      parsed.data.entityId
    )
    return { ok: true, items }
  } catch (error) {
    if (error instanceof AttachmentServiceError) return { error: error.message }
    return { error: "Could not load attachments" }
  }
}

export async function uploadAttachmentAction(
  _prev: AttachmentActionState,
  formData: FormData
): Promise<AttachmentActionState> {
  try {
    const userId = await requireUserId()
    const parsed = attachmentParentSchema.safeParse({
      entityType: formData.get("entityType"),
      entityId: formData.get("entityId"),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid parent" }
    }

    const file = formData.get("file")
    if (!(file instanceof File)) {
      return { error: "Choose a file to upload." }
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    await uploadAttachment({
      userId,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes,
    })

    const items = await listAttachments(
      userId,
      parsed.data.entityType,
      parsed.data.entityId
    )
    revalidateAttachmentHosts()
    return { ok: true, items }
  } catch (error) {
    if (error instanceof AttachmentServiceError) return { error: error.message }
    return { error: "Could not upload attachment" }
  }
}

export async function previewAttachmentAction(
  _prev: AttachmentActionState,
  formData: FormData
): Promise<AttachmentActionState> {
  try {
    const userId = await requireUserId()
    const parsed = attachmentIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid attachment" }

    const preview = await createSignedPreviewUrl(userId, parsed.data.id)
    return {
      ok: true,
      previewUrl: preview.url,
      previewFileName: preview.fileName,
      previewMimeType: preview.mimeType,
    }
  } catch (error) {
    if (error instanceof AttachmentServiceError) return { error: error.message }
    return { error: "Could not open preview" }
  }
}

export async function deleteAttachmentAction(
  _prev: AttachmentActionState,
  formData: FormData
): Promise<AttachmentActionState> {
  try {
    const userId = await requireUserId()
    const parsed = attachmentIdSchema.safeParse({ id: formData.get("id") })
    if (!parsed.success) return { error: "Invalid attachment" }

    const parent = attachmentParentSchema.safeParse({
      entityType: formData.get("entityType"),
      entityId: formData.get("entityId"),
    })

    await softDeleteAttachment(userId, parsed.data.id)

    let items: AttachmentListItem[] | undefined
    if (parent.success) {
      items = await listAttachments(
        userId,
        parent.data.entityType,
        parent.data.entityId
      )
    }

    revalidateAttachmentHosts()
    return { ok: true, items }
  } catch (error) {
    if (error instanceof AttachmentServiceError) return { error: error.message }
    return { error: "Could not delete attachment" }
  }
}
