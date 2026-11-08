"use client";

import { useEffect, useState } from "react";
import { account, AccountError } from "@/lib/account";
import { fill, t, type Locale } from "@/lib/i18n";
import type { CreditPackage } from "@/lib/types";
import { useMe } from "../MeProvider";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";

/** The paywall (SPEC section 6): conversation teaser, credit packages, Stripe Checkout button. */
export default function CreditsView({ locale }: { locale: Locale }) {
  const d = t(locale);
  const c = d.credits;
  const { me } = useMe();
  const [packages, setPackages] = useState<CreditPackage[] | null>(null);
  const [dev, setDev] = useState(false);
  const [cap, setCap] = useState(20);
  const [picked, setPicked] = useState<string>("pack");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    account.packages().then((p) => { setPackages(p.packages); setDev(p.dev); setCap(p.messageCap); if (!p.packages.some((x) => x.id === picked)) setPicked(p.packages[0]?.id ?? "single"); })
      .catch(() => setError(d.app.generic));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await account.checkout(picked, locale);
      window.location.href = url;
    } catch (e) {
      const ae = e instanceof AccountError ? e : null;
      if (ae?.status === 401) window.location.href = `/${locale}/login?next=${encodeURIComponent(`/${locale}/credits`)}`;
      else setError(d.app.generic);
      setBusy(false);
    }
  }

  const name = me?.profile?.displayName || me?.user?.name || me?.user?.email;

  return (
    <div className="page">
      <SiteHeader locale={locale} />
      <main className="main">
        <div className="wrap centered">
          <div className="between">
            <a className="link quiet" href={me?.user ? `/${locale}/app` : `/${locale}`}>← {c.back}</a>
            {name && <span className="muted small">{fill(c.signedInAs, { name })}</span>}
          </div>
          <h1 style={{ fontSize: 34 }}>{c.title}</h1>
          <p className="muted">{c.text}</p>

          <div className="card soft demo-chat" aria-hidden>
            <div className="bubble user">{c.demo[0]}</div>
            <div className="bubble assistant">{c.demo[1]}</div>
            <div className="bubble user blur">{c.demo[2]}</div>
          </div>

          {packages ? (
            <div className="packages" role="radiogroup" aria-label={c.title}>
              {packages.map((p) => (
                <button key={p.id} type="button" role="radio" className="pkg" aria-checked={picked === p.id} onClick={() => setPicked(p.id)}>
                  {p.highlight && <span className="badge">{c.mostChosen}</span>}
                  <span className="name"><b>{c.pkg[p.id]}</b><span>{fill(c.pkgNote[p.id], { cap })}</span></span>
                  <span className="price">{p.currency === "EUR" ? "€" : `${p.currency} `}{p.amount}</span>
                </button>
              ))}
            </div>
          ) : <div className="muted"><span className="spinner" aria-hidden /></div>}

          {me?.user && me.credits > 0 && <p className="muted small">{fill(c.balance, { n: me.credits })}</p>}
          {error && <div className="alert" role="alert">{error}</div>}
          {me && !me.user
            ? <a className="btn big" href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/credits`)}`}>{c.signIn}</a>
            : <button className="btn big" type="button" onClick={pay} disabled={busy || !packages}>{busy ? c.paying : c.pay}</button>}
          <p className="muted small center">{dev ? c.devNote : c.note}</p>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
