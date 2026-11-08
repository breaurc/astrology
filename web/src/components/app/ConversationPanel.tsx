"use client";

import { useState } from "react";
import { account, AccountError } from "@/lib/account";
import { fill, t, type Locale } from "@/lib/i18n";
import type { ThreadRecord } from "@/lib/types";

interface Props {
  locale: Locale;
  credits: number;
  threads: ThreadRecord[] | null;
  messageCap: number;
  onCreditsChange: () => void;
}

/** Gate 2: the conversation entry. Locked with "Get credits" at zero; otherwise opens threads (SPEC section 3.4). */
export default function ConversationPanel({ locale, credits, threads, messageCap, onCreditsChange }: Props) {
  const a = t(locale).app;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const { thread } = await account.createThread(locale);
      onCreditsChange();
      window.location.href = `/${locale}/app/chat/${thread.id}`;
    } catch (e) {
      const ae = e instanceof AccountError ? e : null;
      if (ae?.status === 402) window.location.href = `/${locale}/credits`;
      else setError(a.generic);
      setBusy(false);
    }
  }

  const balance = credits === 1 ? a.credit1 : fill(a.credits, { n: credits });

  return (
    <section className="card gold stack">
      <div className="strip">
        <div className="strip-text">
          <b>{a.conv}</b>
          <span>{credits > 0 ? balance : a.convLocked}</span>
        </div>
        {credits > 0
          ? <button type="button" className="btn pill small" onClick={open} disabled={busy}>{busy ? a.opening : a.newThread}</button>
          : <a className="btn pill small" href={`/${locale}/credits`}>{a.getCredits}</a>}
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      {threads && threads.length > 0 ? (
        <>
          <div className="eyebrow gold">{a.threads}</div>
          <ul className="threads">
            {threads.slice(0, 8).map((th) => (
              <li key={th.id}>
                <a href={`/${locale}/app/chat/${th.id}`}>
                  <span>{th.title ?? "…"}</span>
                  <small>{fill(a.messages, { n: th.messageCount, cap: th.messageCap })} · <span className={`pill ${th.status}`}>{th.status === "open" ? a.open : a.closed}</span></small>
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : threads && (
        <p className="muted small">{fill(a.noThreads, { cap: messageCap })}</p>
      )}
    </section>
  );
}
