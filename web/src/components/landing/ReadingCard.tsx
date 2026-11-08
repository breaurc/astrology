"use client";

import { ANIMALS, CATEGORIES, ELEMENTS, PLANETS, RELATIONS, SIGNS, SIGN_GLYPHS, fill, longDate, t, type Locale } from "@/lib/i18n";
import { SYSTEMS, type Reading, type ReadingSystem } from "@/lib/types";

interface Props {
  locale: Locale;
  reading: Reading | null;
  system: ReadingSystem;
  onSystem: (s: ReadingSystem) => void;
  name?: string;
  busy?: boolean;
  onEdit?: () => void;
}

/** The free reading: date, computed facts for the chosen system, about 4 lines of text (SPEC section 3.1). */
export default function ReadingCard({ locale, reading, system, onSystem, name, busy, onEdit }: Props) {
  const d = t(locale);
  const r = d.reading;
  const facts = reading ? factChips(reading, locale) : [];
  return (
    <section className="card reading-card" aria-live="polite" aria-busy={busy}>
      <div className="between">
        <div className="chips" role="tablist" aria-label="System">
          {SYSTEMS.map((s) => (
            <button key={s} type="button" role="tab" className="chip" aria-selected={system === s} onClick={() => onSystem(s)}>{d.landing.systems[s]}</button>
          ))}
        </div>
        {onEdit && <button type="button" className="link quiet phone-only" onClick={onEdit}>← {d.landing.edit}</button>}
      </div>
      <div className="reading-head">
        <h2>{reading ? fill(r.today, { date: longDate(reading.date, locale) }) : "…"}</h2>
        {name && <span className="facts-line">{name}</span>}
      </div>
      <div className="facts">
        {facts.map((f) => <span className="fact" key={f.label}>{f.label}: <b>{f.value}</b></span>)}
      </div>
      {reading
        ? <p className="reading-text" style={busy ? { opacity: 0.5 } : undefined}>{reading.text}</p>
        : <p className="reading-text muted"><span className="spinner" aria-hidden /> {d.landing.busy}</p>}
      <p className="reading-note">{r.note}</p>
    </section>
  );
}

function factChips(reading: Reading, locale: Locale): { label: string; value: string }[] {
  const r = t(locale).reading;
  const f = reading.facts as Record<string, unknown>;
  const signs = SIGNS[locale];
  const out: { label: string; value: string }[] = [];
  const sign = (k: string) => `${SIGN_GLYPHS[k] ?? ""} ${signs[k] ?? k}`.trim();
  if (reading.system === "WESTERN") {
    if (f.sunSign) out.push({ label: locale === "ro" ? "Soare" : "Sun", value: sign(String(f.sunSign)) });
    if (f.moonSign) out.push({ label: locale === "ro" ? "Lună" : "Moon", value: sign(String(f.moonSign)) });
    if (f.risingSign) out.push({ label: r.rising, value: sign(String(f.risingSign)) });
    if (f.transitMoonSign) out.push({ label: r.moonIn, value: `${signs[String(f.transitMoonSign)] ?? f.transitMoonSign}${f.moonPhase ? ` · ${t(locale).phase[String(f.moonPhase)] ?? ""}` : ""}` });
    if (Array.isArray(f.retrogrades) && f.retrogrades.length) out.push({ label: r.retro, value: (f.retrogrades as string[]).map((p) => PLANETS[locale][p] ?? p).join(", ") });
  } else if (reading.system === "CHINESE") {
    if (f.animal) out.push({ label: locale === "ro" ? "Zodie" : "Sign", value: `${ANIMALS[locale][String(f.animal)] ?? f.animal} · ${ELEMENTS[locale][String(f.yinYang)] ?? ""} ${ELEMENTS[locale][String(f.element)] ?? ""}`.trim() });
    if (f.dayAnimal) out.push({ label: r.dayOf, value: `${ANIMALS[locale][String(f.dayAnimal)] ?? f.dayAnimal} · ${RELATIONS[locale][String(f.relation)] ?? ""}` });
    if (Array.isArray(f.favorable) && f.favorable.length) out.push({ label: r.favorable, value: (f.favorable as string[]).map((c) => CATEGORIES[locale][c] ?? c).join(", ") });
    if (Array.isArray(f.unfavorable) && f.unfavorable.length) out.push({ label: r.unfavorable, value: (f.unfavorable as string[]).map((c) => CATEGORIES[locale][c] ?? c).join(", ") });
  } else {
    if (f.lifePath != null) out.push({ label: r.lifePath, value: String(f.lifePath) });
    if (f.expression != null) out.push({ label: locale === "ro" ? "Expresie" : "Expression", value: String(f.expression) });
    if (f.personalDay != null) out.push({ label: r.personalDay, value: String(f.personalDay) });
  }
  return out;
}
