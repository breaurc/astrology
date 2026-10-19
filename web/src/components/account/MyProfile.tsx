"use client";

import { useEffect, useState } from "react";
import { account, AccountError, clearDraft, isComplete, loadDraft } from "@/lib/account";
import { CATEGORIES, PHASE_GLYPHS, t, type Locale } from "@/lib/i18n";
import { fill, ta } from "@/lib/i18n-account";
import { FOCUS_AREAS, isRealDate, type BirthProfile, type FocusArea, type Gender, type SessionInfo, type TimeAccuracy } from "@/lib/profile";
import ScoreDial from "../ScoreDial";
import CosmicCard, { useReading } from "./CosmicCard";
import PlaceSearch from "./PlaceSearch";

/** Signed-in home: today's score, cosmic ID, the stored birth data (editable) and account / GDPR controls. */
export default function MyProfile({ locale }: { locale: Locale }) {
  const m = ta(locale).me;
  const [s, setS] = useState<SessionInfo | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [pending, setPending] = useState<BirthProfile | null>(null);

  useEffect(() => {
    setWelcome(new URLSearchParams(window.location.search).has("welcome"));
    (async () => {
      let session = await account.session();
      if (!session.user) {
        window.location.replace(`/${locale}/login?next=${encodeURIComponent(`/${locale}/me`)}`);
        return;
      }
      // Birth data typed before signing in (e.g. before the Google redirect) is saved now.
      const draft = loadDraft();
      if (isComplete(draft) && (!session.profile || new URLSearchParams(window.location.search).has("welcome"))) {
        try {
          session = await account.saveProfile(draft);
          clearDraft();
        } catch (e) {
          if (e instanceof AccountError && e.code === "consent_required") setPending(draft);
        }
      }
      setS(session);
    })().catch(() => setS({ user: null, profile: null }));
  }, [locale]);

  if (!s?.user) return <main className="me"><p className="empty">…</p></main>;
  const name = s.profile?.displayName || s.user.name;

  return (
    <main className="me">
      <header className="me-top">
        <a href={`/${locale}`} className="brand">✦ Astro</a>
        <nav className="lang" aria-label="Language">
          {(["ro", "en"] as const).map((l) => <a key={l} href={`/${l}/me`} aria-current={l === locale ? "page" : undefined}>{l.toUpperCase()}</a>)}
        </nav>
      </header>
      <h1>{name ? fill(m.hello, { name }) : m.helloAnon}</h1>
      {welcome && s.profile && <p className="toast" role="status">✓ {m.welcome}</p>}

      {pending && <ConsentToSave locale={locale} draft={pending} onSaved={(n) => { setS(n); setPending(null); clearDraft(); }} />}

      {s.profile ? (
        <>
          <ProfileOverview locale={locale} profile={s.profile} />
          <BirthData locale={locale} profile={s.profile} onSaved={setS} />
        </>
      ) : !pending && (
        <section className="card empty-profile">
          <h2>{m.noProfileTitle}</h2>
          <p className="muted">{m.noProfileText}</p>
          <a className="btn" href={`/${locale}/start`}>{m.noProfileCta}</a>
        </section>
      )}

      <AccountBox locale={locale} session={s} />
    </main>
  );
}

function ProfileOverview({ locale, profile }: { locale: Locale; profile: BirthProfile }) {
  const m = ta(locale).me;
  const d = t(locale);
  const { reading, error } = useReading(profile, locale);
  const day = reading?.day;
  const overall = day?.categories.GENERAL;
  const order: string[] = [...profile.focus, ...FOCUS_AREAS.filter((f) => !profile.focus.includes(f))];
  const top = day ? order.filter((k) => day.categories[k]).slice(0, 4) : [];
  const phase = day?.context.moonPhase;

  return (
    <>
      <section className="card today-card">
        <h2>{m.todayTitle}</h2>
        {overall ? (
          <div className="today-grid">
            <ScoreDial score={overall.score} verdict={overall.verdict} glyph={phase ? PHASE_GLYPHS[phase] : undefined} />
            <div>
              <p className={`verdict ${overall.verdict}`}>{d.verdict[overall.verdict]}</p>
              {overall.reasons[0] && <p className="muted" style={{ marginTop: 0 }}>{overall.reasons[0].text}</p>}
              <div className="scores">
                {top.map((k) => {
                  const v = day!.categories[k];
                  return (
                    <div className="score-row" key={k}>
                      <span>{CATEGORIES[locale][k]}</span>
                      <div className="bar"><div className={`fill ${v.verdict}`} style={{ width: `${v.score * 10}%` }} /></div>
                      <span className="n">{v.score}</span>
                    </div>
                  );
                })}
              </div>
              <div className="actions">
                <a className="btn" href={`/${locale}`}>{m.openReading}</a>
                <a className="link" href={`/${locale}#ask`}>{m.askLink} →</a>
              </div>
            </div>
          </div>
        ) : error ? <div className="alert">{d.error}</div> : <p className="empty">…</p>}
      </section>
      <section className="card">
        <CosmicCard locale={locale} profile={profile} reading={reading} error={error} showToday={false} />
      </section>
    </>
  );
}

function BirthData({ locale, profile, onSaved }: { locale: Locale; profile: BirthProfile; onSaved: (s: SessionInfo) => void }) {
  const m = ta(locale).me;
  const w = ta(locale).wizard;
  const focusNames = ta(locale).focus;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BirthProfile>(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string[] | null>(null);
  const [flash, setFlash] = useState(false);
  const f = m.fields;

  const fmtDate = (iso: string) => new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));
  const genderLabel = (g?: Gender | null) => g === "female" ? w.about.female : g === "male" ? w.about.male : g === "other" ? w.about.other : "—";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSaved(await account.saveProfile(form));
      setEditing(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 2500);
    } catch (err) {
      setError(err instanceof AccountError ? err.fields : []);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>{m.birthTitle}</h2>
          {flash && <span className="saved" role="status">✓ {m.saved}</span>}
          <button className="btn ghost" onClick={() => { setForm(profile); setEditing(true); }}>{m.edit}</button>
        </div>
        <dl className="facts">
          <div><dt>{f.displayName}</dt><dd>{profile.displayName || "—"}</dd></div>
          <div><dt>{f.birthName}</dt><dd>{profile.birthName || "—"}</dd></div>
          <div><dt>{f.date}</dt><dd>{fmtDate(profile.date)}</dd></div>
          <div><dt>{f.time}</dt><dd>{profile.timeAccuracy === "unknown" ? m.timeUnknown : `${profile.time}${profile.timeAccuracy === "approx" ? ` (${m.approx})` : ""}`}</dd></div>
          <div className="wide"><dt>{f.place}</dt><dd>{profile.place.label}<small className="muted"> · {profile.place.latitude.toFixed(2)}°, {profile.place.longitude.toFixed(2)}° · {profile.place.zone}</small></dd></div>
          <div><dt>{f.gender}</dt><dd>{genderLabel(profile.gender)}</dd></div>
          <div className="wide"><dt>{f.focus}</dt><dd>{profile.focus.length ? profile.focus.map((x) => focusNames[x]).join(", ") : "—"}</dd></div>
        </dl>
      </section>
    );
  }

  const set = (p: Partial<BirthProfile>) => setForm((x) => ({ ...x, ...p }));
  const bad = (k: string) => (error?.includes(k) ? " invalid" : "");
  const dateOk = isRealDate(form.date);
  const timeOk = form.timeAccuracy === "unknown" || /^\d{2}:\d{2}$/.test(form.time ?? "");

  return (
    <section className="card">
      <form onSubmit={save} className="edit-form">
        <div className="card-head"><h2>{m.birthTitle}</h2></div>
        <div className="row">
          <div className="field"><label htmlFor="e-name">{f.displayName}</label>
            <input id="e-name" value={form.displayName ?? ""} maxLength={60} onChange={(e) => set({ displayName: e.target.value })} /></div>
          <div className="field"><label htmlFor="e-bname">{f.birthName}</label>
            <input id="e-bname" value={form.birthName ?? ""} maxLength={120} onChange={(e) => set({ birthName: e.target.value })} /></div>
        </div>
        <div className="row">
          <div className={`field${bad("date")}`}><label htmlFor="e-date">{f.date}</label>
            <input id="e-date" type="date" value={form.date} max={new Date().toISOString().slice(0, 10)} min="1900-01-01" onChange={(e) => set({ date: e.target.value })} /></div>
          <div className={`field${bad("time")}`}><label htmlFor="e-acc">{f.time}</label>
            <div className="inline">
              <select id="e-acc" value={form.timeAccuracy} onChange={(e) => {
                const acc = e.target.value as TimeAccuracy;
                set({ timeAccuracy: acc, time: acc === "unknown" ? null : form.time ?? "12:00" });
              }}>
                <option value="exact">{w.time.exact}</option>
                <option value="approx">{w.time.approx}</option>
                <option value="unknown">{w.time.unknown}</option>
              </select>
              {form.timeAccuracy !== "unknown" && (
                <input type="time" aria-label={f.time} value={form.time ?? ""} onChange={(e) => set({ time: e.target.value || null })} />
              )}
            </div>
          </div>
        </div>
        <div className={`field${bad("place") || bad("zone")}`}>
          <label>{f.place}</label>
          <PlaceSearch locale={locale} value={form.place} onChange={(p) => p && set({ place: p })} />
        </div>
        <div className="row">
          <div className="field"><label htmlFor="e-gender">{f.gender}</label>
            <select id="e-gender" value={form.gender ?? ""} onChange={(e) => set({ gender: (e.target.value || null) as Gender | null })}>
              <option value="">—</option>
              <option value="female">{w.about.female}</option>
              <option value="male">{w.about.male}</option>
              <option value="other">{w.about.other}</option>
            </select></div>
        </div>
        <fieldset className="group">
          <legend>{f.focus}</legend>
          <div className="pills">
            {FOCUS_AREAS.map((x: FocusArea) => (
              <button type="button" key={x} className={`pill-btn${form.focus.includes(x) ? " on" : ""}`} aria-pressed={form.focus.includes(x)}
                onClick={() => set({ focus: form.focus.includes(x) ? form.focus.filter((y) => y !== x) : [...form.focus, x] })}>{focusNames[x]}</button>
            ))}
          </div>
        </fieldset>
        {error && <div className="alert" role="alert">{ta(locale).auth.errors.validation}</div>}
        <div className="actions">
          <button className="btn" type="submit" disabled={busy || !dateOk || !timeOk}>{m.save}</button>
          <button className="btn ghost" type="button" onClick={() => { setEditing(false); setError(null); }}>{m.cancel}</button>
        </div>
      </form>
    </section>
  );
}

function ConsentToSave({ locale, draft, onSaved }: { locale: Locale; draft: BirthProfile; onSaved: (s: SessionInfo) => void }) {
  const a = ta(locale).auth;
  const r = ta(locale).wizard.reveal;
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section className="card save-box">
      <h2>{r.saveSignedIn}</h2>
      <p className="muted">{draft.place.label} · {draft.date}{draft.time ? ` · ${draft.time}` : ""}</p>
      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{a.consent}</span>
      </label>
      <button className="btn" disabled={!consent || busy} onClick={async () => {
        setBusy(true);
        try { onSaved(await account.saveProfile(draft, true)); } finally { setBusy(false); }
      }}>{busy ? r.saving : r.saveSignedIn}</button>
    </section>
  );
}

function AccountBox({ locale, session }: { locale: Locale; session: SessionInfo }) {
  const m = ta(locale).me;
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const u = session.user!;
  const fmt = (iso?: string) => iso ? new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { dateStyle: "long" }).format(new Date(iso)) : "—";

  async function signOut() {
    await account.logout().catch(() => undefined);
    window.location.href = `/${locale}`;
  }

  async function del() {
    setBusy(true);
    try {
      await account.deleteAccount();
      clearDraft();
      window.location.href = `/${locale}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card account-box">
      <h2>{m.accountTitle}</h2>
      <dl className="facts">
        {u.email && <div><dt>Email</dt><dd>{u.email}</dd></div>}
        <div><dt>{m.signedInWith}</dt><dd>{u.providers.map((p) => m.providers[p] ?? p).join(", ")}</dd></div>
        <div><dt>{m.memberSince}</dt><dd>{fmt(u.createdAt)}</dd></div>
        <div><dt>{m.consentAt}</dt><dd>{fmt(u.consentAt)}</dd></div>
      </dl>
      <div className="actions">
        <a className="btn ghost" href="/api/account" download>{m.download}</a>
        <button className="btn ghost" onClick={signOut}>{m.signOut}</button>
        {!confirm && <button className="btn danger-ghost" onClick={() => setConfirm(true)}>{m.delete}</button>}
      </div>
      {confirm && (
        <div className="confirm" role="alertdialog" aria-label={m.delete}>
          <p>{m.deleteConfirm}</p>
          <div className="actions">
            <button className="btn danger" disabled={busy} onClick={del}>{m.deleteYes}</button>
            <button className="btn ghost" onClick={() => setConfirm(false)}>{m.cancel}</button>
          </div>
        </div>
      )}
    </section>
  );
}
