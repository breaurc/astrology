/**
 * Operations: the public health check, the daily summary (logged, and emailed when OPS_EMAIL is set) and the
 * token-protected summary endpoint. Numbers come from the store (durable) and the in-process counters.
 */
import { timingSafeEqual } from "node:crypto";
import { engine } from "./engine";
import { sendMail } from "./mailer";
import { metrics } from "./metrics";
import { fail, json } from "./request";
import { store, type DayStats } from "./store";

/** GET /api/health → 200 when the site and the engine answer, 503 otherwise. Meant for an uptime monitor. */
export async function health(): Promise<Response> {
  const started = performance.now();
  const engineUp = await engine.health();
  const engineMs = Math.round(performance.now() - started);
  return json({ status: engineUp ? "ok" : "degraded", engine: engineUp ? "up" : "down", engineMs, time: new Date().toISOString() },
    engineUp ? 200 : 503);
}

export interface Summary extends DayStats {
  day: string;
  counters: Record<string, number>;
}

/** The numbers for one UTC day plus the counters since the last report. */
export async function summary(day: string, resetCounters = false): Promise<Summary> {
  const stats = await store.stats(day);
  return { day, ...stats, counters: metrics.snapshot(resetCounters) };
}

export function formatSummary(s: Summary): string {
  const lines = [
    `Cosmic Triad · ${s.day} (UTC)`,
    "",
    `Accounts: ${s.usersTotal} total, ${s.newUsers} new, ${s.verifiedUsers} verified`,
    `Questions: ${s.questions}`,
    `Conversations: ${s.threadsOpened} opened, ${s.userMessages} messages sent, ${s.openThreads} open now`,
    `Tokens: ${s.tokens} (${s.llmAnswers} LLM answers)`,
    `Credits: ${s.purchases} purchases, ${s.creditsSold} credits sold, ${s.creditsRefunded} refunded, ${s.creditsOutstanding} outstanding`,
    "",
    "Since the last report (this process):",
  ];
  const keys = Object.keys(s.counters);
  if (keys.length === 0) lines.push("  (no requests)");
  for (const k of keys) lines.push(`  ${k} = ${s.counters[k]}`);
  return lines.join("\n");
}

function yesterdayUtc(now = new Date()): string {
  return new Date(now.getTime() - 86400_000).toISOString().slice(0, 10);
}

/** Logs yesterday's summary and emails it to OPS_EMAIL when set. */
export async function dailyReport(now = new Date()): Promise<string> {
  const s = await summary(yesterdayUtc(now), true);
  const text = formatSummary(s);
  console.log(`[ops] daily summary\n${text}`);
  const to = process.env.OPS_EMAIL;
  if (to) {
    const r = await sendMail({ to, subject: `Cosmic Triad · daily summary ${s.day}`, text });
    if (!r.delivered) console.warn("[ops] daily summary email not delivered");
  }
  return text;
}

/** Runs the report every day at REPORT_HOUR UTC; started once per process from instrumentation.ts. */
const REPORT_HOUR = 6;
let scheduled = false;

export function scheduleDailyReport(): void {
  if (scheduled) return;
  scheduled = true;
  const tick = () => {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), REPORT_HOUR));
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const t = setTimeout(() => {
      dailyReport().catch((e) => console.error("[ops] daily summary failed", e)).finally(tick);
    }, next.getTime() - now.getTime());
    t.unref();
  };
  tick();
}

/** GET /api/ops/summary?day=yyyy-mm-dd with `Authorization: Bearer <OPS_TOKEN>`; 404 unless OPS_TOKEN is set. */
export async function opsSummary(req: Request): Promise<Response> {
  const token = process.env.OPS_TOKEN || "";
  if (!token) return fail(404, "not_found");
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) return fail(401, "unauthorized");
  const day = new URL(req.url).searchParams.get("day") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return fail(400, "validation", { fields: ["day"] });
  return json(await summary(day));
}
