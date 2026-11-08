/**
 * The three tiers end to end, with the engine replaced by fakes: free readings and the IP quota, the sign-in
 * gate, the daily question, credits + threads, and the Stripe webhook. Run: npx tsx --test tests/funnel.test.ts
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.ASTRO_DATA_DIR = mkdtempSync(join(tmpdir(), "astro-funnel-"));
process.env.FREE_READINGS_PER_IP = "2";
process.env.MESSAGE_CAP = "2";
process.env.MAX_CHARS = "40";
process.env.SIGNUPS_PER_IP = "2";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

const BASE = "http://localhost:3000";
let A: typeof import("../src/lib/server/auth");
let F: typeof import("../src/lib/server/features");
let C: typeof import("../src/lib/server/credits");
let M: typeof import("../src/lib/server/me");
let E: typeof import("../src/lib/server/engine");
let O: typeof import("../src/lib/server/ops");
let L: typeof import("../src/lib/server/log");
let X: typeof import("../src/lib/server/context");

before(async () => {
  A = await import("../src/lib/server/auth");
  F = await import("../src/lib/server/features");
  C = await import("../src/lib/server/credits");
  M = await import("../src/lib/server/me");
  E = await import("../src/lib/server/engine");
  O = await import("../src/lib/server/ops");
  L = await import("../src/lib/server/log");
  X = await import("../src/lib/server/context");
  // Fake engine: deterministic answers, no network.
  E.engine.reading = async (birth, system, date, locale) => ({
    system, date, facts: { sunSign: "GEMINI" }, score: 7, verdict: "GOOD", reasons: [], text: `${locale} reading for ${birth.date}`,
    narrator: "template", disclaimer: "fun", usage: null,
  });
  E.engine.calendar = async (_b, from, days) => ({
    from, days: Array.from({ length: days }, (_, i) => ({ date: addDays(from, i), score: 6, verdict: "MIXED", good: ["LOVE"], avoid: ["MONEY"], scores: {}, reasons: [] })),
  });
  E.engine.ask = async (_b, question, date) => ({
    question, date, category: "LOVE", score: 8, verdict: "GOOD", reasons: [], text: "Yes 8/10", narrator: "llm", guardrail: "NONE", disclaimer: "fun",
    usage: { model: "fake", tokensIn: 10, tokensOut: 20, latencyMs: 5 },
  });
  E.engine.chat = async (_b, _d, _l, history, message) => ({
    text: `reply #${history.length / 2 + 1} to "${message}"`, narrator: "llm", guardrail: "NONE", category: "GENERAL", disclaimer: "fun", usage: null,
  });
});

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function req(path: string, init: RequestInit & { cookie?: string; ip?: string; tz?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("host", "localhost:3000");
  headers.set("x-forwarded-for", init.ip ?? "203.0.113.7");
  headers.set("x-timezone", init.tz ?? "Europe/Bucharest");
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.body && typeof init.body === "string" && init.body.startsWith("{")) headers.set("content-type", "application/json");
  return new Request(BASE + path, { ...init, headers });
}

function cookies(res: Response, prev = ""): string {
  const jar = new Map(prev.split(/;\s*/).filter(Boolean).map((c) => [c.split("=")[0], c] as const));
  for (const sc of res.headers.getSetCookie()) {
    const kv = sc.split(";")[0];
    if (/Max-Age=0/.test(sc)) jar.delete(kv.split("=")[0]); else jar.set(kv.split("=")[0], kv);
  }
  return [...jar.values()].join("; ");
}

async function signUp(email: string, ip = "198.51.100.9") {
  const r = await A.register(req("/api/auth/register", { method: "POST", ip, body: JSON.stringify({ email, password: "password123", consent: true, locale: "en" }) }));
  const text = await r.text();
  assert.equal(r.status, 202, text);
  const u = new URL(JSON.parse(text).devVerifyUrl);
  const v = await A.verifyEmail(req(u.pathname + u.search));
  return cookies(v);
}

const BIRTH = { name: "Ana", date: "1991-03-12", time: "08:40", zone: "Europe/Bucharest", latitude: 47.16, longitude: 27.59 };
const PROFILE = { displayName: "Ana", date: "1991-03-12", time: "08:40", timeAccuracy: "exact",
  place: { label: "Iași, România", latitude: 47.16, longitude: 27.59, zone: "Europe/Bucharest" }, focus: [] };

test("anonymous reading: validated, served, same inputs not counted twice, IP quota → 429 with retryAt", async () => {
  const bad = await F.postReading(req("/api/readings", { method: "POST", body: JSON.stringify({ birth: { date: "1991-13-40" }, system: "WESTERN" }) }));
  assert.equal(bad.status, 400);
  assert.deepEqual((await bad.json()).fields, ["date", "zone"]);

  const r1 = await F.postReading(req("/api/readings", { method: "POST", body: JSON.stringify({ birth: BIRTH, system: "WESTERN", locale: "ro" }) }));
  assert.equal(r1.status, 200);
  const j1 = await r1.json();
  assert.equal(j1.tier, "anonymous");
  assert.equal(j1.reading.system, "WESTERN");
  assert.equal(j1.reading.usage, undefined); // cost data never reaches the browser
  // same inputs again: served from the engine's cache, not counted
  assert.equal((await F.postReading(req("/api/readings", { method: "POST", body: JSON.stringify({ birth: BIRTH, system: "WESTERN", locale: "ro" }) }))).status, 200);
  // a different system is the second (and last) free reading
  assert.equal((await F.postReading(req("/api/readings", { method: "POST", body: JSON.stringify({ birth: BIRTH, system: "CHINESE", locale: "ro" }) }))).status, 200);
  const r3 = await F.postReading(req("/api/readings", { method: "POST", body: JSON.stringify({ birth: BIRTH, system: "NUMEROLOGY" }) }));
  assert.equal(r3.status, 429);
  const q = await r3.json();
  assert.equal(q.reason, "free_readings");
  assert.match(q.retryAt, /T/);
  // another visitor is unaffected
  assert.equal((await F.postReading(req("/api/readings", { method: "POST", ip: "203.0.113.99", body: JSON.stringify({ birth: BIRTH, system: "NUMEROLOGY" }) }))).status, 200);
});

test("gate 1: calendar and question need an account, then birth data", async () => {
  const anon = await F.getCalendar(req("/api/calendar"));
  assert.equal(anon.status, 401);
  assert.equal((await anon.json()).reason, "sign_in");

  const c = await signUp("ana@example.com");
  const me0 = await (await M.me(req("/api/me", { cookie: c }))).json();
  assert.equal(me0.tier, "user");
  assert.equal(me0.credits, 0);
  assert.equal(me0.locale, "en");
  assert.equal(me0.question.used, false);

  const noBirth = await F.getCalendar(req("/api/calendar", { cookie: c }));
  assert.equal(noBirth.status, 409);
  assert.equal((await noBirth.json()).error, "no_birth_data");

  await A.putProfile(req("/api/profile", { method: "PUT", cookie: c, body: JSON.stringify({ profile: PROFILE }) }));
  const cal = await (await F.getCalendar(req("/api/calendar?days=7", { cookie: c }))).json();
  assert.equal(cal.days.length, 7);
  assert.equal(cal.days[0].date, cal.from);
  // signed-in readings are not subject to the IP quota
  for (let i = 0; i < 4; i++) {
    assert.equal((await F.postReading(req("/api/readings", { method: "POST", cookie: c, body: JSON.stringify({ birth: BIRTH, system: "WESTERN", date: `2000-01-0${i + 1}` }) }))).status, 200);
  }
});

test("one question per local day, 429 with retryAt on the second, stored with cost columns", async () => {
  const r = await A.login(req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "ana@example.com", password: "password123" }) }));
  const c = cookies(r);
  const empty = await F.postQuestion(req("/api/questions", { method: "POST", cookie: c, body: JSON.stringify({ question: "   " }) }));
  assert.equal(empty.status, 400);

  const q1 = await F.postQuestion(req("/api/questions", { method: "POST", cookie: c, body: JSON.stringify({ question: "Is it a good day to meet someone?" }) }));
  const q1text = await q1.text();
  assert.equal(q1.status, 201, q1text);
  const j = JSON.parse(q1text);
  assert.equal(j.question.answer, "Yes 8/10");
  assert.equal(j.question.model, "fake");
  assert.equal(j.question.tokensOut, 20);

  const q2 = await F.postQuestion(req("/api/questions", { method: "POST", cookie: c, body: JSON.stringify({ question: "And tomorrow?" }) }));
  assert.equal(q2.status, 429);
  const quota = await q2.json();
  assert.equal(quota.reason, "daily_question");
  assert.ok(Date.parse(quota.retryAt) > Date.now());

  const list = await (await F.getQuestions(req("/api/questions", { cookie: c }))).json();
  assert.equal(list.today.question, "Is it a good day to meet someone?");
  assert.equal(list.history.length, 1);
  const me = await (await M.me(req("/api/me", { cookie: c }))).json();
  assert.equal(me.question.used, true);

  // an engine outage consumes nothing
  const realAsk = E.engine.ask;
  E.engine.ask = async () => { throw new E.EngineError(503, "llm_unavailable"); };
  const c2 = await signUp("ion@example.com", "198.51.100.10");
  await A.putProfile(req("/api/profile", { method: "PUT", cookie: c2, body: JSON.stringify({ profile: PROFILE }) }));
  const down = await F.postQuestion(req("/api/questions", { method: "POST", cookie: c2, body: JSON.stringify({ question: "Hello?" }) }));
  assert.equal(down.status, 503);
  assert.equal((await down.json()).retry, true);
  E.engine.ask = realAsk;
  const after = await F.postQuestion(req("/api/questions", { method: "POST", cookie: c2, body: JSON.stringify({ question: "Hello again?" }) }));
  assert.equal(after.status, 201);
});

test("gate 2: conversation needs credits; dev checkout grants them; one credit = one thread up to the cap; empty thread refunds", async () => {
  const r = await A.login(req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "ana@example.com", password: "password123" }) }));
  const c = cookies(r);

  const locked = await F.createThread(req("/api/threads", { method: "POST", cookie: c, body: "{}" }));
  assert.equal(locked.status, 402);
  assert.equal((await locked.json()).reason, "credits");

  const pk = await (await C.getPackages()).json();
  assert.equal(pk.dev, true);
  assert.deepEqual(pk.packages.map((p: { id: string }) => p.id), ["single", "pack"]); // monthly is off by default
  const co = await C.checkout(req("/api/credits/checkout", { method: "POST", cookie: c, body: JSON.stringify({ packageId: "pack", locale: "en" }) }));
  const coText = await co.text();
  assert.equal(co.status, 200, coText);
  assert.match(JSON.parse(coText).url, /\/en\/credits\/done\?session_id=dev_/);
  const me = await (await M.me(req("/api/me", { cookie: c }))).json();
  assert.equal(me.credits, 5);
  assert.equal(me.tier, "paid");

  const t = await F.createThread(req("/api/threads", { method: "POST", cookie: c, body: JSON.stringify({ locale: "en" }) }));
  assert.equal(t.status, 201);
  const { thread, credits } = await t.json();
  assert.equal(credits, 4);
  assert.equal(thread.messageCap, 2);

  const long = await F.postMessage(req(`/api/threads/${thread.id}/messages`, { method: "POST", cookie: c, body: JSON.stringify({ text: "x".repeat(41) }) }), thread.id);
  assert.equal(long.status, 400);
  assert.equal((await long.json()).error, "too_long");

  const m1 = await F.postMessage(req(`/api/threads/${thread.id}/messages`, { method: "POST", cookie: c, body: JSON.stringify({ text: "Should I change jobs?" }) }), thread.id);
  assert.equal(m1.status, 201);
  const j1 = await m1.json();
  assert.equal(j1.messages[1].text, 'reply #1 to "Should I change jobs?"');
  assert.equal(j1.thread.messageCount, 1);
  assert.equal(j1.thread.status, "open");

  const m2 = await F.postMessage(req(`/api/threads/${thread.id}/messages`, { method: "POST", cookie: c, body: JSON.stringify({ text: "A step up" }) }), thread.id);
  const j2 = await m2.json();
  assert.equal(j2.messages[1].text, 'reply #2 to "A step up"');
  assert.equal(j2.thread.status, "closed"); // cap reached

  const m3 = await F.postMessage(req(`/api/threads/${thread.id}/messages`, { method: "POST", cookie: c, body: JSON.stringify({ text: "More?" }) }), thread.id);
  assert.equal(m3.status, 409);

  const full = await (await F.getThread(req(`/api/threads/${thread.id}`, { cookie: c }), thread.id)).json();
  assert.equal(full.messages.length, 4);
  assert.equal(full.thread.title, "Should I change jobs?");

  // an abandoned thread with no messages gives the credit back
  const t2 = await (await F.createThread(req("/api/threads", { method: "POST", cookie: c, body: "{}" }))).json();
  assert.equal((await (await M.me(req("/api/me", { cookie: c }))).json()).credits, 3);
  const closed = await (await F.closeThread(req(`/api/threads/${t2.thread.id}`, { method: "DELETE", cookie: c }), t2.thread.id)).json();
  assert.equal(closed.thread.status, "closed");
  assert.equal(closed.credits, 4);

  const hist = await (await C.creditHistory(req("/api/credits/history", { cookie: c }))).json();
  assert.deepEqual(hist.entries.map((e: { reason: string; delta: number }) => [e.reason, e.delta]),
    [["refund", 1], ["thread_open", -1], ["thread_open", -1], ["purchase", 5]]);

  // another user cannot read the thread
  const c2 = await signUp("eve@example.com", "198.51.100.11");
  assert.equal((await F.getThread(req(`/api/threads/${thread.id}`, { cookie: c2 }), thread.id)).status, 404);

  // deleting the account removes threads, questions and the ledger
  await A.deleteAccount(req("/api/account", { method: "DELETE", cookie: c }));
  assert.equal((await F.getThread(req(`/api/threads/${thread.id}`, { cookie: c2 }), thread.id)).status, 404);
});

test("Stripe webhook: bad signature rejected, event credited once, replay ignored", async () => {
  const c = await signUp("pay@example.com", "198.51.100.12");
  const me = await (await M.me(req("/api/me", { cookie: c }))).json();
  const event = { id: `evt_${randomUUID()}`, type: "checkout.session.completed", data: { object: {
    id: "cs_test_1", payment_status: "paid", client_reference_id: me.user.id, metadata: { credits: "1", packageId: "single" } } } };
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", "whsec_test").update(`${t}.${payload}`).digest("hex");

  const bad = await C.stripeWebhook(req("/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": `t=${t},v1=deadbeef` } }));
  assert.equal(bad.status, 400);
  const stale = await C.stripeWebhook(req("/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": `t=${t - 1000},v1=${sig}` } }));
  assert.equal(stale.status, 400);

  const ok = await C.stripeWebhook(req("/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": `t=${t},v1=${sig}` } }));
  assert.equal(ok.status, 200);
  const replay = await C.stripeWebhook(req("/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": `t=${t},v1=${sig}` } }));
  assert.equal(replay.status, 200);
  const after = await (await M.me(req("/api/me", { cookie: c }))).json();
  assert.equal(after.credits, 1);
  assert.equal(after.tier, "paid");
});

test("sign-ups per IP are limited", async () => {
  const ip = "192.0.2.50";
  for (let i = 0; i < 2; i++) {
    const r = await A.register(req("/api/auth/register", { method: "POST", ip, body: JSON.stringify({ email: `s${i}@example.com`, password: "password123", consent: true }) }));
    assert.equal(r.status, 202);
  }
  const third = await A.register(req("/api/auth/register", { method: "POST", ip, body: JSON.stringify({ email: "s3@example.com", password: "password123", consent: true }) }));
  assert.equal(third.status, 429);
  assert.equal((await third.json()).reason, "signups");
});

test("health: 200 when the engine answers, 503 when it does not", async () => {
  E.engine.health = async () => true;
  const up = await O.health();
  assert.equal(up.status, 200);
  assert.equal((await up.json()).engine, "up");
  E.engine.health = async () => false;
  const down = await O.health();
  assert.equal(down.status, 503);
  assert.equal((await down.json()).status, "degraded");
});

test("request id: the Cloudflare ray is reused, reaches the engine call and comes back in the response", async () => {
  let seenInEngine: string | undefined;
  const original = E.engine.reading;
  E.engine.reading = async (...a) => { seenInEngine = X.requestContext()?.id; return original(...a); };
  const handler = L.logged(F.postReading);
  const r = await handler(req("/api/readings", { method: "POST", ip: "203.0.113.99", headers: { "cf-ray": "8a1b2c3d4e5f-FRA" },
    body: JSON.stringify({ birth: BIRTH, system: "WESTERN" }) }));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("x-request-id"), "8a1b2c3d4e5f-FRA");
  assert.equal(seenInEngine, "8a1b2c3d4e5f-FRA");
  E.engine.reading = original;
  const generated = await handler(req("/api/readings", { method: "POST", ip: "203.0.113.98", body: JSON.stringify({ birth: BIRTH, system: "WESTERN" }) }));
  assert.match(generated.headers.get("x-request-id") ?? "", /^[0-9a-f]{12}$/);
});

test("route labels hide ids and tokens", () => {
  assert.equal(L.routeLabel(new Request("http://x/api/threads/0b7a1d2e-1111-4222-8333-444455556666/messages")), "/api/threads/:id/messages");
  assert.equal(L.routeLabel(new Request("http://x/api/auth/verify?token=abc")), "/api/auth/verify");
});

test("daily summary counts the day's questions, threads, tokens and credits; the ops route needs the token", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const s = await O.summary(today);
  assert.ok(s.usersTotal >= 3);
  assert.ok(s.questions >= 1);
  assert.ok(s.tokens >= 30, "tokens from the fake LLM answer are summed");
  // The conversation test deletes its account (cascade), so threads are counted on a fresh one here.
  const cookie = await signUp("summary@example.com", "198.51.100.77");
  await A.putProfile(req("/api/profile", { method: "PUT", cookie, body: JSON.stringify({ profile: PROFILE }) }));
  await C.checkout(req("/api/credits/checkout", { method: "POST", cookie, body: JSON.stringify({ packageId: "single" }) }));
  const opened = await F.createThread(req("/api/threads", { method: "POST", cookie, body: "{}" }));
  assert.equal(opened.status, 201);
  const s2 = await O.summary(today);
  assert.ok(s2.threadsOpened >= 1);
  assert.ok(s2.purchases >= 1);
  assert.ok(s2.openThreads >= 1);
  assert.ok(s2.creditsOutstanding >= 0);
  assert.ok(Object.keys(s.counters).some((k) => k.startsWith("http{")), "request counters are present");
  const text = O.formatSummary(s);
  assert.match(text, /Questions: \d+/);

  delete process.env.OPS_TOKEN;
  assert.equal((await O.opsSummary(req("/api/ops/summary"))).status, 404);
  process.env.OPS_TOKEN = "secret-token";
  assert.equal((await O.opsSummary(req("/api/ops/summary"))).status, 401);
  const ok = await O.opsSummary(req(`/api/ops/summary?day=${today}`, { headers: { authorization: "Bearer secret-token" } }));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).day, today);
});
