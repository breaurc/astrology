import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { BirthProfile, PublicUser } from "../profile";
import { dataDir } from "./secret";

/**
 * User store. This implementation keeps everything in one JSON file (web/.data/users.json), which is enough for
 * development and a demo. For production, implement the same functions over PostgreSQL (or call the Spring engine)
 * — nothing else in the app touches the file.
 */
export interface Identity { provider: "google" | "facebook"; subject: string; }

export interface UserRecord {
  id: string;
  email?: string;           // lower-case
  emailVerified?: boolean;  // true when an OAuth provider vouched for it
  name?: string;
  passwordHash?: string;
  identities: Identity[];
  createdAt: string;
  consentAt?: string;       // explicit consent to store birth data (GDPR art. 6/7)
  profile?: BirthProfile;
}

interface DB { users: UserRecord[]; }

let queue: Promise<unknown> = Promise.resolve();

function file() {
  return join(dataDir(), "users.json");
}

function load(): DB {
  try {
    return JSON.parse(readFileSync(file(), "utf8")) as DB;
  } catch {
    return { users: [] };
  }
}

function save(db: DB) {
  mkdirSync(dataDir(), { recursive: true });
  const tmp = `${file()}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
  renameSync(tmp, file());
}

/** Serializes read-modify-write cycles so concurrent requests don't overwrite each other. */
function tx<T>(fn: (db: DB) => T): Promise<T> {
  const run = queue.then(() => {
    const db = load();
    const out = fn(db);
    save(db);
    return out;
  });
  queue = run.catch(() => undefined);
  return run;
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export function toPublic(u: UserRecord): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    providers: [...(u.passwordHash ? ["password"] : []), ...u.identities.map((i) => i.provider)],
    createdAt: u.createdAt,
    consentAt: u.consentAt,
  };
}

export const store = {
  async byId(id: string): Promise<UserRecord | undefined> {
    await queue;
    return load().users.find((u) => u.id === id);
  },

  async byEmail(email: string): Promise<UserRecord | undefined> {
    await queue;
    const e = normalizeEmail(email);
    return load().users.find((u) => u.email === e);
  },

  /** Creates an email + password account; returns null when the email is taken. */
  createWithPassword(email: string, passwordHash: string, name: string | undefined, consent: boolean) {
    return tx((db) => {
      const e = normalizeEmail(email);
      if (db.users.some((u) => u.email === e)) return null;
      const now = new Date().toISOString();
      const u: UserRecord = { id: randomUUID(), email: e, name, passwordHash, identities: [], createdAt: now,
        consentAt: consent ? now : undefined };
      db.users.push(u);
      return u;
    });
  },

  /**
   * Finds or creates the user for an OAuth login. Links to an existing account only when the provider says the
   * email is verified (prevents account takeover through an unverified address).
   */
  upsertOAuth(identity: Identity, info: { email?: string; emailVerified: boolean; name?: string }, consent: boolean) {
    return tx((db) => {
      const now = new Date().toISOString();
      let u = db.users.find((x) => x.identities.some((i) => i.provider === identity.provider && i.subject === identity.subject));
      const email = info.email ? normalizeEmail(info.email) : undefined;
      if (!u && email && info.emailVerified) {
        u = db.users.find((x) => x.email === email);
        if (u) {
          u.identities.push(identity);
          u.emailVerified = true;
        }
      }
      if (!u) {
        u = { id: randomUUID(), email: email && !db.users.some((x) => x.email === email) ? email : undefined,
          emailVerified: info.emailVerified, name: info.name, identities: [identity], createdAt: now };
        db.users.push(u);
      }
      if (!u.name && info.name) u.name = info.name;
      if (consent && !u.consentAt) u.consentAt = now;
      return u;
    });
  },

  saveProfile(id: string, profile: BirthProfile, consent: boolean) {
    return tx((db) => {
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      if (consent && !u.consentAt) u.consentAt = new Date().toISOString();
      if (!u.consentAt) return "consent" as const;
      u.profile = { ...profile, updatedAt: new Date().toISOString() };
      if (!u.name && profile.displayName) u.name = profile.displayName;
      return u;
    });
  },

  remove(id: string) {
    return tx((db) => {
      const before = db.users.length;
      db.users = db.users.filter((u) => u.id !== id);
      return db.users.length < before;
    });
  },
};
