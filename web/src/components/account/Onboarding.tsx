"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { account, AccountError, clearDraft, isComplete, loadDraft, saveDraft } from "@/lib/account";
import { ANIMALS, SIGN_GLYPHS, SIGNS, t, type Locale } from "@/lib/i18n";
import { fill, ta } from "@/lib/i18n-account";
import { FOCUS_AREAS, isRealDate, lifePath, type BirthProfile, type FocusArea, type Gender, type SessionInfo, type TimeAccuracy } from "@/lib/profile";
import AuthPanel from "./AuthPanel";
import CosmicCard, { ANIMAL_GLYPHS, glyph, todayIso, useReading } from "./CosmicCard";
import PlaceSearch from "./PlaceSearch";

const STEPS = ["name", "date", "time", "place", "about", "reveal"] as const;
type Step = (typeof STEPS)[number];
const QUESTIONS = STEPS.length - 1;

type Draft = Partial<BirthProfile>;

/** One question per screen, a live preview of the signs, results before any sign-up, then save. */
export default function Onboarding({ locale }: { locale: Locale }) {
  const w = ta(locale).wizard;
  const [draft, setDraft] = useState<Draft>({ focus: [] });
  const [stepIx, setStepIx] = useState(0);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const step: Step = STEPS[stepIx];
  const meUrl = `/${locale}/me?welcome=1`;

  // Restore a draft (e.g. coming back from Google) or start from the saved profile when editing.
  useEffect(() => {
    const d = loadDraft();
    account.session().then((s) => {
      setSession(s);
      if (!d && s.profile) setDraft(s.profile);
    }).catch(() => setSession({ user: null, profile: null }));
    if (d) setDraft({ focus: [], ...d });
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveDraft(draft);
  }, [draft, loaded]);

  // Browser back button moves between steps.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setStepIx(typeof e.state?.step === "number" ? e.state.step : 0);
    window.history.replaceState({ step: 0 }, "");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(ix: number) {
    setStepIx(ix);
    window.history.pushState({ step: ix }, "");
    window.scrollTo({ top: 0 });
  }

  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }));
  const valid = stepValid(step, draft);

  return (
    <main className="onboard">
      <header className="onboard-top">
        <a href={`/${locale}`} className="brand">✦ Astro</a>
        {step !== "reveal" && (
          <div className="progress" aria-label={fill(w.stepOf, { n: stepIx + 1, total: QUESTIONS })}>
            <span>{fill(w.stepOf, { n: stepIx + 1, total: QUESTIONS })}</span>
            <div className="track"><div style={{ width: `${((stepIx + 1) / QUESTIONS) * 100}%` }} /></div>
          </div>
        )}
      </header>

      {step !== "reveal" && <Preview locale={locale} draft={draft} />}

      {step === "reveal" ? (
        <Reveal locale={locale} draft={draft} session={session} meUrl={meUrl} onEdit={() => go(0)} />
      ) : (
        <form
          className="step" key={step}
          onSubmit={(e) => { e.preventDefault(); if (valid) go(stepIx + 1); }}
        >
          {step === "name" && <NameStep locale={locale} draft={draft} set={set} />}
          {step === "date" && <DateStep locale={locale} draft={draft} set={set} />}
          {step === "time" && <TimeStep locale={locale} draft={draft} set={set} />}
          {step === "place" && (
            <>
              <h1>{w.place.title}</h1>
              <p className="hint">{w.place.hint}</p>
              <PlaceSearch locale={locale} value={draft.place ?? null} onChange={(p) => set({ place: p ?? undefined })} autoFocus />
            </>
          )}
          {step === "about" && <AboutStep locale={locale} draft={draft} set={set} />}

          <div className="step-nav">
            {stepIx > 0 ? <button type="button" className="btn ghost" onClick={() => window.history.back()}>{w.back}</button> : <span />}
            <div className="step-nav-right">
              {(step === "name" || step === "about") && (
                <button type="button" className="link" onClick={() => go(stepIx + 1)}>{w.skip}</button>
              )}
              <button className="btn" type="submit" disabled={!valid}>{step === "about" ? w.finish : w.next}</button>
            </div>
          </div>
        </form>
      )}
    </main>
  );
}

function stepValid(step: Step, d: Draft): boolean {
  switch (step) {
    case "date": return !!d.date && isRealDate(d.date) && d.date >= "1900-01-01" && d.date <= todayIso();
    case "time": return !!d.timeAccuracy && (d.timeAccuracy === "unknown" || /^\d{2}:\d{2}$/.test(d.time ?? ""));
    case "place": return !!d.place;
    default: return true;
  }
}

interface StepProps { locale: Locale; draft: Draft; set: (p: Draft) => void; }

function NameStep({ locale, draft, set }: StepProps) {
  const w = ta(locale).wizard.name;
  const [showBirth, setShowBirth] = useState(!!draft.birthName);
  return (
    <>
      <h1>{w.title}</h1>
      <p className="hint">{w.hint}</p>
      <label htmlFor="displayName" className="sr-only">{w.label}</label>
      <input id="displayName" className="big-input" value={draft.displayName ?? ""} autoComplete="given-name" autoFocus
        maxLength={60} placeholder={w.label} onChange={(e) => set({ displayName: e.target.value })} />
      {showBirth ? (
        <div className="field" style={{ marginTop: 18 }}>
          <label htmlFor="birthName">{w.birthName}</label>
          <input id="birthName" value={draft.birthName ?? ""} autoComplete="name" maxLength={120} onChange={(e) => set({ birthName: e.target.value })} />
          <small className="muted">{w.birthNameHint}</small>
        </div>
      ) : (
        <button type="button" className="link" style={{ marginTop: 14 }} onClick={() => setShowBirth(true)}>+ {w.birthNameToggle}</button>
      )}
    </>
  );
}

function DateStep({ locale, draft, set }: StepProps) {
  const w = ta(locale).wizard.date;
  const months = ta(locale).months;
  const [y0, m0, d0] = (draft.date ?? "--").split("-");
  const [day, setDay] = useState(d0 ? String(Number(d0)) : "");
  const [month, setMonth] = useState(m0 ? String(Number(m0)) : "");
  const [year, setYear] = useState(y0 ?? "");
  const dayRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { dayRef.current?.focus(); }, []);

  useEffect(() => {
    if (day && month && /^\d{4}$/.test(year)) set({ date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` });
    else set({ date: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month, year]);

  const complete = day && month && /^\d{4}$/.test(year);
  const iso = complete ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : "";
  const problem = complete && !isRealDate(iso) ? w.invalid : complete && iso > todayIso() ? w.future : null;

  return (
    <>
      <h1>{w.title}</h1>
      <p className="hint">{w.hint}</p>
      <div className="date-row">
        <div className="field">
          <label htmlFor="bday">{w.day}</label>
          <select id="bday" ref={dayRef} value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">—</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="bmonth">{w.month}</label>
          <select id="bmonth" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">—</option>
            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="byear">{w.year}</label>
          <input id="byear" inputMode="numeric" autoComplete="bday-year" maxLength={4} placeholder="1990" value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </div>
      </div>
      {problem && <p className="field-error" role="alert">{problem}</p>}
    </>
  );
}

function TimeStep({ locale, draft, set }: StepProps) {
  const w = ta(locale).wizard.time;
  const options: { v: TimeAccuracy; title: string; note: string }[] = [
    { v: "exact", title: w.exact, note: w.exactNote },
    { v: "approx", title: w.approx, note: w.approxNote },
    { v: "unknown", title: w.unknown, note: w.unknownNote },
  ];
  const needsTime = draft.timeAccuracy === "exact" || draft.timeAccuracy === "approx";
  return (
    <>
      <h1>{w.title}</h1>
      <p className="hint">{w.hint}</p>
      <div className="choices" role="radiogroup" aria-label={w.title}>
        {options.map((o) => (
          <label key={o.v} className={`choice${draft.timeAccuracy === o.v ? " on" : ""}`}>
            <input type="radio" name="acc" value={o.v} checked={draft.timeAccuracy === o.v}
              onChange={() => set({ timeAccuracy: o.v, time: o.v === "unknown" ? null : draft.time ?? null })} />
            <b>{o.title}</b>
            <small>{o.note}</small>
          </label>
        ))}
      </div>
      {needsTime && (
        <div className="field time-field">
          <label htmlFor="btime">{w.label}</label>
          <input id="btime" type="time" autoFocus value={draft.time ?? ""} onChange={(e) => set({ time: e.target.value || null })} />
        </div>
      )}
    </>
  );
}

function AboutStep({ locale, draft, set }: StepProps) {
  const w = ta(locale).wizard.about;
  const focusNames = ta(locale).focus;
  const genders: { v: Gender; l: string }[] = [{ v: "female", l: w.female }, { v: "male", l: w.male }, { v: "other", l: w.other }];
  const focus = draft.focus ?? [];
  const toggle = (f: FocusArea) => set({ focus: focus.includes(f) ? focus.filter((x) => x !== f) : [...focus, f] });
  return (
    <>
      <h1>{w.title}</h1>
      <p className="hint">{w.hint}</p>
      <fieldset className="group">
        <legend>{w.focus}</legend>
        <div className="pills">
          {FOCUS_AREAS.map((f) => (
            <button type="button" key={f} className={`pill-btn${focus.includes(f) ? " on" : ""}`} aria-pressed={focus.includes(f)} onClick={() => toggle(f)}>
              {focusNames[f]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="group">
        <legend>{w.gender} <small className="muted">· {w.genderNote}</small></legend>
        <div className="pills">
          {genders.map((g) => (
            <button type="button" key={g.v} className={`pill-btn${draft.gender === g.v ? " on" : ""}`} aria-pressed={draft.gender === g.v}
              onClick={() => set({ gender: draft.gender === g.v ? null : g.v })}>
              {g.l}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}

/** Chips that fill in as answers arrive: Sun sign, Chinese animal, life path, then Moon and Rising. */
function Preview({ locale, draft }: { locale: Locale; draft: Draft }) {
  const w = ta(locale).wizard;
  const c = ta(locale).card;
  const d = t(locale);
  const [sky, setSky] = useState<{ sun?: string; moon?: string; rising?: string; animal?: string } | null>(null);
  const dateOk = !!draft.date && isRealDate(draft.date) && draft.date <= todayIso();
  const timeKnown = draft.timeAccuracy === "exact" || draft.timeAccuracy === "approx";
  const key = JSON.stringify([draft.date, draft.time, draft.timeAccuracy, draft.place?.zone, draft.place?.latitude, draft.place?.longitude]);

  useEffect(() => {
    if (!dateOk) { setSky(null); return; }
    let cancelled = false;
    const place = draft.place ?? { latitude: 44.43, longitude: 26.1, zone: "Europe/Bucharest" };
    const birth = { date: draft.date!, time: timeKnown && draft.time ? draft.time : "12:00", zone: place.zone,
      latitude: place.latitude, longitude: place.longitude };
    const h = setTimeout(() => {
      Promise.all([api.chart(birth), api.chinese(birth, todayIso())]).then(([chart, ch]) => {
        if (cancelled) return;
        setSky({
          sun: chart.sunSign,
          moon: timeKnown || draft.timeAccuracy === "unknown" ? chart.moonSign : undefined,
          rising: timeKnown && draft.place ? chart.risingSign : undefined,
          animal: ch.profile.animal,
        });
      }).catch(() => !cancelled && setSky(null));
    }, 200);
    return () => { cancelled = true; clearTimeout(h); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const lp = dateOk ? lifePath(draft.date!) : null;
  if (!sky && !lp) return <div className="preview empty-preview" aria-hidden>✦ ✦ ✦</div>;
  return (
    <div className="preview" aria-live="polite">
      <span className="preview-label">{w.preview}</span>
      {sky?.sun && <span className="chip">{glyph(SIGN_GLYPHS[sky.sun])} {c.sun} · {SIGNS[locale][sky.sun]}</span>}
      {sky?.moon && <span className="chip">☽ {c.moon} · {SIGNS[locale][sky.moon]}</span>}
      {sky?.rising && <span className="chip">↑ {c.rising} · {SIGNS[locale][sky.rising]}</span>}
      {sky?.animal && <span className="chip">{ANIMAL_GLYPHS[sky.animal]} {ANIMALS[locale][sky.animal]}</span>}
      {lp && <span className="chip">{d.lifePath} · {lp}</span>}
    </div>
  );
}

function Reveal({ locale, draft, session, meUrl, onEdit }: {
  locale: Locale; draft: Draft; session: SessionInfo | null; meUrl: string; onEdit: () => void;
}) {
  const r = ta(locale).wizard.reveal;
  const a = ta(locale).auth;
  const profile = isComplete(draft) ? draft : null;
  const { reading, error } = useReading(profile, locale);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const signedIn = !!session?.user;
  const needsConsent = signedIn && !session?.user?.consentAt;

  if (!profile) {
    return <div className="step"><p>…</p><button className="btn" onClick={onEdit}>{r.edit}</button></div>;
  }

  async function saveAndGo(withConsent: boolean) {
    setBusy(true);
    setSaveError(null);
    try {
      await account.saveProfile(profile!, withConsent);
      clearDraft();
      window.location.href = meUrl;
    } catch (e) {
      // Consent missing on an older account: the profile page offers to save the draft with consent.
      if (e instanceof AccountError && e.code === "consent_required") window.location.href = meUrl;
      else setSaveError(a.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reveal">
      <h1>{draft.displayName ? fill(r.title, { name: draft.displayName }) : r.titleAnon}</h1>
      <CosmicCard locale={locale} profile={profile} reading={reading} error={error} />
      <button type="button" className="link" onClick={onEdit}>← {r.edit}</button>

      <div className="save-box">
        {signedIn ? (
          <>
            <h2>{r.saveSignedIn}</h2>
            {needsConsent && (
              <label className="consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>{a.consent}</span>
              </label>
            )}
            {saveError && <div className="alert" role="alert">{saveError}</div>}
            <button className="btn wide" disabled={busy || (needsConsent && !consent)} onClick={() => saveAndGo(consent)}>
              {busy ? r.saving : r.saveSignedIn}
            </button>
          </>
        ) : (
          <>
            <h2>{r.save}</h2>
            <p className="muted">{r.saveNote}</p>
            <AuthPanel locale={locale} next={meUrl} defaultName={draft.displayName}
              onAuthenticated={() => saveAndGo(false)} />
          </>
        )}
      </div>
      {!signedIn && <a className="link center block" href={`/${locale}`}>{r.guest} →</a>}
    </section>
  );
}
