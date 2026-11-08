/**
 * The entitlement check (HLD section 3): resolve the caller to anonymous / user / paid and compare it with what a
 * feature requires. Failures are machine-readable so the frontend shows the right gate:
 *   401 unauthorized (sign in) · 402 payment_required (credits) · 409 no_birth_data · 429 quota.
 * No route handler contains its own tier logic.
 */
import type { MeInfo, Tier } from "../types";
import { toBirth } from "../profile";
import { currentUser } from "./auth";
import { cfg, stripeEnabled } from "./config";
import { clientZone, fail, localDate, nextMidnight } from "./request";
import { note } from "./context";
import { store, toPublic, type UserRecord } from "./store";

export interface Caller {
  user: UserRecord | null;
  tier: Tier;
  credits: number;
  zone: string;
  today: string;
}

export async function caller(req: Request): Promise<Caller> {
  const zone = clientZone(req);
  const today = localDate(zone);
  const user = await currentUser(req);
  if (!user) {
    note({ tier: "anonymous" });
    return { user: null, tier: "anonymous", credits: 0, zone, today };
  }
  const credits = await store.credits(user.id);
  const tier: Tier = credits > 0 ? "paid" : "user";
  note({ tier });
  return { user, tier, credits, zone, today };
}

const RANK: Record<Tier, number> = { anonymous: 0, user: 1, paid: 2 };

/** Null when allowed, else the response to return. */
export function gate(c: Caller, required: Tier): Response | null {
  if (RANK[c.tier] >= RANK[required]) return null;
  if (!c.user) return fail(401, "unauthorized", { reason: "sign_in" });
  return fail(402, "payment_required", { reason: "credits" });
}

/** Birth data is needed for everything behind gate 1. */
export function needBirth(c: Caller): Response | null {
  return c.user?.profile ? null : fail(409, "no_birth_data", { reason: "birth_data" });
}

export function birthOf(c: Caller) {
  return toBirth(c.user!.profile!);
}

export function unlimitedQuestions(u: UserRecord | null): boolean {
  return !!u?.unlimitedQuestionsUntil && u.unlimitedQuestionsUntil > new Date().toISOString();
}

/** What GET /api/me returns. */
export async function meInfo(c: Caller): Promise<MeInfo> {
  if (!c.user) {
    return { tier: "anonymous", user: null, profile: null, credits: 0, locale: null, question: null, dev: !stripeEnabled() && !cfg.isProd };
  }
  const q = await store.questionFor(c.user.id, c.today);
  const unlimited = unlimitedQuestions(c.user);
  return {
    tier: c.tier,
    user: toPublic(c.user),
    profile: c.user.profile ?? null,
    credits: c.credits,
    locale: c.user.locale ?? null,
    question: { date: c.today, used: !!q && !unlimited, retryAt: q && !unlimited ? nextMidnight(c.zone) : null, unlimited },
    dev: !stripeEnabled() && !cfg.isProd,
  };
}
