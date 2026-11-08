"use client";

import type { Birth } from "./api";
import type { BirthProfile, SessionInfo } from "./profile";
import type { CalendarDay, CreditPackage, LedgerEntry, MeInfo, MessageRecord, QuestionRecord, Reading, ReadingSystem, ThreadRecord } from "./types";

/**
 * Browser-side calls to the site's own API (same origin, cookie session). Every request carries the browser's
 * time zone so "today" and the daily quota follow local time (SPEC section 8).
 */
export class AccountError extends Error {
  constructor(public code: string, public status = 0, public fields: string[] = [], public data: Record<string, unknown> = {}) {
    super(code);
  }
}

export function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "X-Timezone": browserZone(), ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new AccountError((data.error as string) ?? "generic", res.status, (data.fields as string[]) ?? [], data);
  return data as T;
}

const post = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });

export const account = {
  me: () => call<MeInfo>("/api/me"),
  providers: () => call<{ google: boolean; facebook: boolean }>("/api/auth/providers"),
  register: (email: string, password: string, name: string | undefined, consent: boolean, locale: string, next: string) =>
    call<{ verification: "sent"; email: string; devVerifyUrl?: string }>("/api/auth/register", post({ email, password, name, consent, locale, next })),
  resend: (email: string, next: string) => call<{ verification: "sent"; devVerifyUrl?: string }>("/api/auth/resend", post({ email, next })),
  login: (email: string, password: string) => call<SessionInfo>("/api/auth/login", post({ email, password })),
  logout: () => call<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  saveProfile: (profile: BirthProfile, consent = false) => call<SessionInfo>("/api/profile", { method: "PUT", body: JSON.stringify({ profile, consent }) }),
  deleteProfile: () => call<SessionInfo>("/api/profile", { method: "DELETE" }),
  setLocale: (locale: "ro" | "en") => call<{ locale: string }>("/api/me/locale", { method: "PUT", body: JSON.stringify({ locale }) }),
  deleteAccount: () => call<{ ok: true }>("/api/account", { method: "DELETE" }),
  oauthUrl: (provider: "google" | "facebook", next: string, consent: boolean) =>
    `/api/auth/${provider}/start?${new URLSearchParams({ next, consent: consent ? "1" : "0" })}`,

  // ---- funnel features
  reading: (birth: Birth, system: ReadingSystem, date: string, locale: string) =>
    call<{ reading: Reading; tier: string }>("/api/readings", post({ birth, system, date, locale })),
  calendar: (from: string, locale: string) =>
    call<{ from: string; days: CalendarDay[] }>(`/api/calendar?${new URLSearchParams({ from, locale })}`),
  questions: () => call<{ today: QuestionRecord | null; history: QuestionRecord[]; date: string; unlimited: boolean }>("/api/questions"),
  ask: (question: string, locale: string) =>
    call<{ question: QuestionRecord; reasons: unknown[]; disclaimer: string }>("/api/questions", post({ question, locale })),
  threads: () => call<{ threads: ThreadRecord[]; credits: number; messageCap: number; maxChars: number }>("/api/threads"),
  createThread: (locale: string) => call<{ thread: ThreadRecord; credits: number }>("/api/threads", post({ locale })),
  thread: (id: string) => call<{ thread: ThreadRecord; messages: MessageRecord[]; maxChars: number }>(`/api/threads/${id}`),
  send: (id: string, text: string) =>
    call<{ thread: ThreadRecord; messages: MessageRecord[]; guardrail: string; disclaimer: string }>(`/api/threads/${id}/messages`, post({ text })),
  closeThread: (id: string) => call<{ thread: ThreadRecord; credits: number }>(`/api/threads/${id}`, { method: "DELETE" }),
  packages: () => call<{ packages: CreditPackage[]; stripe: boolean; dev: boolean; messageCap: number }>("/api/credits/packages"),
  checkout: (packageId: string, locale: string) => call<{ url: string; dev?: boolean }>("/api/credits/checkout", post({ packageId, locale })),
  ledger: () => call<{ credits: number; entries: LedgerEntry[] }>("/api/credits/history"),
};
