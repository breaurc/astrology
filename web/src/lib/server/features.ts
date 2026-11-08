/**
 * The funnel's feature endpoints (SPEC section 3): free readings, the 7-day calendar, the daily question and
 * the paid conversation. Each one resolves the caller, applies the gate and the quota, then calls the engine.
 * Plain Request → Response functions, so they run in Next.js route handlers and in node tests alike.
 */
import { validateBirth } from "../profile";
import type { ReadingSystem } from "../types";
import { SYSTEMS } from "../types";
import { cfg } from "./config";
import { engine, EngineError } from "./engine";
import { metrics } from "./metrics";
import { body, clientIp, fail, ipHash, json, localeOf, nextMidnight, sameOrigin } from "./request";
import { store } from "./store";
import { birthOf, caller, gate, needBirth, unlimitedQuestions } from "./tier";
import { createHash } from "node:crypto";

function engineFailure(e: unknown): Response {
  if (e instanceof EngineError) {
    if (e.status === 503) {
      metrics.inc("engine_unavailable", { cause: e.code });
      return fail(503, e.code === "budget" ? "maintenance" : "engine_unavailable", { retry: true });
    }
    if (e.status === 400) return fail(400, "validation", { details: e.details });
    return fail(502, "engine_error");
  }
  console.error("[features]", e);
  return fail(500, "generic");
}

// ---------------------------------------------------------------- free reading (anonymous)

/** POST /api/readings { birth, system, date?, locale? } — anyone; per-IP daily quota for anonymous callers. */
export async function postReading(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const c = await caller(req);
  const b = await body(req);
  const v = validateBirth(b.birth);
  if (!v.ok) return fail(400, "validation", { fields: v.errors });
  const system = SYSTEMS.includes(b.system as ReadingSystem) ? (b.system as ReadingSystem) : "WESTERN";
  const locale = localeOf(b.locale, c.user?.locale ?? "ro");
  const date = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date) && Math.abs(Date.parse(b.date) - Date.parse(c.today)) <= 86400_000
    ? b.date : c.today;

  if (!c.user) {
    const key = createHash("sha256").update(JSON.stringify([v.birth, system, date, locale])).digest("base64url").slice(0, 24);
    const h = ipHash(clientIp(req), c.today);
    const r = await store.countReading(h, c.today, key, cfg.freeReadingsPerIp);
    if (!r.ok) {
      metrics.inc("quota", { reason: "free_readings" });
      return fail(429, "quota", { reason: "free_readings", retryAt: nextMidnight(c.zone), limit: cfg.freeReadingsPerIp });
    }
  }
  try {
    const reading = await engine.reading(v.birth, system, date, locale);
    const { usage: _u, ...out } = reading;
    metrics.inc("readings", { tier: c.tier, system, narrator: reading.narrator });
    return json({ reading: out, tier: c.tier });
  } catch (e) {
    return engineFailure(e);
  }
}

// ---------------------------------------------------------------- calendar (user)

/** GET /api/calendar?from=yyyy-mm-dd&days=7 — needs an account and saved birth data; no LLM call. */
export async function getCalendar(req: Request): Promise<Response> {
  const c = await caller(req);
  const g = gate(c, "user") ?? needBirth(c);
  if (g) return g;
  const url = new URL(req.url);
  const fromQ = url.searchParams.get("from");
  const from = fromQ && /^\d{4}-\d{2}-\d{2}$/.test(fromQ) ? fromQ : c.today;
  const days = Math.max(1, Math.min(cfg.calendarDays, Number(url.searchParams.get("days")) || cfg.calendarDays));
  const locale = localeOf(url.searchParams.get("locale"), c.user!.locale ?? "ro");
  try {
    const cal = await engine.calendar(birthOf(c), from, days, locale);
    return json(cal);
  } catch (e) {
    return engineFailure(e);
  }
}

// ---------------------------------------------------------------- daily question (user)

/** GET /api/questions?date=today → today's question (if any) and the history. */
export async function getQuestions(req: Request): Promise<Response> {
  const c = await caller(req);
  const g = gate(c, "user");
  if (g) return g;
  const all = await store.questionsOf(c.user!.id);
  const today = all.find((q) => q.forDate === c.today) ?? null;
  return json({ today, history: all.slice(0, 50), date: c.today, unlimited: unlimitedQuestions(c.user) });
}

/** POST /api/questions { question, locale? } — one per calendar day (local time); 429 with retryAt when used. */
export async function postQuestion(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const c = await caller(req);
  const g = gate(c, "user") ?? needBirth(c);
  if (g) return g;
  const b = await body(req);
  const question = typeof b.question === "string" ? b.question.replace(/\s+/g, " ").trim() : "";
  if (!question || question.length > cfg.maxQuestionChars) return fail(400, "validation", { fields: ["question"], max: cfg.maxQuestionChars });
  const locale = localeOf(b.locale, c.user!.locale ?? "ro");
  const unlimited = unlimitedQuestions(c.user);

  if (!unlimited && (await store.questionFor(c.user!.id, c.today))) {
    return fail(429, "quota", { reason: "daily_question", retryAt: nextMidnight(c.zone) });
  }
  let a;
  try {
    a = await engine.ask(birthOf(c), question, c.today, locale);
  } catch (e) {
    return engineFailure(e); // nothing consumed
  }
  const saved = await store.addQuestion({
    userId: c.user!.id, forDate: c.today, locale, question, answer: a.text, category: a.category, score: a.score,
    verdict: a.verdict, guardrail: a.guardrail, model: a.usage?.model, tokensIn: a.usage?.tokensIn, tokensOut: a.usage?.tokensOut,
  }, unlimited);
  if (!saved) {
    metrics.inc("quota", { reason: "daily_question" });
    return fail(429, "quota", { reason: "daily_question", retryAt: nextMidnight(c.zone) });
  }
  metrics.inc("questions", { narrator: a.narrator, guardrail: a.guardrail });
  return json({ question: saved, reasons: a.reasons, disclaimer: a.disclaimer }, 201);
}

// ---------------------------------------------------------------- conversation (paid)

/** GET /api/threads → the caller's threads, newest first. */
export async function listThreads(req: Request): Promise<Response> {
  const c = await caller(req);
  const g = gate(c, "user");
  if (g) return g;
  return json({ threads: await store.threadsOf(c.user!.id), credits: c.credits, messageCap: cfg.messageCap, maxChars: cfg.maxChars });
}

/** POST /api/threads → opens a thread and consumes one credit. 402 without credits. */
export async function createThread(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const c = await caller(req);
  const g = gate(c, "paid") ?? needBirth(c);
  if (g) return g;
  const b = await body(req);
  const t = await store.openThread(c.user!.id, cfg.messageCap, localeOf(b.locale, c.user!.locale ?? "ro"));
  if (!t) return fail(402, "payment_required", { reason: "credits" });
  metrics.inc("threads_opened");
  return json({ thread: t, credits: c.credits - 1 }, 201);
}

/** GET /api/threads/:id → thread + messages (read-only after close). */
export async function getThread(req: Request, id: string): Promise<Response> {
  const c = await caller(req);
  const g = gate(c, "user");
  if (g) return g;
  const t = await store.thread(id);
  if (!t || t.thread.userId !== c.user!.id) return fail(404, "not_found");
  return json({ ...t, maxChars: cfg.maxChars });
}

/** POST /api/threads/:id/messages { text } → appends the turn and the engine's reply; 409 when closed. */
export async function postMessage(req: Request, id: string): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const c = await caller(req);
  const g = gate(c, "user") ?? needBirth(c);
  if (g) return g;
  const t = await store.thread(id);
  if (!t || t.thread.userId !== c.user!.id) return fail(404, "not_found");
  if (t.thread.status !== "open") return fail(409, "closed", { reason: "thread_closed" });
  const b = await body(req);
  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (!text) return fail(400, "validation", { fields: ["text"] });
  if (text.length > cfg.maxChars) return fail(400, "too_long", { max: cfg.maxChars });

  let turn;
  try {
    turn = await engine.chat(birthOf(c), c.today, t.thread.locale, t.messages.map((m) => ({ role: m.role, text: m.text })), text);
  } catch (e) {
    return engineFailure(e); // nothing consumed
  }
  const saved = await store.appendTurn(id, { role: "user", text },
    { role: "assistant", text: turn.text, model: turn.usage?.model, tokensIn: turn.usage?.tokensIn, tokensOut: turn.usage?.tokensOut });
  if (!saved) return fail(409, "closed", { reason: "thread_closed" });
  metrics.inc("messages", { narrator: turn.narrator, guardrail: turn.guardrail });
  return json({ ...saved, guardrail: turn.guardrail, disclaimer: turn.disclaimer }, 201);
}

/** DELETE /api/threads/:id → closes the thread; a thread with no messages gives the credit back. */
export async function closeThread(req: Request, id: string): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const c = await caller(req);
  const g = gate(c, "user");
  if (g) return g;
  const t = await store.thread(id);
  if (!t || t.thread.userId !== c.user!.id) return fail(404, "not_found");
  const closed = await store.closeThread(id);
  return json({ thread: closed, credits: await store.credits(c.user!.id) });
}
