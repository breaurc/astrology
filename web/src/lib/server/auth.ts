/**
 * Account API: email/password with verification link, Google and Facebook sign-in, session cookie, profile,
 * language and GDPR endpoints (SPEC section 5). Every function takes a standard Request and returns a standard
 * Response, so it runs the same inside Next.js route handlers and in plain Node tests.
 */
import { validateProfile, type SessionInfo } from "../profile";
import { cfg } from "./config";
import { hashPassword, pkceChallenge, randomToken, sign, unsign, verifyPassword } from "./crypto";
import { sendMail } from "./mailer";
import { body, clientIp, fail, ipHash, json, localDate, localeOf, safeNext, sameOrigin } from "./request";
import { store, toPublic, type Identity, type UserRecord } from "./store";

export { safeNext };

const SESSION_COOKIE = "astro_session";
const OAUTH_COOKIE = "astro_oauth";
const SESSION_DAYS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- cookies ----------

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

/** Public origin of the site, used to build OAuth redirect URIs and email links. APP_URL wins behind a proxy. */
export function origin(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${isHttps(req) ? "https" : "http"}://${host}`;
}

function localePath(path: string): "ro" | "en" {
  return path.startsWith("/en") ? "en" : "ro";
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

/** The signed-in user for a request, or null. Also used by server components through a synthetic Request. */
export async function currentUser(req: Request): Promise<UserRecord | null> {
  const s = unsign<Session>(readCookie(req, SESSION_COOKIE));
  if (!s || typeof s.uid !== "string" || s.exp < Date.now()) return null;
  const u = (await store.byId(s.uid)) ?? null;
  if (u && (u.lastSeenAt ?? "").slice(0, 10) !== new Date().toISOString().slice(0, 10)) await store.touch(u.id);
  return u;
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

async function sendVerification(req: Request, u: UserRecord, token: string, next: string) {
  const locale = u.locale ?? localePath(next);
  const link = `${origin(req)}/api/auth/verify?${new URLSearchParams({ token, next })}`;
  const ro = locale === "ro";
  await sendMail({
    to: u.email!,
    subject: ro ? "Confirmă adresa de email · Cosmic Triad" : "Confirm your email · Cosmic Triad",
    text: ro
      ? `Bună${u.name ? `, ${u.name}` : ""}!\n\nApasă pe link ca să-ți activezi contul Cosmic Triad (valabil 24 de ore):\n${link}\n\nDacă nu tu ai cerut asta, ignoră mesajul.`
      : `Hello${u.name ? `, ${u.name}` : ""}!\n\nClick the link to activate your Cosmic Triad account (valid for 24 hours):\n${link}\n\nIf you did not ask for this, ignore this message.`,
  });
  return link;
}

/**
 * POST /api/auth/register { email, password, name?, consent, locale?, next? }
 * Creates the account and sends the verification link; no session until the link is opened (SPEC section 5).
 * In development without a mail provider the link is also returned so the flow can be completed locally.
 */
export async function register(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const b = await body(req);
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 60) : undefined;
  const errors: string[] = [];
  if (!EMAIL_RE.test(email) || email.length > 200) errors.push("email");
  if (password.length < 8 || password.length > 200) errors.push("password");
  if (b.consent !== true) errors.push("consent");
  if (errors.length) return fail(400, "validation", { fields: errors });

  const today = localDate("UTC");
  if (!(await store.countSignup(ipHash(clientIp(req), today), today, cfg.signupsPerIp))) {
    return fail(429, "quota", { reason: "signups" });
  }
  const token = randomToken(32);
  const user = await store.createWithPassword(email, await hashPassword(password), name, true, token, localeOf(b.locale));
  if (!user) return fail(409, "email_taken");
  const next = safeNext(typeof b.next === "string" ? b.next : null, `/${user.locale ?? "ro"}/app`);
  const link = await sendVerification(req, user, token, next);
  return json({ verification: "sent", email: user.email, ...(cfg.isProd ? {} : { devVerifyUrl: link }) }, 202);
}

/** POST /api/auth/resend { email } → sends a new link when the account exists and is unverified. Always 200. */
export async function resendVerification(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const b = await body(req);
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const u = email ? await store.byEmail(email) : undefined;
  if (u && u.emailVerified === false && u.passwordHash) {
    const token = randomToken(32);
    await store.renewVerifyToken(u.id, token);
    const next = safeNext(typeof b.next === "string" ? b.next : null, `/${u.locale ?? "ro"}/app`);
    const link = await sendVerification(req, u, token, next);
    return json({ verification: "sent", ...(cfg.isProd ? {} : { devVerifyUrl: link }) });
  }
  return json({ verification: "sent" });
}

/** GET /api/auth/verify?token&next → activates the account, signs in and redirects. */
export async function verifyEmail(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const next = safeNext(url.searchParams.get("next"), "/ro/app");
  const locale = localePath(next);
  const back = (reason: string) => Response.redirect(`${origin(req)}/${locale}/login?error=${reason}`, 302);
  if (!token) return back("verify_invalid");
  const u = await store.verifyEmail(token);
  if (!u) return back("verify_invalid");
  if (u === "expired") return back("verify_expired");
  return new Response(null, { status: 302, headers: { Location: `${origin(req)}${next}`, "Set-Cookie": sessionCookie(req, u.id) } });
}

export async function login(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const b = await body(req);
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const key = `login:${email}`;
  if (tooManyAttempts(key)) return fail(429, "too_many_attempts");
  const user = email ? await store.byEmail(email) : undefined;
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    recordFailure(key);
    return fail(401, "invalid_credentials");
  }
  // Accounts created before verification existed have no flag and stay valid; only an explicit false blocks.
  if (user.emailVerified === false) return fail(403, "email_unverified", { email: user.email });
  failures.delete(key);
  await store.touch(user.id);
  return json(sessionInfo(user), 200, { "Set-Cookie": sessionCookie(req, user.id) });
}

export async function logout(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  return json({ ok: true }, 200, { "Set-Cookie": clearSession(req) });
}

/** GET /api/auth/session (legacy shape). The funnel uses GET /api/me. */
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

/** Google / Facebook sign-in is hidden unless SOCIAL_LOGIN=on (and the provider's keys are set). */
function socialEnabled(): boolean {
  return process.env.SOCIAL_LOGIN === "on";
}

function provider(id: string): ProviderConfig | null {
  if (!socialEnabled()) return null;
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

/** GET /api/auth/{provider}/start?next=/ro/app&consent=1 → redirects to the provider. */
export async function oauthStart(req: Request, id: string): Promise<Response> {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const p = provider(id);
  if (!p) return Response.redirect(`${origin(req)}/${localePath(next)}/login?error=provider`, 302);
  if (url.searchParams.get("consent") !== "1") {
    // The account is not created until consent is ticked (SPEC section 5).
    return Response.redirect(`${origin(req)}/${localePath(next)}/login?error=consent`, 302);
  }
  const st: OAuthState = { p: id as ProviderId, state: randomToken(24), verifier: randomToken(48), next,
    consent: true, exp: Date.now() + 10 * 60_000 };
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
  const failTo = (reason: string) => new Response(null, {
    status: 302,
    headers: { Location: `${origin(req)}/${localePath(st?.next ?? "/ro")}/login?error=${reason}`,
      "Set-Cookie": cookie(req, OAUTH_COOKIE, "", 0, "/api/auth") },
  });
  const p = provider(id);
  if (!p || !st || st.p !== id || st.exp < Date.now()) return failTo("expired");
  if (url.searchParams.get("error")) return failTo("cancelled");
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== st.state) return failTo("state");

  let info;
  try {
    info = await p.fetchProfile(code, `${origin(req)}/api/auth/${id}/callback`, st.verifier);
  } catch (e) {
    console.error("[auth] OAuth exchange failed:", e);
    return failTo("oauth");
  }
  const identity: Identity = { provider: id as ProviderId, subject: info.subject };
  const user = await store.upsertOAuth(identity, info, st.consent, localePath(st.next));
  const headers = new Headers({ Location: `${origin(req)}${safeNext(st.next)}` });
  headers.append("Set-Cookie", sessionCookie(req, user.id));
  headers.append("Set-Cookie", cookie(req, OAUTH_COOKIE, "", 0, "/api/auth"));
  return new Response(null, { status: 302, headers });
}

// ---------- profile, language + GDPR ----------

export async function getProfile(req: Request): Promise<Response> {
  const u = await currentUser(req);
  if (!u) return fail(401, "unauthorized", { reason: "sign_in" });
  return json(sessionInfo(u));
}

/** PUT /api/profile { profile, consent } (HLD: PUT /me/birth-data) */
export async function putProfile(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const u = await currentUser(req);
  if (!u) return fail(401, "unauthorized", { reason: "sign_in" });
  const b = await body(req);
  const v = validateProfile(b.profile);
  if (!v.ok) return fail(400, "validation", { fields: v.errors });
  const saved = await store.saveProfile(u.id, v.profile, b.consent === true);
  if (saved === "consent") return fail(400, "consent_required");
  if (!saved) return fail(401, "unauthorized");
  return json(sessionInfo(saved));
}

/** DELETE /api/profile → withdraws consent: erases the birth data, keeps the account (GDPR art. 7(3), 17). */
export async function deleteProfile(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const u = await currentUser(req);
  if (!u) return fail(401, "unauthorized", { reason: "sign_in" });
  const after = await store.withdraw(u.id);
  return json(sessionInfo(after));
}

/** PUT /api/me/locale { locale } → remembers the language per account (SPEC section 8). */
export async function putLocale(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const u = await currentUser(req);
  if (!u) return fail(401, "unauthorized", { reason: "sign_in" });
  const b = await body(req);
  if (b.locale !== "ro" && b.locale !== "en") return fail(400, "validation", { fields: ["locale"] });
  await store.setLocale(u.id, b.locale);
  return json({ locale: b.locale });
}

/** GET /api/account → everything we store about the person, as a download (GDPR art. 15/20). */
export async function exportAccount(req: Request): Promise<Response> {
  const u = await currentUser(req);
  if (!u) return fail(401, "unauthorized", { reason: "sign_in" });
  const data = await store.exportOf(u.id);
  if (!data) return fail(401, "unauthorized");
  const { passwordHash, verifyToken: _t, ...account } = data.user;
  return json({
    exportedAt: new Date().toISOString(),
    account: { ...account, hasPassword: !!passwordHash },
    questions: data.questions,
    threads: data.threads,
    messages: data.messages,
    credits: data.ledger,
  }, 200, { "Content-Disposition": `attachment; filename="cosmictriad-my-data.json"` });
}

/** DELETE /api/account → erases the account, profile, history, threads and ledger (GDPR art. 17). */
export async function deleteAccount(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const u = await currentUser(req);
  if (!u) return fail(401, "unauthorized", { reason: "sign_in" });
  await store.remove(u.id);
  return json({ ok: true }, 200, { "Set-Cookie": clearSession(req) });
}
