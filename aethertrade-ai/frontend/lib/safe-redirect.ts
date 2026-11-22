/**
 * Only allow same-origin, path-only redirect targets after login (prevents open redirects such as
 * `/login?next=https://evil.example` or `//evil.example`).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/api/")) {
    return fallback;
  }
  return next;
}
