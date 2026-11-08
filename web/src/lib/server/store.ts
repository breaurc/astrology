import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { BirthProfile, PublicUser } from "../profile";
import type { LedgerEntry, LedgerReason, MessageRecord, QuestionRecord, ThreadRecord } from "../types";
import { dataDir } from "./secret";
import { INACTIVITY_MONTHS, POLICY_VERSION } from "../privacy";

/**
 * Persistence for the funnel: users and birth data, questions, threads and messages, the credit ledger,
 * Stripe event ids and the per-IP quota counters (HLD section 5). This implementation keeps everything in
 * one JSON file (web/.data/users.json) behind a serialized read-modify-write queue, which is enough for
 * development and the first deployment. Implement the same functions over PostgreSQL to scale; nothing
 * else in the app touches the file.
 */
export interface Identity { provider: "google" | "facebook"; subject: string; }

export interface UserRecord {
  id: string;
  email?: string;           // lower-case
  emailVerified?: boolean;  // true after the verification link or when an OAuth provider vouched for it
  verifyToken?: string;     // pending email verification (SPEC section 5)
  verifyExpires?: string;
  name?: string;
  passwordHash?: string;
  identities: Identity[];
  locale?: "ro" | "en";     // remembered language (SPEC section 8)
  createdAt: string;
  consentAt?: string;       // explicit consent to store birth data (GDPR art. 6(1)(a), 7)
  consentVersion?: string;  // privacy notice version that was accepted
  lastSeenAt?: string;      // used to delete inactive accounts
  unlimitedQuestionsUntil?: string; // monthly package
  profile?: BirthProfile;
}

export interface StripeEventRecord { eventId: string; type: string; processedAt: string; }
export interface IpQuotaRecord { ipHash: string; forDate: string; readings: number; signups: number; keys: string[]; }

interface DB {
  users: UserRecord[];
  questions: QuestionRecord[];
  threads: ThreadRecord[];
  messages: MessageRecord[];
  ledger: LedgerEntry[];
  stripeEvents: StripeEventRecord[];
  ipQuota: IpQuotaRecord[];
}

/** Durable numbers for one UTC day (createdAt prefix) plus a few totals; feeds the daily summary. */
export interface DayStats {
  usersTotal: number;
  verifiedUsers: number;
  newUsers: number;
  questions: number;
  llmAnswers: number;
  threadsOpened: number;
  userMessages: number;
  openThreads: number;
  tokens: number;
  purchases: number;
  creditsSold: number;
  creditsRefunded: number;
  creditsOutstanding: number;
}

const EMPTY: DB = { users: [], questions: [], threads: [], messages: [], ledger: [], stripeEvents: [], ipQuota: [] };

let queue: Promise<unknown> = Promise.resolve();

function file() {
  return join(dataDir(), "users.json");
}

function load(): DB {
  try {
    const raw = JSON.parse(readFileSync(file(), "utf8")) as Partial<DB>;
    return { ...EMPTY, ...Object.fromEntries(Object.entries(raw).filter(([, v]) => Array.isArray(v))) } as DB;
  } catch {
    return { ...EMPTY };
  }
}

function save(db: DB) {
  mkdirSync(dataDir(), { recursive: true });
  const tmp = `${file()}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
  renameSync(tmp, file());
}

let lastPurge = 0;

/** Keeps only accounts used within the last INACTIVITY_MONTHS. */
export function activeOnly(users: UserRecord[], now = new Date()): UserRecord[] {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - INACTIVITY_MONTHS);
  const c = cutoff.toISOString();
  return users.filter((u) => (u.lastSeenAt ?? u.createdAt) >= c);
}

/** Deletes inactive accounts (with their data) and stale IP counters, checked at most once an hour. */
function purge(db: DB) {
  if (Date.now() - lastPurge < 3600_000) return;
  lastPurge = Date.now();
  const keep = new Set(activeOnly(db.users).map((u) => u.id));
  if (keep.size !== db.users.length) {
    db.users = db.users.filter((u) => keep.has(u.id));
    cascade(db, (id) => !keep.has(id));
  }
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  db.ipQuota = db.ipQuota.filter((q) => q.forDate >= yesterday);
}

/** Removes everything that belongs to the matching users; Stripe event ids stay for idempotency. */
function cascade(db: DB, gone: (userId: string) => boolean) {
  const threads = new Set(db.threads.filter((t) => gone(t.userId)).map((t) => t.id));
  db.questions = db.questions.filter((q) => !gone(q.userId));
  db.threads = db.threads.filter((t) => !gone(t.userId));
  db.messages = db.messages.filter((m) => !threads.has(m.threadId));
  db.ledger = db.ledger.filter((l) => !gone(l.userId));
}

/** Serializes read-modify-write cycles so concurrent requests don't overwrite each other. */
function tx<T>(fn: (db: DB) => T): Promise<T> {
  const run = queue.then(() => {
    const db = load();
    purge(db);
    const out = fn(db);
    save(db);
    return out;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Read-only snapshot after pending writes. */
async function read<T>(fn: (db: DB) => T): Promise<T> {
  await queue;
  return fn(load());
}

const normalizeEmail = (e: string) => e.trim().toLowerCase();
const now = () => new Date().toISOString();

export function toPublic(u: UserRecord): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    providers: [...(u.passwordHash ? ["password"] : []), ...u.identities.map((i) => i.provider)],
    createdAt: u.createdAt,
    consentAt: u.consentAt,
    consentVersion: u.consentVersion,
  };
}

function balanceOf(db: { ledger: LedgerEntry[] }, userId: string): number {
  return db.ledger.filter((l) => l.userId === userId).reduce((s, l) => s + l.delta, 0);
}

export const store = {
  // ---------------------------------------------------------------- users

  byId(id: string) {
    return read((db) => db.users.find((u) => u.id === id));
  },

  byEmail(email: string) {
    const e = normalizeEmail(email);
    return read((db) => db.users.find((u) => u.email === e));
  },

  byVerifyToken(token: string) {
    return read((db) => db.users.find((u) => u.verifyToken === token));
  },

  /**
   * Creates an email + password account that still has to verify its address; returns null when the email is taken.
   * Consent is recorded now because the sign-in sheet does not let the account be created without it.
   */
  createWithPassword(email: string, passwordHash: string, name: string | undefined, consent: boolean,
                     verifyToken: string, locale?: "ro" | "en") {
    return tx((db) => {
      const e = normalizeEmail(email);
      if (db.users.some((u) => u.email === e)) return null;
      const t = now();
      const u: UserRecord = {
        id: randomUUID(), email: e, name, passwordHash, identities: [], createdAt: t, lastSeenAt: t, locale,
        emailVerified: false, verifyToken, verifyExpires: new Date(Date.now() + 24 * 3600_000).toISOString(),
        consentAt: consent ? t : undefined, consentVersion: consent ? POLICY_VERSION : undefined,
      };
      db.users.push(u);
      return u;
    });
  },

  /** Issues a fresh verification token (resend). */
  renewVerifyToken(id: string, verifyToken: string) {
    return tx((db) => {
      const u = db.users.find((x) => x.id === id);
      if (!u || u.emailVerified) return null;
      u.verifyToken = verifyToken;
      u.verifyExpires = new Date(Date.now() + 24 * 3600_000).toISOString();
      return u;
    });
  },

  /** Marks the address verified and activates the account; null when the token is unknown or expired. */
  verifyEmail(token: string) {
    return tx((db) => {
      const u = db.users.find((x) => x.verifyToken === token);
      if (!u) return null;
      if (u.verifyExpires && u.verifyExpires < now()) return "expired" as const;
      u.emailVerified = true;
      delete u.verifyToken;
      delete u.verifyExpires;
      u.lastSeenAt = now();
      return u;
    });
  },

  /**
   * Finds or creates the user for an OAuth login. Links to an existing account only when the provider says the
   * email is verified (prevents account takeover through an unverified address).
   */
  upsertOAuth(identity: Identity, info: { email?: string; emailVerified: boolean; name?: string }, consent: boolean, locale?: "ro" | "en") {
    return tx((db) => {
      const t = now();
      let u = db.users.find((x) => x.identities.some((i) => i.provider === identity.provider && i.subject === identity.subject));
      const email = info.email ? normalizeEmail(info.email) : undefined;
      if (!u && email && info.emailVerified) {
        u = db.users.find((x) => x.email === email);
        if (u) {
          u.identities.push(identity);
          u.emailVerified = true;
          delete u.verifyToken;
          delete u.verifyExpires;
        }
      }
      if (!u) {
        u = { id: randomUUID(), email: email && !db.users.some((x) => x.email === email) ? email : undefined,
          emailVerified: info.emailVerified, name: info.name, identities: [identity], createdAt: t, locale };
        db.users.push(u);
      }
      if (!u.name && info.name) u.name = info.name;
      if (!u.locale && locale) u.locale = locale;
      u.lastSeenAt = t;
      if (consent && !u.consentAt) { u.consentAt = t; u.consentVersion = POLICY_VERSION; }
      return u;
    });
  },

  saveProfile(id: string, profile: BirthProfile, consent: boolean) {
    return tx((db) => {
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      if (consent && !u.consentAt) { u.consentAt = now(); u.consentVersion = POLICY_VERSION; }
      if (!u.consentAt) return "consent" as const;
      u.profile = { ...profile, updatedAt: now() };
      if (!u.name && profile.displayName) u.name = profile.displayName;
      return u;
    });
  },

  setLocale(id: string, locale: "ro" | "en") {
    return tx((db) => {
      const u = db.users.find((x) => x.id === id);
      if (u) u.locale = locale;
      return u ?? null;
    });
  },

  /** Marks the account as used (login / visit); at most one write per day per user. */
  touch(id: string) {
    return tx((db) => {
      const u = db.users.find((x) => x.id === id);
      const today = now().slice(0, 10);
      if (u && (u.lastSeenAt ?? "").slice(0, 10) !== today) u.lastSeenAt = now();
    });
  },

  /** Withdraws consent: deletes the birth profile and the consent record, keeps the login. */
  withdraw(id: string) {
    return tx((db) => {
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      delete u.profile;
      delete u.consentAt;
      delete u.consentVersion;
      return u;
    });
  },

  /** GDPR deletion: the account and everything that belongs to it (SPEC section 5). Stripe event ids are kept. */
  remove(id: string) {
    return tx((db) => {
      const before = db.users.length;
      db.users = db.users.filter((u) => u.id !== id);
      cascade(db, (uid) => uid === id);
      return db.users.length < before;
    });
  },

  /** GDPR export: everything stored about one person. */
  exportOf(id: string) {
    return read((db) => {
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      const threads = db.threads.filter((t) => t.userId === id);
      const ids = new Set(threads.map((t) => t.id));
      return {
        user: u,
        questions: db.questions.filter((q) => q.userId === id),
        threads,
        messages: db.messages.filter((m) => ids.has(m.threadId)),
        ledger: db.ledger.filter((l) => l.userId === id),
      };
    });
  },

  // ---------------------------------------------------------------- questions (1 per day)

  questionFor(userId: string, forDate: string) {
    return read((db) => db.questions.find((q) => q.userId === userId && q.forDate === forDate));
  },

  questionsOf(userId: string) {
    return read((db) => db.questions.filter((q) => q.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  /** Stores the answer; the unique (user, date) rule is enforced here. Returns null on conflict unless unlimited. */
  addQuestion(rec: Omit<QuestionRecord, "id" | "createdAt">, unlimited: boolean) {
    return tx((db) => {
      if (!unlimited && db.questions.some((q) => q.userId === rec.userId && q.forDate === rec.forDate)) return null;
      const q: QuestionRecord = { ...rec, id: randomUUID(), createdAt: now() };
      db.questions.push(q);
      return q;
    });
  },

  // ---------------------------------------------------------------- credits and threads

  credits(userId: string) {
    return read((db) => balanceOf(db, userId));
  },

  ledgerOf(userId: string) {
    return read((db) => db.ledger.filter((l) => l.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  /** Appends to the ledger (never updated, only appended). Returns the new balance. */
  credit(userId: string, delta: number, reason: LedgerReason, extra: { stripeSessionId?: string; packageId?: string } = {}) {
    return tx((db) => {
      const e: LedgerEntry = { id: randomUUID(), userId, delta, reason, createdAt: now(), ...extra };
      db.ledger.push(e);
      return { entry: e, balance: balanceOf(db, userId) };
    });
  },

  /** Idempotency for webhooks: true the first time an event id is seen. */
  markStripeEvent(eventId: string, type: string) {
    return tx((db) => {
      if (db.stripeEvents.some((e) => e.eventId === eventId)) return false;
      db.stripeEvents.push({ eventId, type, processedAt: now() });
      return true;
    });
  },

  setUnlimitedQuestions(userId: string, until: string) {
    return tx((db) => {
      const u = db.users.find((x) => x.id === userId);
      if (u) u.unlimitedQuestionsUntil = until;
    });
  },

  /**
   * Opens a thread and consumes one credit in the same transaction (HLD section 7 step 5).
   * Returns null when the balance is zero.
   */
  openThread(userId: string, messageCap: number, locale: string) {
    return tx((db) => {
      if (balanceOf(db, userId) < 1) return null;
      const entry: LedgerEntry = { id: randomUUID(), userId, delta: -1, reason: "thread_open", createdAt: now() };
      db.ledger.push(entry);
      const t: ThreadRecord = { id: randomUUID(), userId, status: "open", messageCount: 0, messageCap,
        creditEntryId: entry.id, locale, createdAt: now() };
      db.threads.push(t);
      return t;
    });
  },

  threadsOf(userId: string) {
    return read((db) => db.threads.filter((t) => t.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  thread(id: string) {
    return read((db) => {
      const t = db.threads.find((x) => x.id === id);
      if (!t) return null;
      return { thread: t, messages: db.messages.filter((m) => m.threadId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) };
    });
  },

  /** Appends one user turn and its answer; closes the thread when the cap is reached. */
  appendTurn(threadId: string, user: Omit<MessageRecord, "id" | "threadId" | "createdAt">,
             assistant: Omit<MessageRecord, "id" | "threadId" | "createdAt">) {
    return tx((db) => {
      const t = db.threads.find((x) => x.id === threadId);
      if (!t || t.status !== "open") return null;
      const t0 = now();
      const t1 = new Date(Date.parse(t0) + 1).toISOString();
      const m1: MessageRecord = { ...user, id: randomUUID(), threadId, createdAt: t0 };
      const m2: MessageRecord = { ...assistant, id: randomUUID(), threadId, createdAt: t1 };
      db.messages.push(m1, m2);
      t.messageCount += 1;
      if (!t.title) t.title = user.text.slice(0, 80);
      if (t.messageCount >= t.messageCap) { t.status = "closed"; t.closedAt = t1; }
      return { thread: t, messages: [m1, m2] };
    });
  },

  /** Closes a thread; an unused one (no messages) gives its credit back (SPEC section 6). */
  closeThread(threadId: string) {
    return tx((db) => {
      const t = db.threads.find((x) => x.id === threadId);
      if (!t) return null;
      if (t.status === "open") {
        t.status = "closed";
        t.closedAt = now();
        if (t.messageCount === 0 && t.creditEntryId) {
          db.ledger.push({ id: randomUUID(), userId: t.userId, delta: 1, reason: "refund", createdAt: now() });
          t.creditEntryId = null;
        }
      }
      return t;
    });
  },

  // ---------------------------------------------------------------- per-IP quota (hashed, daily)

  /** Counts one reading unless the same inputs were already served today; returns the updated record. */
  countReading(ipHash: string, forDate: string, key: string, limit: number) {
    return tx((db) => {
      let q = db.ipQuota.find((x) => x.ipHash === ipHash && x.forDate === forDate);
      if (!q) { q = { ipHash, forDate, readings: 0, signups: 0, keys: [] }; db.ipQuota.push(q); }
      if (q.keys.includes(key)) return { ok: true, record: q };
      if (q.readings >= limit) return { ok: false, record: q };
      q.readings += 1;
      q.keys = [...q.keys, key].slice(-50);
      return { ok: true, record: q };
    });
  },

  stats(day: string): Promise<DayStats> {
    return read((db) => {
      const on = (r: { createdAt: string }) => r.createdAt.startsWith(day);
      const questions = db.questions.filter(on);
      const messages = db.messages.filter(on);
      const ledger = db.ledger.filter(on);
      const tokensOf = (rs: { tokensIn?: number; tokensOut?: number }[]) => rs.reduce((n, r) => n + (r.tokensIn ?? 0) + (r.tokensOut ?? 0), 0);
      return {
        usersTotal: db.users.length,
        verifiedUsers: db.users.filter((u) => u.emailVerified !== false).length,
        newUsers: db.users.filter(on).length,
        questions: questions.length,
        llmAnswers: questions.filter((q) => q.model).length + messages.filter((m) => m.role === "assistant" && m.model).length,
        threadsOpened: db.threads.filter(on).length,
        userMessages: messages.filter((m) => m.role === "user").length,
        openThreads: db.threads.filter((t) => t.status === "open").length,
        tokens: tokensOf(questions) + tokensOf(messages),
        purchases: ledger.filter((l) => l.reason === "purchase").length,
        creditsSold: ledger.filter((l) => l.reason === "purchase").reduce((n, l) => n + l.delta, 0),
        creditsRefunded: ledger.filter((l) => l.reason === "refund").reduce((n, l) => n + l.delta, 0),
        creditsOutstanding: db.ledger.reduce((n, l) => n + l.delta, 0),
      };
    });
  },

  countSignup(ipHash: string, forDate: string, limit: number) {
    return tx((db) => {
      let q = db.ipQuota.find((x) => x.ipHash === ipHash && x.forDate === forDate);
      if (!q) { q = { ipHash, forDate, readings: 0, signups: 0, keys: [] }; db.ipQuota.push(q); }
      if (q.signups >= limit) return false;
      q.signups += 1;
      return true;
    });
  },
};
