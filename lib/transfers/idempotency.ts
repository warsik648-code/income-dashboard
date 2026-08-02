/**
 * Idempotency key lifecycle for transfer submissions.
 * - Keep the same key while a submit is in-flight or after a failed attempt (retry).
 * - Rotate only after a confirmed success so the next legitimate transfer is new.
 */
export function nextTransferIdempotencyKey(input: {
  outcome: "success" | "error" | "inflight"
  currentKey: string
  generate: () => string
}): string {
  if (input.outcome === "success") return input.generate()
  return input.currentKey
}
