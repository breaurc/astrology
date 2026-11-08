/**
 * One log line per API request: request id, method, route, status, duration, tier and the failure code when
 * there is one. The id is forwarded to the engine (X-Request-Id) and returned to the client, so a problem can
 * be followed across the web and engine logs. No IP address and no user id are logged (HLD section 4).
 */
import { note, requestContext, requestIdFrom, runWithContext } from "./context";
import { metrics } from "./metrics";
import { fail } from "./request";

type Handler<A extends unknown[]> = (req: Request, ...args: A) => Response | Promise<Response>;

/** Replaces ids and tokens in a path so the route label has a bounded cardinality. */
export function routeLabel(req: Request): string {
  let path: string;
  try {
    path = new URL(req.url).pathname;
  } catch {
    path = "/";
  }
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/[A-Za-z0-9_-]{32,}/g, "/:token");
}

export function logged<A extends unknown[]>(fn: Handler<A>): (req: Request, ...args: A) => Promise<Response> {
  return (req, ...args) => {
    const ctx = { id: requestIdFrom(req) };
    const route = routeLabel(req);
    const started = performance.now();
    return runWithContext(ctx, async () => {
      let res: Response;
      try {
        res = await fn(req, ...args);
      } catch (e) {
        console.error(`[req] id=${ctx.id} ${req.method} ${route} threw`, e);
        res = fail(500, "generic");
      }
      const ms = Math.round(performance.now() - started);
      const c = requestContext()!;
      metrics.inc("http", { route, status: String(res.status) });
      console.log(`[req] id=${c.id} ${req.method} ${route} ${res.status} ${ms}ms tier=${c.tier ?? "-"}${c.code ? ` code=${c.code}` : ""}`);
      return withRequestId(res, c.id);
    });
  };
}

function withRequestId(res: Response, id: string): Response {
  try {
    res.headers.set("X-Request-Id", id);
    return res;
  } catch {
    // Redirect responses have immutable headers; copy them.
    const copy = new Response(res.body, res);
    copy.headers.set("X-Request-Id", id);
    return copy;
  }
}

export { note };
