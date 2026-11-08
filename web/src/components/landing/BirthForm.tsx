"use client";

import { useId } from "react";
import { t, type Locale } from "@/lib/i18n";
import type { Inputs } from "@/lib/inputs";
import { SYSTEMS, type ReadingSystem } from "@/lib/types";
import PlaceSearch from "../account/PlaceSearch";

interface Props {
  locale: Locale;
  value: Inputs;
  onChange: (next: Inputs) => void;
  onSubmit: () => void;
  busy?: boolean;
  errors?: string[];
  /** The Western / Chinese / Numerology picker (landing only). */
  systems?: boolean;
  submitLabel?: string;
  busyLabel?: string;
  /** A server-side message (quota, engine down) shown in the reserved line under the fields. */
  message?: string | null;
}

/** The one-step form (SPEC section 3.1): name, date, optional time, place, system picker. */
export default function BirthForm({ locale, value, onChange, onSubmit, busy, errors = [], systems = true, submitLabel, busyLabel, message }: Props) {
  const d = t(locale).landing;
  const id = useId();
  const set = (p: Partial<Inputs>) => onChange({ ...value, ...p });
  const bad = (k: string) => (errors.includes(k) ? " invalid" : "");
  const placeOptional = value.system === "NUMEROLOGY";
  // One line of fixed height carries the field error, the server message or the numerology note, so the
  // button below never moves (controls stay put whatever the state).
  const firstError = errors.find((k) => d.errors[k]);
  const note = firstError ? d.errors[firstError] : message ? message : placeOptional ? d.placeNote : "";

  return (
    <form className="stack loose" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
      {systems && (
        <div className="segmented" role="tablist" aria-label="System">
          {SYSTEMS.map((s: ReadingSystem) => (
            <button key={s} type="button" role="tab" aria-selected={value.system === s} onClick={() => set({ system: s })}>{d.systems[s]}</button>
          ))}
        </div>
      )}
      <div className="form-grid">
        <div className={`field span2${bad("name")}`}>
          <label htmlFor={`${id}-name`}>{d.name}</label>
          <input id={`${id}-name`} value={value.name} placeholder={d.namePh} autoComplete="given-name" maxLength={120} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className={`field${bad("date")}`}>
          <label htmlFor={`${id}-date`}>{d.date}</label>
          <input id={`${id}-date`} type="date" value={value.date} min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required
            onChange={(e) => set({ date: e.target.value })} />
        </div>
        <div className={`field${bad("time")}`}>
          <label htmlFor={`${id}-time`}>{d.time}</label>
          <input id={`${id}-time`} type="time" value={value.time} onChange={(e) => set({ time: e.target.value })} />
        </div>
        <div className={`field span2${bad("place")}`}>
          <label htmlFor={`${id}-place`}>{d.place}</label>
          <PlaceSearch locale={locale} value={value.place} onChange={(p) => set({ place: p })} />
        </div>
      </div>
      <div className={`form-note${firstError || message ? " error" : ""}`} role="status" aria-live="polite">{note || " "}</div>
      <button className="btn big" type="submit" disabled={busy}>
        {busy && <span className="spinner" aria-hidden />}{busy ? (busyLabel ?? d.busy) : (submitLabel ?? d.submit)}
      </button>
    </form>
  );
}
