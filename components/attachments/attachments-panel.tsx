"use client"

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import { FileText, ImageIcon, Paperclip, Upload, X } from "lucide-react"

import {
  deleteAttachmentAction,
  listAttachmentsAction,
  previewAttachmentAction,
  uploadAttachmentAction,
  type AttachmentActionState,
} from "@/app/(dashboard)/dashboard/attachments/actions"
import type { AttachmentListItem } from "@/lib/services/attachments"
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ENTITY,
} from "@/lib/validations/attachments"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(",")

const initialState: AttachmentActionState = {}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mimeType: string) {
  return mimeType.startsWith("image/")
}

export function AttachmentsPanel({
  entityType,
  entityId,
  title = "Attachments",
}: {
  entityType:
    | "TRANSACTION"
    | "DEBT"
    | "DEBT_PAYMENT"
    | "SUBSCRIPTION"
    | "TRANSFER"
  entityId: string
  title?: string
}) {
  const [loadedItems, setLoadedItems] = useState<AttachmentListItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoading, startLoadTransition] = useTransition()

  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadAttachmentAction,
    initialState
  )
  const [previewState, previewAction, previewPending] = useActionState(
    previewAttachmentAction,
    initialState
  )
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAttachmentAction,
    initialState
  )

  useEffect(() => {
    let cancelled = false
    startLoadTransition(async () => {
      const result = await listAttachmentsAction(entityType, entityId)
      if (cancelled) return
      if (result.error) {
        setLoadError(result.error)
        return
      }
      setLoadedItems(result.items ?? [])
      setLoadError(null)
    })
    return () => {
      cancelled = true
    }
  }, [entityType, entityId])

  const items = deleteState.items ?? uploadState.items ?? loadedItems
  const preview =
    previewOpen && previewState.previewUrl
      ? {
          url: previewState.previewUrl,
          fileName: previewState.previewFileName ?? "Preview",
          mimeType:
            previewState.previewMimeType ?? "application/octet-stream",
        }
      : null

  function validateClientFile(file: File): string | null {
    if (file.size > MAX_ATTACHMENT_BYTES) return "File exceeds the 10 MB limit."
    if (items.length >= MAX_ATTACHMENTS_PER_ENTITY) {
      return `Maximum of ${MAX_ATTACHMENTS_PER_ENTITY} files per record.`
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (
      !(ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext)
    ) {
      return "Unsupported file type. Allowed: PDF, PNG, JPG/JPEG, WEBP."
    }
    return null
  }

  function uploadFile(file: File) {
    const error = validateClientFile(file)
    if (error) {
      setClientError(error)
      return
    }
    setClientError(null)
    const fd = new FormData()
    fd.set("entityType", entityType)
    fd.set("entityId", entityId)
    fd.set("file", file)
    uploadAction(fd)
  }

  function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const file = fileList[0]
    if (file) uploadFile(file)
  }

  const busy = uploadPending || deletePending || previewPending || isLoading
  const error =
    clientError ||
    uploadState.error ||
    deleteState.error ||
    previewState.error ||
    loadError

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="size-4 text-muted-foreground" />
          {title}
        </div>
        <span className="text-xs text-muted-foreground">
          {items.length}/{MAX_ATTACHMENTS_PER_ENTITY} · max 10 MB
        </span>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          onFiles(event.dataTransfer.files)
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-5 text-center transition-colors ${
          dragOver
            ? "border-primary/60 bg-primary/5"
            : "border-border/70 bg-card/20"
        }`}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag and drop PDF or images, or choose a file
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || items.length >= MAX_ATTACHMENTS_PER_ENTITY}
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            onFiles(event.target.files)
            event.target.value = ""
          }}
        />
      </div>

      {uploadPending ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Uploading…
        </p>
      ) : null}

      {error ? (
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setClientError(null)}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border/50 bg-card/40 p-2"
            >
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40">
                {isImage(item.mimeType) ? (
                  <ImageIcon className="size-4 text-muted-foreground" />
                ) : (
                  <FileText className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.mimeType} · {formatBytes(item.sizeBytes)} ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <form
                  action={previewAction}
                  onSubmit={() => setPreviewOpen(true)}
                >
                  <input type="hidden" name="id" value={item.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                  >
                    Preview
                  </Button>
                </form>
                <form
                  action={deleteAction}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        `Remove “${item.fileName}”? This soft-deletes the attachment.`
                      )
                    ) {
                      event.preventDefault()
                    }
                  }}
                >
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="entityType" value={entityType} />
                  <input type="hidden" name="entityId" value={entityId} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                  >
                    Remove
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreviewOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.fileName ?? "Preview"}</DialogTitle>
            <DialogDescription>
              Short-lived signed URL · private storage
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            isImage(preview.mimeType) ? (
              // Signed URL from private bucket; temporary access only.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt={preview.fileName}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            ) : (
              <iframe
                title={preview.fileName}
                src={preview.url}
                sandbox="allow-same-origin"
                className="h-[70vh] w-full rounded-md border border-border/60"
              />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
