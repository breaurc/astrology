/** Only local paths are accepted as post-login destinations (no open redirects). */
export function safeNextClient(next: string | null, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
