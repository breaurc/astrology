"use client";

import { useEffect, useId, useState } from "react";
import { account, AccountError } from "@/lib/account";
import type { SessionInfo } from "@/lib/profile";
import type { Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";
import ConsentText from "./ConsentText";

interface Props {
  locale: Locale;
  /** Where Google/Facebook should send the person back to. */
  next: string;
  initialMode?: "register" | "login";
  defaultName?: string;
  /** Called after an email sign-up / sign-in succeeds (OAuth leaves the page instead). */
  onAuthenticated: (s: SessionInfo) => void | Promise<void>;
  initialError?: string | null;
}

export default function AuthPanel({ locale, next, initialMode = "register", defaultName, onAuthenticated, initialError }: Props) {
  const a = ta(locale).auth;
  const id = useId();
  const [mode, setMode] = useState(initialMode);
  const [providers, setProviders] = useState<{ google: boolean; facebook: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [fields, setFields] = useState<string[]>([]);

  useEffect(() => {
    account.providers().then(setProviders).catch(() => setProviders({ google: false, facebook: false }));
  }, []);

  const register = mode === "register";
  const errorText = (code: string) => (a.errors as Record<string, string>)[code] ?? a.errors.generic;

  function oauth(p: "google" | "facebook") {
    if (register && !consent) {
      setError("consent");
      setFields(["consent"]);
      return;
    }
    window.location.href = account.oauthUrl(p, next, consent);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFields([]);
    if (register && !consent) {
      setError("consent");
      setFields(["consent"]);
      return;
    }
    setBusy(true);
    try {
      const s = register
        ? await account.register(email, password, defaultName, consent)
        : await account.login(email, password);
      await onAuthenticated(s);
    } catch (err) {
      const ae = err instanceof AccountError ? err : new AccountError("generic");
      setError(ae.code);
      setFields(ae.fields);
      if (ae.code === "email_taken") setMode("login");
    } finally {
      setBusy(false);
    }
  }

  // Social buttons appear only when the server enables them (SOCIAL_LOGIN=on + provider keys).
  const providerButton = (p: "google" | "facebook") => {
    if (!providers?.[p]) return null;
    return (
      <button key={p} type="button" className={`social ${p}`} onClick={() => oauth(p)} disabled={busy}>
        {p === "google" ? <GoogleMark /> : <FacebookMark />}
        <span>{p === "google" ? a.google : a.facebook}</span>
      </button>
    );
  };
  const anySocial = !!(providers?.google || providers?.facebook);

  return (
    <div className="auth">
      {register && (
        <label className={`consent${fields.includes("consent") ? " invalid" : ""}`}>
          <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (e.target.checked && error === "consent") setError(null); }} />
          <ConsentText locale={locale} />
        </label>
      )}

      {anySocial && (
        <>
          <div className="socials">{providerButton("google")}{providerButton("facebook")}</div>
          <div className="or"><span>{a.or}</span></div>
        </>
      )}

      <form onSubmit={submit} noValidate>
        <div className={`field${fields.includes("email") ? " invalid" : ""}`}>
          <label htmlFor={`${id}-email`}>{a.email}</label>
          <input id={`${id}-email`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className={`field${fields.includes("password") ? " invalid" : ""}`}>
          <label htmlFor={`${id}-pw`}>{a.password}{register && <small className="muted"> · {a.passwordHint}</small>}</label>
          <input id={`${id}-pw`} type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined}
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="alert" role="alert">{error === "consent" ? a.consentNeeded : errorText(error)}</div>}
        <button className="btn wide" type="submit" disabled={busy}>{busy ? a.busy : register ? a.register : a.login}</button>
      </form>

      <button type="button" className="link center" onClick={() => { setMode(register ? "login" : "register"); setError(null); setFields([]); }}>
        {register ? a.toLogin : a.toRegister}
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
    </svg>
  );
}
