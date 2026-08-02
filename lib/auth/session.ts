import { auth } from "@/auth"
import { hasValidSessionUserId } from "@/lib/auth/session-guards"

export { hasValidSessionUserId } from "@/lib/auth/session-guards"

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

/** Require a non-empty authenticated user id for server actions / RSC. */
export async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!hasValidSessionUserId(session)) {
    throw new UnauthorizedError()
  }
  return session!.user!.id.trim()
}
