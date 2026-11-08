/**
 * Small helpers shared by the route handlers: JSON responses, client IP hashing, the caller's local date.
 */
import { createHash } from "node:crypto";
import { note } from "./context";
import { getSecret } from "./secret";

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/** A machine-readable failure the frontend maps to a gate or a message (HLD section 3). */
export function fail(status: number, error: string, extra: Record<string, unknown> = {}): Response {
  note({ code: typeof extra.reason === "string" ? `${error}:${extra.reason}` : error });
  return json({ error, ...extra }, status);
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite=Lax). */
export function sameOrigin(req: Request): boolean {
  const o = req.headers.get("origin");
  if (!o) return true; // same-origin fetches from older browsers / server-side calls
  try {
    return new URL(o).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host);
  } catch {
    return false;
  }
}

/** The visitor's address as seen through Cloudflare / Caddy; "local" when there is no header. */
export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? "local";
}

/** Daily-salted hash, so no raw IP is ever stored (HLD section 4). */
export function ipHash(ip: string, forDate: string): string {
  return createHash("sha256").update(`${getSecret()}|${forDate}|${ip}`).digest("base64url").slice(0, 32);
}

export function isZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The browser sends its IANA zone in X-Timezone so "today" and the daily quota follow local time (SPEC section 8). */
export function clientZone(req: Request): string {
  const z = req.headers.get("x-timezone") ?? "";
  return z && isZone(z) ? z : "UTC";
}

/** yyyy-mm-dd in a time zone. */
export function localDate(zone: string, at = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** ISO instant of the next local midnight in a zone (when the daily quota resets). */
export function nextMidnight(zone: string, at = new Date()): string {
  const today = localDate(zone, at);
  // Walk forward in hours until the local date changes, then back off to the minute. Cheap and DST-safe.
  let t = at.getTime();
  for (let i = 0; i < 30 && localDate(zone, new Date(t)) === today; i++) t += 3600_000;
  while (localDate(zone, new Date(t - 60_000)) !== today) t -= 60_000;
  return new Date(t).toISOString();
}

export function localeOf(v: unknown, fallback: "ro" | "en" = "ro"): "ro" | "en" {
  return v === "en" || v === "ro" ? v : fallback;
}

/** Only allow local paths as redirect destinations (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/ro/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
