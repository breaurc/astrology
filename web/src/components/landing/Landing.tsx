"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { account, AccountError } from "@/lib/account";
import { t, type Locale } from "@/lib/i18n";
import { EMPTY_INPUTS, inputErrors, loadInputs, saveInputs, toBirthPayload, toProfile, todayIso, type Inputs } from "@/lib/inputs";
import type { Reading, ReadingSystem } from "@/lib/types";
import { useMe } from "../MeProvider";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import SignInSheet from "../account/SignInSheet";
import BirthForm from "./BirthForm";
import ReadingCard from "./ReadingCard";
import Teasers, { ConversationStrip } from "./Teasers";

/**
 * Landing = form + reading on one page (SPEC section 4). Phone: the reading replaces the form, with "Edit data";
 * laptop: sticky form on the left, reading column on the right. Inputs live in localStorage (`astro.inputs`).
 */
export default function Landing({ locale }: { locale: Locale }) {
  const d = t(locale);
  const { me, refresh } = useMe();
  const [inputs, setInputs] = useState<Inputs>(EMPTY_INPUTS);
  const [loaded, setLoaded] = useState(false);
  const [readings, setReadings] = useState<Partial<Record<ReadingSystem, Reading>>>({});
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"form" | "reading">("form");
  const [sheet, setSheet] = useState(false);
  const readingRef = useRef<HTMLDivElement>(null);
  const requested = useRef(0);

  const reading = readings[inputs.system] ?? null;
  const firstName = inputs.name.trim().split(/\s+/)[0] || undefined;

  useEffect(() => {
    const i = loadInputs();
    setInputs(i);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveInputs(inputs);
  }, [inputs, loaded]);

  const run = useCallback(async (i: Inputs, system: ReadingSystem) => {
    const errs = inputErrors({ ...i, system });
    setErrors(errs);
    if (errs.length) return;
    const seq = ++requested.current;
    setBusy(true);
    setError(null);
    try {
      const { reading: r } = await account.reading(toBirthPayload(i), system, todayIso(), locale);
      if (seq !== requested.current) return;
      setReadings((prev) => ({ ...prev, [system]: r }));
      setView("reading");
    } catch (e) {
      if (seq !== requested.current) return;
      const ae = e instanceof AccountError ? e : null;
      if (ae?.status === 429) setError(d.landing.errors.quota);
      else if (ae?.status === 503 || ae?.status === 502) setError(d.landing.errors.engine);
      else if (ae?.code === "validation") setErrors(ae.fields);
      else setError(d.landing.errors.generic);
    } finally {
      if (seq === requested.current) setBusy(false);
    }
  }, [locale, d.landing.errors]);

  // A returning visitor with complete inputs sees the reading again without retyping (cached by the engine).
  useEffect(() => {
    if (loaded && inputErrors(inputs).length === 0 && !reading && !busy && requested.current === 0) run(inputs, inputs.system);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  function submit() {
    run(inputs, inputs.system).then(() => readingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function switchSystem(s: ReadingSystem) {
    const next = { ...inputs, system: s };
    setInputs(next);
    if (!readings[s]) run(next, s);
  }

  /** Gate 1 passed: the browser's inputs become the account's birth data, then the week opens. */
  async function afterAuth() {
    const profile = toProfile(inputs);
    if (profile) {
      try { await account.saveProfile(profile); } catch { /* the week page asks again if consent is missing */ }
    }
    await refresh();
    window.location.href = `/${locale}/app`;
  }

  function unlock() {
    if (me?.user) afterAuth();
    else setSheet(true);
  }

  const unlockLabel = me?.user ? d.nav.week : undefined;
  const showReadingOnPhone = view === "reading" && reading;

  return (
    <div className="page">
      <SiteHeader locale={locale} onSignIn={() => setSheet(true)} />
      <main className="main">
        <div className="wrap landing">
          <div className={`landing-form${showReadingOnPhone ? " laptop-only" : ""}`}>
            <h1>{d.landing.title}</h1>
            <p className="hero-sub">{d.landing.subtitle}</p>
            <BirthForm locale={locale} value={inputs} onChange={(v) => { setInputs(v); setErrors([]); }} onSubmit={submit} busy={busy} errors={errors} message={error} />
            <p className="muted small">{d.landing.free}</p>
            <div className="card dashed account-box laptop-only" style={{ padding: "14px 16px" }}>
              <AccountPitch locale={locale} />
            </div>
          </div>

          <div className="reading-col" ref={readingRef}>
            {reading || busy ? (
              <>
                <ReadingCard locale={locale} reading={reading} system={inputs.system} onSystem={switchSystem} name={firstName} busy={busy}
                  onEdit={() => setView("form")} />
                {error && <div className="alert phone-only" role="alert">{error}</div>}
                <Teasers locale={locale} onUnlock={unlock} unlockLabel={unlockLabel} askLabel={unlockLabel} />
                <ConversationStrip locale={locale} href={`/${locale}/credits`} />
              </>
            ) : (
              <>
                <div className="reading-placeholder laptop-only">{d.landing.subtitle}</div>
                <div className="card dashed account-box phone-only" style={{ padding: "14px 16px" }}>
                  <AccountPitch locale={locale} />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
      <SignInSheet locale={locale} open={sheet} onClose={() => setSheet(false)} onAuthenticated={afterAuth} name={firstName} next={`/${locale}/app`} />
    </div>
  );
}

function AccountPitch({ locale }: { locale: Locale }) {
  const b = t(locale).landing.accountBox;
  return (
    <>
      <div className="free"><b>{b.free}</b><span>{b.freeText}</span></div>
      <div className="paid"><b>{b.paid}</b><span>{b.paidText}</span></div>
    </>
  );
}
