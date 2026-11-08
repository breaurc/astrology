"use client";

import type { Birth } from "./api";
import type { BirthProfile, Place } from "./profile";
import { isRealDate } from "./profile";
import type { ReadingSystem } from "./types";
import { browserZone } from "./account";

/**
 * The anonymous visitor's inputs and chosen system, kept in localStorage under `astro.inputs` (HLD section 2)
 * so a refresh does not ask again and the data survives the sign-in redirect.
 */
export interface Inputs {
  name: string;
  date: string;          // yyyy-mm-dd
  time: string;          // HH:mm or ""
  place: Place | null;
  system: ReadingSystem;
}

const INPUTS_KEY = "astro.inputs";
const LEGACY_DRAFT_KEY = "astro.draftProfile";

export const EMPTY_INPUTS: Inputs = { name: "", date: "", time: "", place: null, system: "WESTERN" };

export function loadInputs(): Inputs {
  try {
    const raw = localStorage.getItem(INPUTS_KEY);
    if (raw) return { ...EMPTY_INPUTS, ...(JSON.parse(raw) as Partial<Inputs>) };
    // Older visitors may still have the wizard draft: carry it over once.
    const legacy = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (legacy) {
      const d = JSON.parse(legacy) as Partial<BirthProfile>;
      const migrated: Inputs = { ...EMPTY_INPUTS, name: d.displayName ?? "", date: d.date ?? "", time: d.time ?? "", place: d.place ?? null };
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      saveInputs(migrated);
      return migrated;
    }
  } catch {
    /* private mode or disabled storage */
  }
  return EMPTY_INPUTS;
}

export function saveInputs(i: Inputs) {
  try {
    localStorage.setItem(INPUTS_KEY, JSON.stringify(i));
  } catch {
    /* ignore */
  }
}

export function clearInputs() {
  try {
    localStorage.removeItem(INPUTS_KEY);
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Field-level validation for the landing form; the place is only required outside numerology. */
export function inputErrors(i: Inputs): string[] {
  const errors: string[] = [];
  if (!isRealDate(i.date) || i.date < "1900-01-01" || i.date > new Date().toISOString().slice(0, 10)) errors.push("date");
  if (i.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(i.time)) errors.push("time");
  if (i.system !== "NUMEROLOGY" && !i.place) errors.push("place");
  if (i.name.length > 120) errors.push("name");
  return errors;
}

/** The engine payload; numerology without a place uses the browser zone and 0,0. */
export function toBirthPayload(i: Inputs): Birth {
  return {
    name: i.name.trim() || undefined,
    date: i.date,
    time: i.time || null,
    zone: i.place?.zone ?? browserZone(),
    latitude: i.place?.latitude ?? 0,
    longitude: i.place?.longitude ?? 0,
  };
}

/** What gets saved to the account after sign-in (SPEC: gate 1 is exactly where stored data begins). */
export function toProfile(i: Inputs): BirthProfile | null {
  if (!i.place || !isRealDate(i.date)) return null;
  return {
    displayName: i.name.trim() || undefined,
    date: i.date,
    time: i.time || null,
    timeAccuracy: i.time ? "exact" : "unknown",
    place: i.place,
    focus: [],
  };
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
