/**
 * Shared (client + server) profile model and validation.
 * A profile is the raw birth data a person gave us; everything astrological is recomputed by the engine.
 */
import type { Birth } from "./api";

export type TimeAccuracy = "exact" | "approx" | "unknown";
export type Gender = "female" | "male" | "other";

export const FOCUS_AREAS = ["LOVE", "CAREER", "MONEY", "WELLBEING", "TRAVEL", "HOME", "COMMUNICATION"] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];

export interface Place {
  label: string;      // "Iași, Iași, România"
  latitude: number;
  longitude: number;
  zone: string;       // IANA time zone
  country?: string;
}

export interface BirthProfile {
  displayName?: string;   // what we call you
  birthName?: string;     // full name at birth, for numerology
  date: string;           // yyyy-mm-dd
  time: string | null;    // HH:mm, null when unknown
  timeAccuracy: TimeAccuracy;
  place: Place;
  gender?: Gender | null;
  focus: FocusArea[];
  updatedAt?: string;
}

export interface PublicUser {
  id: string;
  email?: string;
  name?: string;
  providers: string[];    // "password" | "google" | "facebook"
  createdAt: string;
  consentAt?: string;
  consentVersion?: string;
}

export interface SessionInfo {
  user: PublicUser | null;
  profile: BirthProfile | null;
}

/** Converts a saved profile into the engine's birth payload. */
export function toBirth(p: BirthProfile): Birth {
  return {
    name: p.birthName || p.displayName || undefined,
    date: p.date,
    time: p.timeAccuracy === "unknown" ? null : p.time,
    zone: p.place.zone,
    latitude: p.place.latitude,
    longitude: p.place.longitude,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isRealDate(iso: string): boolean {
  if (!DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function cleanText(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : undefined;
}

/** Validates untrusted input; returns the normalized profile or a list of field errors. */
export function validateProfile(input: unknown): { ok: true; profile: BirthProfile } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const o = (input ?? {}) as Record<string, unknown>;
  const place = (o.place ?? {}) as Record<string, unknown>;

  const date = typeof o.date === "string" ? o.date : "";
  if (!isRealDate(date)) errors.push("date");
  else if (date < "1900-01-01" || date > new Date().toISOString().slice(0, 10)) errors.push("date");

  const timeAccuracy: TimeAccuracy = o.timeAccuracy === "exact" || o.timeAccuracy === "approx" ? o.timeAccuracy : "unknown";
  let time: string | null = null;
  if (timeAccuracy !== "unknown") {
    if (typeof o.time === "string" && TIME_RE.test(o.time)) time = o.time;
    else errors.push("time");
  }

  const lat = Number(place.latitude);
  const lon = Number(place.longitude);
  const zone = typeof place.zone === "string" ? place.zone : "";
  const label = cleanText(place.label, 160);
  if (!label) errors.push("place");
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push("latitude");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.push("longitude");
  if (!zone || !isZone(zone)) errors.push("zone");

  const gender = o.gender === "female" || o.gender === "male" || o.gender === "other" ? o.gender : null;
  const focus = Array.isArray(o.focus)
    ? Array.from(new Set(o.focus.filter((f): f is FocusArea => (FOCUS_AREAS as readonly string[]).includes(f as string))))
    : [];

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    profile: {
      displayName: cleanText(o.displayName, 60),
      birthName: cleanText(o.birthName, 120),
      date,
      time,
      timeAccuracy,
      place: { label: label!, latitude: Math.round(lat * 1e4) / 1e4, longitude: Math.round(lon * 1e4) / 1e4, zone,
        country: cleanText(place.country, 60) },
      gender,
      focus,
    },
  };
}

/** Life path number, computed client-side for the instant preview while typing. */
export function lifePath(iso: string): number | null {
  if (!isRealDate(iso)) return null;
  const reduce = (n: number): number => {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = String(n).split("").reduce((a, c) => a + Number(c), 0);
    return n;
  };
  const [y, m, d] = iso.split("-").map(Number);
  return reduce(reduce(y) + reduce(m) + reduce(d));
}
