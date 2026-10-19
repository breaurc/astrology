import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

let cached: string | null = null;

/** Folder for local data (users file, dev secret). Git-ignored. */
export function dataDir(): string {
  return process.env.ASTRO_DATA_DIR || join(process.cwd(), ".data");
}

/**
 * Secret used to sign session and OAuth-state cookies.
 * Production must set AUTH_SECRET; in development one is generated once and kept in .data/ so sessions survive restarts.
 */
export function getSecret(): string {
  if (cached) return cached;
  const env = process.env.AUTH_SECRET;
  if (env && env.length >= 32) return (cached = env);
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set (at least 32 characters) in production.");
  }
  const file = join(dataDir(), "dev-auth-secret");
  try {
    cached = readFileSync(file, "utf8").trim();
    if (cached.length >= 32) return cached;
  } catch {
    /* create below */
  }
  mkdirSync(dataDir(), { recursive: true });
  cached = randomBytes(48).toString("base64url");
  writeFileSync(file, cached, { mode: 0o600 });
  return cached;
}
