"use client";

import { useCallback, useEffect, useState } from "react";
import { account, AccountError } from "@/lib/account";
import { fill, t, type Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";
import { EMPTY_INPUTS, clearInputs, inputErrors, loadInputs, toProfile, todayIso, type Inputs } from "@/lib/inputs";
import type { CalendarDay, QuestionRecord, ThreadRecord } from "@/lib/types";
import { useMe } from "../MeProvider";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import ConsentText from "../account/ConsentText";
import BirthForm from "../landing/BirthForm";
import CalendarStrip from "./CalendarStrip";
import QuestionBox from "./QuestionBox";
import ConversationPanel from "./ConversationPanel";
import SkyCard from "./SkyCard";

/** Signed-in home (SPEC section 4): 7-day calendar, today's detail, the daily question and the conversation entry. */
export default function AppHome({ locale }: { locale: Locale }) {
  const d = t(locale);
  const { me, refresh, set } = useMe();
  const [days, setDays] = useState<CalendarDay[] | null>(null);
  const [calError, setCalError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [today, setToday] = useState<QuestionRecord | null | undefined>(undefined);
  const [unlimited, setUnlimited] = useState(false);
  const [threads, setThreads] = useState<ThreadRecord[] | null>(null);
  const [messageCap, setMessageCap] = useState(20);

  const load = useCallback(async () => {
    setCalError(null);
    const [cal, qs, th] = await Promise.allSettled([account.calendar(todayIso(), locale), account.questions(), account.threads()]);
    if (cal.status === "fulfilled") { setDays(cal.value.days); setSelected((s) => s ?? cal.value.days[0]?.date ?? null); }
    else setCalError(d.landing.errors.engine);
    if (qs.status === "fulfilled") { setToday(qs.value.today); setUnlimited(qs.value.unlimited); } else setToday(null);
    if (th.status === "fulfilled") { setThreads(th.value.threads); setMessageCap(th.value.messageCap); } else setThreads([]);
  }, [locale, d.landing.errors.engine]);

  useEffect(() => {
    if (me?.profile) load();
  }, [me?.profile, load]);

  if (!me) return <div className="page"><SiteHeader locale={locale} /><main className="main"><div className="wrap muted">…</div></main></div>;
  if (!me.user) return null; // the server component already redirected

  const name = me.profile?.displayName || me.user.name || undefined;

  return (
    <div className="page">
      <SiteHeader locale={locale} />
      <main className="main">
        <div className="wrap stack loose">
          <h1>{name ? fill(d.app.title, { name: name.split(/\s+/)[0] }) : d.app.titleAnon}</h1>
          {!me.profile ? (
            <BirthDataStep locale={locale} onSaved={async () => { set(await refresh()); }} />
          ) : (
            <div className="app-grid">
              <div className="stack loose">
                <CalendarStrip locale={locale} days={days} selected={selected} onSelect={setSelected} error={calError} />
                <SkyCard locale={locale} date={selected ?? todayIso()} />
              </div>
              <div className="stack loose">
                <QuestionBox locale={locale} today={today} unlimited={unlimited} conversationHref={`/${locale}/credits`}
                  onAnswered={(q) => { setToday(q); refresh(); }} />
                <ConversationPanel locale={locale} credits={me.credits} threads={threads} messageCap={messageCap} onCreditsChange={() => refresh()} />
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

/**
 * First visit after gate 1: the browser's inputs (if any) are saved as birth data; otherwise the one-step form is
 * shown. An older account without a consent record is asked for it here.
 */
function BirthDataStep({ locale, onSaved }: { locale: Locale; onSaved: () => Promise<void> }) {
  const d = t(locale).app;
  const a = ta(locale).auth;
  const [inputs, setInputs] = useState<Inputs>(EMPTY_INPUTS);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [needConsent, setNeedConsent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const save = useCallback(async (i: Inputs, withConsent: boolean) => {
    const profile = toProfile(i);
    const errs = inputErrors({ ...i, system: "WESTERN" });
    if (!profile || errs.length) { setErrors(errs); return; }
    setBusy(true);
    setError(null);
    try {
      await account.saveProfile(profile, withConsent);
      clearInputs();
      await onSaved();
    } catch (e) {
      if (e instanceof AccountError && e.code === "consent_required") setNeedConsent(true);
      else if (e instanceof AccountError && e.code === "validation") setErrors(e.fields);
      else setError(a.errors.generic);
    } finally {
      setBusy(false);
    }
  }, [onSaved, a.errors.generic]);

  useEffect(() => {
    const i = loadInputs();
    setInputs(i);
    if (!tried && inputErrors({ ...i, system: "WESTERN" }).length === 0) {
      setTried(true);
      save(i, false);
    } else {
      setTried(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tried || (busy && !needConsent && !error && errors.length === 0)) {
    return <div className="card muted"><span className="spinner" aria-hidden /> {d.saving}</div>;
  }

  return (
    <section className="card stack" style={{ maxWidth: 560 }}>
      <h2>{d.needBirthTitle}</h2>
      <p className="muted">{d.needBirth}</p>
      <BirthForm locale={locale} value={inputs} onChange={(v) => { setInputs(v); setErrors([]); }} systems={false}
        onSubmit={() => save(inputs, consent)} busy={busy} errors={errors} submitLabel={d.saveBirth} busyLabel={d.saving} />
      {needConsent && (
        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <ConsentText locale={locale} />
        </label>
      )}
      {error && <div className="alert" role="alert">{error}</div>}
    </section>
  );
}
