/**
 * Types shared by the browser and the server for the three-tier funnel (SPEC sections 2 to 7).
 * Everything astrological is computed by the engine; these are the shapes the web tier passes around.
 */
import type { BirthProfile, PublicUser } from "./profile";

export type Tier = "anonymous" | "user" | "paid";
export type ReadingSystem = "WESTERN" | "CHINESE" | "NUMEROLOGY";
export type Verdict = "GOOD" | "MIXED" | "CAUTION";
export const SYSTEMS: ReadingSystem[] = ["WESTERN", "CHINESE", "NUMEROLOGY"];

/** GET /api/me: who is calling and what they are entitled to. The UI never computes entitlements itself. */
export interface MeInfo {
  tier: Tier;
  user: PublicUser | null;
  profile: BirthProfile | null;
  credits: number;
  locale: "ro" | "en" | null;
  /** Today's question quota in the caller's time zone. */
  question: { date: string; used: boolean; retryAt: string | null; unlimited: boolean } | null;
  /** True when the server runs without Stripe in development: purchases are simulated. */
  dev?: boolean;
}

export interface Reason { source: string; text: string; weight: number; }

/** POST /api/readings → the engine's reading for one system. */
export interface Reading {
  system: ReadingSystem;
  date: string;
  facts: Record<string, unknown>;
  score: number;
  verdict: Verdict;
  reasons: Reason[];
  text: string;
  narrator: "llm" | "template";
  disclaimer: string;
}

export interface CalendarDay {
  date: string;
  score: number;
  verdict: Verdict;
  good: string[];
  avoid: string[];
  scores: Record<string, number>;
  reasons: string[];
}

export interface QuestionRecord {
  id: string;
  userId: string;
  forDate: string;
  locale: string;
  question: string;
  answer: string;
  category?: string;
  score?: number;
  verdict?: Verdict;
  guardrail?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  createdAt: string;
}

export interface ThreadRecord {
  id: string;
  userId: string;
  status: "open" | "closed";
  messageCount: number;
  messageCap: number;
  creditEntryId: string | null;
  locale: string;
  title?: string;
  createdAt: string;
  closedAt?: string;
}

export interface MessageRecord {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
}

export type LedgerReason = "purchase" | "thread_open" | "refund" | "admin";

export interface LedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: LedgerReason;
  stripeSessionId?: string;
  packageId?: string;
  createdAt: string;
}

export interface CreditPackage {
  id: "single" | "pack" | "monthly";
  credits: number;
  /** Display price, e.g. "2.99"; a placeholder until Stripe prices are configured (SPEC section 6). */
  amount: string;
  currency: string;
  highlight: boolean;
  unlimitedQuestionsDays?: number;
}
