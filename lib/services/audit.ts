import type { AuditAction, Prisma } from "@/generated/prisma/client"

type AuditClient = {
  auditLog: {
    create: (args: {
      data: {
        userId: string
        entityType: string
        entityId: string
        action: AuditAction
        beforeJson?: Prisma.InputJsonValue
        afterJson?: Prisma.InputJsonValue
        reason?: string
        ipAddress?: string | null
        userAgent?: string | null
      }
    }) => Promise<unknown>
  }
}

/** Money-safe JSON: Decimals/Dates become strings so floats are never stored. */
export function toAuditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (v === null || v === undefined) return v
      if (typeof v === "bigint") return v.toString()
      if (v instanceof Date) return v.toISOString()
      if (
        typeof v === "object" &&
        v !== null &&
        "toFixed" in v &&
        typeof (v as { toFixed: unknown }).toFixed === "function"
      ) {
        return String(v)
      }
      return v
    })
  ) as Prisma.InputJsonValue
}

export async function writeAuditLog(
  client: AuditClient,
  input: {
    userId: string
    entityType: string
    entityId: string
    action: AuditAction
    before?: unknown
    after?: unknown
    reason?: string
    ipAddress?: string | null
    userAgent?: string | null
  }
) {
  await client.auditLog.create({
    data: {
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson:
        input.before === undefined ? undefined : toAuditJson(input.before),
      afterJson: input.after === undefined ? undefined : toAuditJson(input.after),
      reason: input.reason,
      ipAddress: input.ipAddress?.slice(0, 128) || null,
      userAgent: input.userAgent?.slice(0, 512) || null,
    },
  })
}
