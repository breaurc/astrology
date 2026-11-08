/**
 * Per-request context (request id, resolved tier, failure code) carried through async calls, so the engine
 * client can forward the id and the request log line can report the tier without threading parameters.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";

export interface RequestContext {
  id: string;
  tier?: string;
  code?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function requestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Records something about the current request (no-op outside a logged handler, e.g. in unit tests). */
export function note(partial: Partial<RequestContext>): void {
  const c = storage.getStore();
  if (c) Object.assign(c, partial);
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Reuses the Cloudflare ray id when the request came through Cloudflare, otherwise makes a short id. */
export function requestIdFrom(req: Request): string {
  const ray = req.headers.get("cf-ray");
  if (ray && /^[A-Za-z0-9-]{1,40}$/.test(ray)) return ray;
  return randomBytes(6).toString("hex");
}
