/**
 * GET /api/me (HLD section 2): tier, credits, locale, profile summary and today's question quota.
 * Also the helper server components use to decide redirects (returning signed-in users land on /app).
 */
import { json } from "./request";
import { caller, meInfo } from "./tier";

export async function me(req: Request): Promise<Response> {
  return json(await meInfo(await caller(req)));
}

/** For server components: builds a Request from the incoming cookie header and resolves the caller. */
export async function meFromHeaders(h: { get(name: string): string | null }, url = "http://localhost/") {
  const req = new Request(url, { headers: { cookie: h.get("cookie") ?? "", "x-timezone": h.get("x-timezone") ?? "" } });
  return meInfo(await caller(req));
}
