"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";
import { safeNextClient } from "@/lib/nav";
import AuthPanel from "./AuthPanel";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import { useMe } from "../MeProvider";

/** Standalone sign-in page: deep links, OAuth error returns and verification-link outcomes land here. */
export default function LoginView({ locale }: { locale: Locale }) {
  const a = ta(locale).auth;
  const { refresh } = useMe();
  const [next, setNext] = useState(`/${locale}/app`);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setNext(safeNextClient(q.get("next"), `/${locale}/app`));
    setError(q.get("error"));
  }, [locale]);

  return (
    <div className="page">
      <SiteHeader locale={locale} />
      <main className="main">
        <div className="wrap centered">
          <h1>{a.loginTitle}</h1>
          <p className="muted">{a.loginNote}</p>
          <div className="card">
            <AuthPanel key={error ?? "ok"} locale={locale} next={next} initialMode="login" initialError={error}
              onAuthenticated={async () => { await refresh(); window.location.href = next; }} />
          </div>
          <p className="muted center">{a.noProfile} <a href={`/${locale}`}>{a.startHere}</a></p>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
