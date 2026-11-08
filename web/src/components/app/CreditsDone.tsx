"use client";

import { useEffect, useRef, useState } from "react";
import { account } from "@/lib/account";
import { fill, t, type Locale } from "@/lib/i18n";
import { useMe } from "../MeProvider";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";

/** Stripe's return page: polls /api/me until the webhook has credited the ledger (HLD section 7 step 4). */
export default function CreditsDone({ locale }: { locale: Locale }) {
  const d = t(locale);
  const c = d.credits.done;
  const { me, refresh } = useMe();
  const [state, setState] = useState<"waiting" | "ok" | "slow">("waiting");
  const initial = useRef<number | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    const dev = new URLSearchParams(window.location.search).get("dev") === "1";
    let stop = false;
    const tick = async () => {
      const m = await refresh();
      if (stop) return;
      if (initial.current === null) initial.current = dev ? -1 : m.credits;
      if (m.credits > initial.current!) { setState("ok"); return; }
      if (Date.now() - started.current > 60_000) { setState("slow"); }
      setTimeout(tick, 2500);
    };
    tick();
    return () => { stop = true; };
  }, [refresh]);

  async function start() {
    try {
      const { thread } = await account.createThread(locale);
      window.location.href = `/${locale}/app/chat/${thread.id}`;
    } catch {
      window.location.href = `/${locale}/app`;
    }
  }

  return (
    <div className="page">
      <SiteHeader locale={locale} />
      <main className="main">
        <div className="wrap centered" style={{ textAlign: "center", paddingTop: 40 }}>
          {state === "ok" ? (
            <>
              <h1 style={{ fontSize: 34 }}>✓</h1>
              <p className="toast" role="status">{fill(c.ok, { n: me?.credits ?? 0 })}</p>
              <button className="btn big" type="button" onClick={start}>{c.start}</button>
              <a className="link quiet" href={`/${locale}/app`}>{c.week}</a>
            </>
          ) : (
            <>
              <p className="muted"><span className="spinner" aria-hidden /> {c.waiting}</p>
              {state === "slow" && (
                <>
                  <p className="notice">{c.slow}</p>
                  {me && me.credits > 0 && <button className="btn big" type="button" onClick={start}>{c.start}</button>}
                  <a className="link quiet" href={`/${locale}/app`}>{c.week}</a>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
