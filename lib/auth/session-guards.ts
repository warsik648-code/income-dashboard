export function hasValidSessionUserId(
  session: { user?: { id?: string | null } | null } | null | undefined
): boolean {
  return Boolean(session?.user?.id?.trim())
}
