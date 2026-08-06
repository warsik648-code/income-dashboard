import { prisma } from "@/lib/db"
import { writeAuditLog } from "@/lib/services/audit"

export async function getStreamerMode(userId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { streamerMode: true },
  })
  // Missing user → treat as off (do not throw from layout reads).
  return user?.streamerMode === true
}

export async function setStreamerMode(
  userId: string,
  enabled: boolean
): Promise<boolean> {
  // Accept explicit boolean only (including false). Never truthy-check `enabled`.
  if (enabled !== true && enabled !== false) {
    throw new Error("streamerMode must be a boolean")
  }

  return prisma.$transaction(async (tx) => {
    const before = await tx.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, streamerMode: true },
    })
    if (!before) {
      throw new Error("User not found.")
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { streamerMode: enabled },
      select: { streamerMode: true },
    })

    await writeAuditLog(tx, {
      userId,
      entityType: "User",
      entityId: userId,
      action: "UPDATE",
      before: { streamerMode: before.streamerMode },
      after: { streamerMode: updated.streamerMode },
      reason:
        enabled === true ? "Streamer Mode enabled" : "Streamer Mode disabled",
    })

    return updated.streamerMode === true
  })
}
