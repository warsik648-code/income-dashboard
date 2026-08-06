/** Plain-text mask for contexts that cannot host React nodes (e.g. <option>). */
export function maskSensitivePlain(enabled: boolean, value: string): string {
  if (!enabled) return value
  return "••••••"
}
