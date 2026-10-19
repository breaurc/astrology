/**
 * Account API tests. Run: npm run test:auth   (needs Node 22+; uses node:test and tsx-free type stripping)
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.ASTRO_DATA_DIR = mkdtempSync(join(tmpdir(), "astro-test-"));
process.env.GOOGLE_CLIENT_ID = "g-id";
process.env.GOOGLE_CLIENT_SECRET = "g-secret";
process.env.FACEBOOK_CLIENT_ID = "f-id";
process.env.FACEBOOK_CLIENT_SECRET = "f-secret";

const BASE = "http://localhost:3000";
let A: typeof import("../src/lib/server/auth");

before(async () => {
  A = await import("../src/lib/server/auth");
});

function req(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("host", "localhost:3000");
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.body) headers.set("content-type", "application/json");
  return new Request(BASE + path, { ...init, headers });
}

/** Turns Set-Cookie headers into a Cookie header value. */
function cookies(res: Response, prev = ""): string {
  const jar = new Map(prev.split(/;\s*/).filter(Boolean).map((c) => [c.split("=")[0], c] as const));
  for (const sc of res.headers.getSetCookie()) {
    const kv = sc.split(";")[0];
    const name = kv.split("=")[0];
    if (/Max-Age=0/.test(sc)) jar.delete(name); else jar.set(name, kv);
  }
  return [...jar.values()].join("; ");
}

const PROFILE = {
  displayName: "Ana", birthName: "Ana Maria Pop", date: "1990-06-15", time: "08:30", timeAccuracy: "exact",
  place: { label: "Iași, România", latitude: 47.1585, longitude: 27.6014, zone: "Europe/Bucharest" },
  gender: "female", focus: ["LOVE", "CAREER", "NOPE"],
};

test("register → session → save profile → read back", async () => {
  const r = await A.register(req("/api/auth/register", { method: "POST",
    body: JSON.stringify({ email: "Ana@Example.com", password: "correct horse", name: "Ana", consent: true }) }));
  assert.equal(r.status, 201);
  const c = cookies(r);
  assert.match(c, /astro_session=/);
  assert.match(r.headers.get("set-cookie")!, /HttpOnly/);

  const s = await (await A.session(req("/api/auth/session", { cookie: c }))).json();
  assert.equal(s.user.email, "ana@example.com");
  assert.deepEqual(s.user.providers, ["password"]);
  assert.ok(s.user.consentAt);
  assert.equal(s.profile, null);

  const put = await A.putProfile(req("/api/profile", { method: "PUT", cookie: c, body: JSON.stringify({ profile: PROFILE }) }));
  assert.equal(put.status, 200);
  const saved = (await put.json()).profile;
  assert.deepEqual(saved.focus, ["LOVE", "CAREER"]); // unknown values dropped
  assert.equal(saved.place.zone, "Europe/Bucharest");

  const again = await (await A.getProfile(req("/api/profile", { cookie: c }))).json();
  assert.equal(again.profile.birthName, "Ana Maria Pop");
});

test("register rejects duplicates, weak passwords and missing consent", async () => {
  const dup = await A.register(req("/api/auth/register", { method: "POST",
    body: JSON.stringify({ email: "ana@example.com", password: "another pass", consent: true }) }));
  assert.equal(dup.status, 409);
  const weak = await A.register(req("/api/auth/register", { method: "POST",
    body: JSON.stringify({ email: "b@example.com", password: "short", consent: false }) }));
  assert.equal(weak.status, 400);
  assert.deepEqual((await weak.json()).fields, ["password", "consent"]);
});

test("login: wrong password 401, right password sets session, lockout after 5 failures", async () => {
  const bad = await A.login(req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "ana@example.com", password: "nope" }) }));
  assert.equal(bad.status, 401);
  const ok = await A.login(req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "ANA@example.com ", password: "correct horse" }) }));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).profile.displayName, "Ana");

  for (let i = 0; i < 5; i++) {
    await A.login(req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "x@example.com", password: "nope" }) }));
  }
  const locked = await A.login(req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "x@example.com", password: "nope" }) }));
  assert.equal(locked.status, 429);
});

test("tampered or missing session is anonymous; cross-origin writes are refused", async () => {
  const s = await (await A.session(req("/api/auth/session", { cookie: "astro_session=eyJ1aWQiOiJ4In0.forged" }))).json();
  assert.equal(s.user, null);
  assert.equal((await A.getProfile(req("/api/profile"))).status, 401);
  const csrf = await A.login(req("/api/auth/login", { method: "POST", headers: { origin: "https://evil.example" },
    body: JSON.stringify({ email: "ana@example.com", password: "correct horse" }) }));
  assert.equal(csrf.status, 403);
});

test("profile validation", async () => {
  const r = await A.register(req("/api/auth/register", { method: "POST",
    body: JSON.stringify({ email: "v@example.com", password: "password123", consent: true }) }));
  const c = cookies(r);
  const bad = await A.putProfile(req("/api/profile", { method: "PUT", cookie: c, body: JSON.stringify({
    profile: { ...PROFILE, date: "1990-02-30", time: "25:00", place: { label: "", latitude: 200, longitude: 0, zone: "Mars/Olympus" } } }) }));
  assert.equal(bad.status, 400);
  assert.deepEqual((await bad.json()).fields, ["date", "time", "place", "latitude", "zone"]);
  const unknownTime = await A.putProfile(req("/api/profile", { method: "PUT", cookie: c, body: JSON.stringify({
    profile: { ...PROFILE, time: "garbage", timeAccuracy: "unknown" } }) }));
  assert.equal((await unknownTime.json()).profile.time, null);
});

test("safeNext blocks open redirects", () => {
  assert.equal(A.safeNext("/en/me"), "/en/me");
  assert.equal(A.safeNext("//evil.com"), "/ro/me");
  assert.equal(A.safeNext("https://evil.com"), "/ro/me");
  assert.equal(A.safeNext("/\\evil.com"), "/ro/me");
});

// ---------- OAuth with mocked providers ----------

function mockFetch(handlers: Record<string, (url: URL, init?: RequestInit) => unknown>) {
  const real = globalThis.fetch;
  const calls: { url: URL; init?: RequestInit }[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    calls.push({ url, init });
    const key = Object.keys(handlers).find((k) => url.href.startsWith(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return Response.json(handlers[key](url, init));
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = real; } };
}

async function oauthRoundTrip(provider: "google" | "facebook", next = "/en/me?welcome=1") {
  const start = await A.oauthStart(req(`/api/auth/${provider}/start?next=${encodeURIComponent(next)}&consent=1`), provider);
  assert.equal(start.status, 302);
  const loc = new URL(start.headers.get("location")!);
  const c = cookies(start);
  const state = loc.searchParams.get("state")!;
  const cb = await A.oauthCallback(req(`/api/auth/${provider}/callback?code=abc&state=${state}`, { cookie: c }), provider);
  return { start: loc, cb, cookie: cookies(cb, c) };
}

test("Google: PKCE + state, verified email links to the existing password account", async () => {
  const m = mockFetch({
    "https://oauth2.googleapis.com/token": () => ({ access_token: "g-at" }),
    "https://openidconnect.googleapis.com/v1/userinfo": () => ({ sub: "g-123", email: "ana@example.com", email_verified: true, name: "Ana G" }),
  });
  try {
    const { start, cb, cookie } = await oauthRoundTrip("google");
    assert.equal(start.origin + start.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(start.searchParams.get("redirect_uri"), "http://localhost:3000/api/auth/google/callback");
    assert.equal(start.searchParams.get("code_challenge_method"), "S256");
    assert.equal(cb.status, 302);
    assert.equal(cb.headers.get("location"), "http://localhost:3000/en/me?welcome=1");
    const tokenBody = new URLSearchParams(String(m.calls[0].init?.body));
    assert.equal(tokenBody.get("code"), "abc");
    assert.ok(tokenBody.get("code_verifier")!.length > 40);

    const s = await (await A.session(req("/api/auth/session", { cookie }))).json();
    assert.equal(s.user.email, "ana@example.com");
    assert.deepEqual(s.user.providers, ["password", "google"]);
    assert.equal(s.profile.displayName, "Ana"); // same account, profile kept
  } finally {
    m.restore();
  }
});

test("Facebook: new account, consent recorded, wrong state rejected", async () => {
  const m = mockFetch({
    "https://graph.facebook.com/v23.0/oauth/access_token": () => ({ access_token: "f-at" }),
    "https://graph.facebook.com/v23.0/me": () => ({ id: "f-9", name: "Ion Fb" }), // no email permission granted
  });
  try {
    const { start, cb, cookie } = await oauthRoundTrip("facebook", "/ro/me");
    assert.equal(start.hostname, "www.facebook.com");
    assert.equal(start.searchParams.get("code_challenge"), null);
    assert.equal(cb.headers.get("location"), "http://localhost:3000/ro/me");
    const s = await (await A.session(req("/api/auth/session", { cookie }))).json();
    assert.equal(s.user.name, "Ion Fb");
    assert.equal(s.user.email, undefined);
    assert.deepEqual(s.user.providers, ["facebook"]);
    assert.ok(s.user.consentAt);

    // second login with same Facebook id → same user
    const again = await oauthRoundTrip("facebook", "/ro/me");
    const s2 = await (await A.session(req("/api/auth/session", { cookie: again.cookie }))).json();
    assert.equal(s2.user.id, s.user.id);

    const st = await A.oauthStart(req("/api/auth/facebook/start?next=/ro/me"), "facebook");
    const bad = await A.oauthCallback(req("/api/auth/facebook/callback?code=x&state=wrong", { cookie: cookies(st) }), "facebook");
    assert.equal(bad.headers.get("location"), "http://localhost:3000/ro/login?error=state");
  } finally {
    m.restore();
  }
});

test("unverified Google email does not take over an existing account", async () => {
  const m = mockFetch({
    "https://oauth2.googleapis.com/token": () => ({ access_token: "g-at" }),
    "https://openidconnect.googleapis.com/v1/userinfo": () => ({ sub: "g-evil", email: "ana@example.com", email_verified: false }),
  });
  try {
    const { cookie } = await oauthRoundTrip("google");
    const s = await (await A.session(req("/api/auth/session", { cookie }))).json();
    assert.deepEqual(s.user.providers, ["google"]);
    assert.equal(s.user.email, undefined);
    assert.equal(s.profile, null);
  } finally {
    m.restore();
  }
});

test("unconfigured provider redirects back to login", async () => {
  delete process.env.FACEBOOK_CLIENT_ID;
  const r = await A.oauthStart(req("/api/auth/facebook/start?next=/en/me"), "facebook");
  assert.equal(r.headers.get("location"), "http://localhost:3000/en/login?error=provider");
  assert.deepEqual(await A.providers().json(), { google: true, facebook: false });
});

test("export omits the password hash; delete erases the account and clears the cookie", async () => {
  const r = await A.login(req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "ana@example.com", password: "correct horse" }) }));
  const c = cookies(r);
  const ex = await A.exportAccount(req("/api/account", { cookie: c }));
  const text = await ex.text();
  assert.doesNotMatch(text, /scrypt\$/);
  assert.match(ex.headers.get("content-disposition")!, /attachment/);
  const del = await A.deleteAccount(req("/api/account", { method: "DELETE", cookie: c }));
  assert.equal(del.status, 200);
  assert.match(del.headers.get("set-cookie")!, /Max-Age=0/);
  const s = await (await A.session(req("/api/auth/session", { cookie: c }))).json();
  assert.equal(s.user, null);
  const relogin = await A.login(req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "ana@example.com", password: "correct horse" }) }));
  assert.equal(relogin.status, 401);
});
