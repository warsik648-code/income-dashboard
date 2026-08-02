import { prisma } from "@/lib/db"

export type AuditLogListItem = {
  id: string
  entityType: string
  entityId: string
  action: string
  reason: string | null
  ipAddress: string | null
  createdAt: Date
}

export async function listAuditLogs(
  userId: string,
  options?: { limit?: number }
): Promise<AuditLogListItem[]> {
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500)

  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      entityType: true,
      entityId: true,
      action: true,
      reason: true,
      ipAddress: true,
      createdAt: true,
    },
  })
}
