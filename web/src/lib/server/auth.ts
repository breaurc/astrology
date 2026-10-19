/**
 * Account API: email/password, Google and Facebook sign-in, session cookie, profile and GDPR endpoints.
 * Every function takes a standard Request and returns a standard Response, so it runs the same inside Next.js
 * route handlers and in plain Node tests.
 */
import { validateProfile, type SessionInfo } from "../profile";
import { hashPassword, pkceChallenge, randomToken, sign, unsign, verifyPassword } from "./crypto";
import { store, toPublic, type Identity, type UserRecord } from "./store";

const SESSION_COOKIE = "astro_session";
const OAUTH_COOKIE = "astro_oauth";
const SESSION_DAYS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- small HTTP helpers ----------

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}

function isHttps(req: Request): boolean {
  return (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "")) === "https";
}

function cookie(req: Request, name: string, value: string, maxAgeSec: number, path = "/"): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `Max-Age=${maxAgeSec}`, "HttpOnly", "SameSite=Lax"];
  if (isHttps(req)) parts.push("Secure");
  return parts.join("; ");
}

/** Public origin of the site, used to build OAuth redirect URIs. APP_URL wins when the app sits behind a proxy. */
function origin(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${isHttps(req) ? "https" : "http"}://${host}`;
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite=Lax). */
function sameOrigin(req: Request): boolean {
  const o = req.headers.get("origin");
  if (!o) return true; // same-origin fetches from older browsers / server-side calls
  try {
    return new URL(o).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host);
  } catch {
    return false;
  }
}

/** Only allow local paths as post-login destinations (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/ro/me"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

function localeOf(path: string): string {
  return path.startsWith("/en") ? "en" : "ro";
}

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// ---------- session ----------

interface Session { uid: string; exp: number; }

function sessionCookie(req: Request, uid: string): string {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  return cookie(req, SESSION_COOKIE, sign({ uid, exp } satisfies Session), SESSION_DAYS * 86400);
}

function clearSession(req: Request): string {
  return cookie(req, SESSION_COOKIE, "", 0);
}

export async function currentUser(req: Request): Promise<UserRecord | null> {
  const s = unsign<Session>(readCookie(req, SESSION_COOKIE));
  if (!s || typeof s.uid !== "string" || s.exp < Date.now()) return null;
  return (await store.byId(s.uid)) ?? null;
}

function sessionInfo(u: UserRecord | null): SessionInfo {
  return { user: u ? toPublic(u) : null, profile: u?.profile ?? null };
}

// ---------- brute-force guard (per process; use Redis when running several instances) ----------

const failures = new Map<string, { n: number; until: number }>();
function tooManyAttempts(key: string): boolean {
  const f = failures.get(key);
  return !!f && f.n >= 5 && f.until > Date.now();
}
function recordFailure(key: string) {
  const f = failures.get(key);
  const until = Date.now() + 15 * 60_000;
  failures.set(key, { n: f && f.until > Date.now() ? f.n + 1 : 1, until });
}

// ---------- email + password ----------

export async function register(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const b = await body(req);
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 60) : undefined;
  const errors: string[] = [];
  if (!EMAIL_RE.test(email) || email.length > 200) errors.push("email");
  if (password.length < 8 || password.length > 200) errors.push("password");
  if (b.consent !== true) errors.push("consent");
  if (errors.length) return json({ error: "validation", fields: errors }, 400);

  const user = await store.createWithPassword(email, await hashPassword(password), name, true);
  if (!user) return json({ error: "email_taken" }, 409);
  return json(sessionInfo(user), 201, { "Set-Cookie": sessionCookie(req, user.id) });
}

export async function login(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const b = await body(req);
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const key = `login:${email}`;
  if (tooManyAttempts(key)) return json({ error: "too_many_attempts" }, 429);
  const user = email ? await store.byEmail(email) : undefined;
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    recordFailure(key);
    return json({ error: "invalid_credentials" }, 401);
  }
  failures.delete(key);
  return json(sessionInfo(user), 200, { "Set-Cookie": sessionCookie(req, user.id) });
}

export async function logout(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  return json({ ok: true }, 200, { "Set-Cookie": clearSession(req) });
}

export async function session(req: Request): Promise<Response> {
  return json(sessionInfo(await currentUser(req)));
}

// ---------- OAuth (authorization code; PKCE where the provider supports it) ----------

type ProviderId = "google" | "facebook";

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  scope: string;
  pkce: boolean;
  fetchProfile(code: string, redirectUri: string, verifier: string): Promise<{ subject: string; email?: string; emailVerified: boolean; name?: string }>;
}

function provider(id: string): ProviderConfig | null {
  if (id === "google" && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    return {
      clientId, clientSecret, pkce: true, scope: "openid email profile",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      async fetchProfile(code, redirectUri, verifier) {
        const tok = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri,
            grant_type: "authorization_code", code_verifier: verifier }),
        });
        if (!tok.ok) throw new Error(`google token ${tok.status}`);
        const { access_token } = (await tok.json()) as { access_token: string };
        const me = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
        if (!me.ok) throw new Error(`google userinfo ${me.status}`);
        const p = (await me.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
        return { subject: p.sub, email: p.email, emailVerified: p.email_verified === true, name: p.name };
      },
    };
  }
  if (id === "facebook" && process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    const v = process.env.FACEBOOK_GRAPH_VERSION || "v23.0";
    return {
      clientId, clientSecret, pkce: false, scope: "public_profile,email",
      authorizeUrl: `https://www.facebook.com/${v}/dialog/oauth`,
      async fetchProfile(code, redirectUri) {
        const q = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code });
        const tok = await fetch(`https://graph.facebook.com/${v}/oauth/access_token?${q}`);
        if (!tok.ok) throw new Error(`facebook token ${tok.status}`);
        const { access_token } = (await tok.json()) as { access_token: string };
        const me = await fetch(`https://graph.facebook.com/${v}/me?${new URLSearchParams({ fields: "id,name,email", access_token })}`);
        if (!me.ok) throw new Error(`facebook me ${me.status}`);
        const p = (await me.json()) as { id: string; name?: string; email?: string };
        // Facebook only returns the account's confirmed primary address.
        return { subject: p.id, email: p.email, emailVerified: !!p.email, name: p.name };
      },
    };
  }
  return null;
}

export function providers(): Response {
  return json({ google: !!provider("google"), facebook: !!provider("facebook") });
}

interface OAuthState { p: ProviderId; state: string; verifier: string; next: string; consent: boolean; exp: number; }

/** GET /api/auth/{provider}/start?next=/ro/me&consent=1 → redirects to the provider. */
export async function oauthStart(req: Request, id: string): Promise<Response> {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const p = provider(id);
  if (!p) return Response.redirect(`${origin(req)}/${localeOf(next)}/login?error=provider`, 302);
  const st: OAuthState = { p: id as ProviderId, state: randomToken(24), verifier: randomToken(48), next,
    consent: url.searchParams.get("consent") === "1", exp: Date.now() + 10 * 60_000 };
  const params = new URLSearchParams({ client_id: p.clientId, redirect_uri: `${origin(req)}/api/auth/${id}/callback`,
    response_type: "code", scope: p.scope, state: st.state });
  if (p.pkce) {
    params.set("code_challenge", pkceChallenge(st.verifier));
    params.set("code_challenge_method", "S256");
  }
  if (id === "google") params.set("prompt", "select_account");
  return new Response(null, {
    status: 302,
    headers: { Location: `${p.authorizeUrl}?${params}`, "Set-Cookie": cookie(req, OAUTH_COOKIE, sign(st), 600, "/api/auth") },
  });
}

/** GET /api/auth/{provider}/callback?code&state → signs the user in and returns to `next`. */
export async function oauthCallback(req: Request, id: string): Promise<Response> {
  const url = new URL(req.url);
  const st = unsign<OAuthState>(readCookie(req, OAUTH_COOKIE));
  const fail = (reason: string) => new Response(null, {
    status: 302,
    headers: { Location: `${origin(req)}/${localeOf(st?.next ?? "/ro")}/login?error=${reason}`,
      "Set-Cookie": cookie(req, OAUTH_COOKIE, "", 0, "/api/auth") },
  });
  const p = provider(id);
  if (!p || !st || st.p !== id || st.exp < Date.now()) return fail("expired");
  if (url.searchParams.get("error")) return fail("cancelled");
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== st.state) return fail("state");

  let info;
  try {
    info = await p.fetchProfile(code, `${origin(req)}/api/auth/${id}/callback`, st.verifier);
  } catch (e) {
    console.error("[auth] OAuth exchange failed:", e);
    return fail("oauth");
  }
  const identity: Identity = { provider: id as ProviderId, subject: info.subject };
  const user = await store.upsertOAuth(identity, info, st.consent);
  const headers = new Headers({ Location: `${origin(req)}${safeNext(st.next)}` });
  headers.append("Set-Cookie", sessionCookie(req, user.id));
  headers.append("Set-Cookie", cookie(req, OAUTH_COOKIE, "", 0, "/api/auth"));
  return new Response(null, { status: 302, headers });
}

// ---------- profile + GDPR ----------

export async function getProfile(req: Request): Promise<Response> {
  const u = await currentUser(req);
  if (!u) return json({ error: "unauthorized" }, 401);
  return json(sessionInfo(u));
}

/** PUT /api/profile { profile, consent } */
export async function putProfile(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const u = await currentUser(req);
  if (!u) return json({ error: "unauthorized" }, 401);
  const b = await body(req);
  const v = validateProfile(b.profile);
  if (!v.ok) return json({ error: "validation", fields: v.errors }, 400);
  const saved = await store.saveProfile(u.id, v.profile, b.consent === true);
  if (saved === "consent") return json({ error: "consent_required" }, 400);
  if (!saved) return json({ error: "unauthorized" }, 401);
  return json(sessionInfo(saved));
}

/** GET /api/account → everything we store about the person, as a download (GDPR art. 15/20). */
export async function exportAccount(req: Request): Promise<Response> {
  const u = await currentUser(req);
  if (!u) return json({ error: "unauthorized" }, 401);
  const { passwordHash: _omit, ...data } = u;
  return json({ exportedAt: new Date().toISOString(), account: { ...data, hasPassword: !!_omit } }, 200, {
    "Content-Disposition": `attachment; filename="astro-my-data.json"`,
  });
}

/** DELETE /api/account → erases the account and profile (GDPR art. 17). */
export async function deleteAccount(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const u = await currentUser(req);
  if (!u) return json({ error: "unauthorized" }, 401);
  await store.remove(u.id);
  return json({ ok: true }, 200, { "Set-Cookie": clearSession(req) });
}
