"use client";

import { useEffect, useState } from "react";
import { account, AccountError } from "@/lib/account";
import { LOCALES, fill, t, type Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";
import { FOCUS_AREAS, isRealDate, type BirthProfile, type FocusArea, type Gender, type SessionInfo, type TimeAccuracy } from "@/lib/profile";
import type { LedgerEntry } from "@/lib/types";
import { useMe } from "../MeProvider";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import PlaceSearch from "./PlaceSearch";

/** Profile page (SPEC section 5): birth data, language, credits and purchases, export, delete. */
export default function MyProfile({ locale }: { locale: Locale }) {
  const m = ta(locale).me;
  const { me, refresh } = useMe();

  if (!me) return <div className="page"><SiteHeader locale={locale} /><main className="main"><div className="wrap muted">…</div></main></div>;
  if (!me.user) return null;
  const name = me.profile?.displayName || me.user.name;
  const session: SessionInfo = { user: me.user, profile: me.profile };

  return (
    <div className="page">
      <SiteHeader locale={locale} />
      <main className="main">
        <div className="wrap me">
          <div className="between">
            <h1>{name ? fill(m.hello, { name }) : m.helloAnon}</h1>
            <a className="btn ghost small" href={`/${locale}/app`}>{m.week} →</a>
          </div>
          {me.profile ? (
            <BirthData locale={locale} profile={me.profile} onSaved={() => refresh()} />
          ) : (
            <section className="card stack tight">
              <h2>{m.noProfileTitle}</h2>
              <p className="muted">{m.noProfileText}</p>
              <a className="btn" href={`/${locale}/app`} style={{ alignSelf: "flex-start" }}>{m.noProfileCta}</a>
            </section>
          )}
          <LanguageBox locale={locale} current={me.locale ?? locale} />
          <CreditsBox locale={locale} credits={me.credits} />
          <AccountBox locale={locale} session={session} onChange={() => refresh()} />
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

function LanguageBox({ locale, current }: { locale: Locale; current: Locale }) {
  const m = ta(locale).me;
  const [value, setValue] = useState<Locale>(current);
  async function change(l: Locale) {
    setValue(l);
    await account.setLocale(l).catch(() => undefined);
    if (l !== locale) window.location.href = `/${l}/profile`;
  }
  return (
    <section className="card stack tight">
      <h2 style={{ fontSize: 24 }}>{m.languageTitle}</h2>
      <p className="muted small">{m.languageText}</p>
      <div className="segmented" role="radiogroup" aria-label={m.languageTitle} style={{ maxWidth: 260 }}>
        {LOCALES.map((l) => (
          <button key={l} type="button" role="radio" aria-selected={value === l} aria-checked={value === l} onClick={() => change(l)}>
            {l === "ro" ? "Română" : "English"}
          </button>
        ))}
      </div>
    </section>
  );
}

function CreditsBox({ locale, credits }: { locale: Locale; credits: number }) {
  const m = ta(locale).me;
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  useEffect(() => { account.ledger().then((r) => setEntries(r.entries)).catch(() => setEntries([])); }, []);
  const fmt = (iso: string) => new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  return (
    <section className="card stack tight">
      <div className="card-head">
        <h2>{m.creditsTitle}</h2>
        <span className="credits-pill">✦ {fill(m.balance, { n: credits })}</span>
        <a className="btn small" href={`/${locale}/credits`}>{m.buy}</a>
      </div>
      {entries === null ? <p className="muted small">…</p> : entries.length === 0 ? <p className="muted small">{m.noPurchases}</p> : (
        <table className="plain">
          <thead><tr><th>{m.purchases}</th><th></th><th style={{ textAlign: "right" }}>Δ</th></tr></thead>
          <tbody>
            {entries.slice(0, 20).map((e) => (
              <tr key={e.id}>
                <td>{m.reasons[e.reason] ?? e.reason}{e.packageId ? ` · ${t(locale).credits.pkg[e.packageId] ?? e.packageId}` : ""}</td>
                <td className="muted">{fmt(e.createdAt)}</td>
                <td style={{ textAlign: "right", color: e.delta > 0 ? "var(--green)" : "var(--muted)" }}>{e.delta > 0 ? `+${e.delta}` : e.delta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function BirthData({ locale, profile, onSaved }: { locale: Locale; profile: BirthProfile; onSaved: () => void }) {
  const m = ta(locale).me;
  const w = ta(locale);
  const focusNames = w.focus;
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
      await account.saveProfile(form);
      onSaved();
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
          <button className="btn ghost small" onClick={() => { setForm(profile); setEditing(true); }}>{m.edit}</button>
        </div>
        <dl className="facts-dl">
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
      <form onSubmit={save} className="stack">
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

function AccountBox({ locale, session, onChange }: { locale: Locale; session: SessionInfo; onChange: () => void }) {
  const m = ta(locale).me;
  const [confirm, setConfirm] = useState<null | "profile" | "account">(null);
  const [busy, setBusy] = useState(false);
  const u = session.user!;
  const fmt = (iso?: string) => iso ? new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { dateStyle: "long" }).format(new Date(iso)) : m.noConsent;

  async function signOut() {
    await account.logout().catch(() => undefined);
    window.location.href = `/${locale}`;
  }

  async function deleteProfile() {
    setBusy(true);
    try {
      await account.deleteProfile();
      onChange();
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      await account.deleteAccount();
      try { localStorage.removeItem("astro.inputs"); } catch { /* ignore */ }
      window.location.href = `/${locale}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card stack tight">
        <h2 style={{ fontSize: 24 }}>{m.accountTitle}</h2>
        <dl className="facts-dl">
          {u.email && <div><dt>Email</dt><dd>{u.email}</dd></div>}
          <div><dt>{m.signedInWith}</dt><dd>{u.providers.map((p) => m.providers[p] ?? p).join(", ")}</dd></div>
          <div><dt>{m.memberSince}</dt><dd>{fmt(u.createdAt)}</dd></div>
        </dl>
        <div className="actions">
          <button className="btn ghost" onClick={signOut}>{m.signOut}</button>
        </div>
      </section>

      <section className="card stack tight" id="data">
        <h2 style={{ fontSize: 24 }}>{m.privacyTitle}</h2>
        <dl className="facts-dl">
          <div className="wide"><dt>{m.consentAt}</dt>
            <dd>{fmt(u.consentAt)}{u.consentVersion && <small className="muted"> · {m.consentVersion} {u.consentVersion}</small>}</dd></div>
        </dl>
        <div className="actions">
          <a className="btn ghost" href="/api/account" download>{m.download}</a>
          {session.profile && confirm !== "profile" && (
            <button className="btn danger-ghost" onClick={() => setConfirm("profile")}>{m.deleteBirth}</button>
          )}
          {confirm !== "account" && <button className="btn danger-ghost" onClick={() => setConfirm("account")}>{m.delete}</button>}
        </div>
        {session.profile && <p className="muted small">{m.deleteBirthNote}</p>}
        {confirm && (
          <div className="confirm" role="alertdialog" aria-label={confirm === "profile" ? m.deleteBirth : m.delete}>
            <p>{confirm === "profile" ? m.deleteBirthConfirm : m.deleteConfirm}</p>
            <div className="actions">
              <button className="btn danger" disabled={busy} onClick={confirm === "profile" ? deleteProfile : deleteAccount}>
                {confirm === "profile" ? m.deleteBirthYes : m.deleteYes}
              </button>
              <button className="btn ghost" onClick={() => setConfirm(null)}>{m.cancel}</button>
            </div>
          </div>
        )}
        <a className="link" href={`/${locale}/privacy`}>{m.privacyLink} →</a>
      </section>
    </>
  );
}
