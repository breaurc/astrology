"use client";

import { useEffect, useState } from "react";
import { safeNextClient } from "./AccountNav";
import type { Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";
import AuthPanel from "./AuthPanel";
import SiteFooter from "../SiteFooter";

export default function LoginView({ locale }: { locale: Locale }) {
  const a = ta(locale).auth;
  const [next, setNext] = useState(`/${locale}/me`);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setNext(safeNextClient(q.get("next"), `/${locale}/me`));
    setError(q.get("error"));
  }, [locale]);

  return (
    <main className="onboard">
      <header className="onboard-top"><a href={`/${locale}`} className="brand">✦ Astro</a></header>
      <section className="step login">
        <h1>{a.loginTitle}</h1>
        <p className="hint">{a.loginNote}</p>
        <AuthPanel key={error ?? "ok"} locale={locale} next={next} initialMode="login" initialError={error}
          onAuthenticated={() => { window.location.href = next; }} />
        <p className="muted center">{a.noProfile} <a href={`/${locale}/start`}>{a.startHere}</a></p>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
