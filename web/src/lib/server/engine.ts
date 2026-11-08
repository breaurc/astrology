/**
 * Server-side client for the Spring engine. The browser never talks to the engine: every call goes through a
 * route handler that has already checked the caller's tier and quota, so limits cannot be bypassed.
 * The functions are properties of one object so tests can replace them with fakes.
 */
import type { Birth } from "../api";
import type { CalendarDay, Reading, ReadingSystem, Reason, Verdict } from "../types";
import { cfg } from "./config";
import { requestContext } from "./context";

export class EngineError extends Error {
  constructor(public status: number, public code: string, public details?: unknown) {
    super(`engine ${status} ${code}`);
  }
}

export interface Usage { model: string; tokensIn: number; tokensOut: number; latencyMs: number; }

export interface AskResult {
  question: string; date: string; category: string; score: number; verdict: Verdict; reasons: Reason[];
  text: string; narrator: string; guardrail: string; disclaimer: string; usage?: Usage | null;
}

export interface ChatTurn {
  text: string; narrator: string; guardrail: string; category: string; disclaimer: string; usage?: Usage | null;
}

async function post<T>(path: string, payload: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${cfg.engineUrl}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(requestContext() ? { "X-Request-Id": requestContext()!.id } : {}) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    throw new EngineError(503, "engine_unreachable", e instanceof Error ? e.message : String(e));
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    throw new EngineError(res.status, data.error ?? "engine_error", data.details);
  }
  return res.json() as Promise<T>;
}

export const engine = {
  /** True when the engine's actuator health endpoint answers UP (3 s budget). */
  health: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${cfg.engineUrl}/actuator/health`, { signal: AbortSignal.timeout(3_000), cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  },

  reading: (birth: Birth, system: ReadingSystem, date: string, locale: string) =>
    post<Reading & { usage?: Usage | null }>("/reading", { birth, system, date, locale }),

  calendar: (birth: Birth, from: string, days: number, locale: string) =>
    post<{ from: string; days: CalendarDay[] }>("/calendar", { birth, from, days, locale }),

  ask: (birth: Birth, question: string, date: string, locale: string) =>
    post<AskResult>("/ask", { birth, question, date, locale }),

  chat: (birth: Birth, date: string, locale: string, history: { role: string; text: string }[], message: string) =>
    post<ChatTurn>("/chat", { birth, date, locale, history, message }),
};
