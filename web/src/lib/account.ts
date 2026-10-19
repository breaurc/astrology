"use client";

import type { BirthProfile, SessionInfo } from "./profile";

/** Browser-side calls to the account API (same origin, cookie session). */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AccountError((data as { error?: string }).error ?? "generic", (data as { fields?: string[] }).fields ?? []);
  return data as T;
}

export class AccountError extends Error {
  constructor(public code: string, public fields: string[] = []) {
    super(code);
  }
}

export const account = {
  session: () => call<SessionInfo>("/api/auth/session"),
  providers: () => call<{ google: boolean; facebook: boolean }>("/api/auth/providers"),
  register: (email: string, password: string, name: string | undefined, consent: boolean) =>
    call<SessionInfo>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name, consent }) }),
  login: (email: string, password: string) =>
    call<SessionInfo>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => call<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  saveProfile: (profile: BirthProfile, consent = false) =>
    call<SessionInfo>("/api/profile", { method: "PUT", body: JSON.stringify({ profile, consent }) }),
  deleteAccount: () => call<{ ok: true }>("/api/account", { method: "DELETE" }),
  oauthUrl: (provider: "google" | "facebook", next: string, consent: boolean) =>
    `/api/auth/${provider}/start?${new URLSearchParams({ next, consent: consent ? "1" : "0" })}`,
};

// ---- Draft profile kept in the browser while onboarding (survives the Google/Facebook redirect) ----

const DRAFT_KEY = "astro.draftProfile";

export function loadDraft(): Partial<BirthProfile> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<BirthProfile>) : null;
  } catch {
    return null;
  }
}

export function saveDraft(p: Partial<BirthProfile>) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(p));
  } catch {
    /* private mode: the flow still works, the draft just won't survive a redirect */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** True when the draft has everything needed to save a profile. */
export function isComplete(p: Partial<BirthProfile> | null): p is BirthProfile {
  return !!p && !!p.date && !!p.place?.zone && !!p.timeAccuracy && (p.timeAccuracy === "unknown" || !!p.time);
}
