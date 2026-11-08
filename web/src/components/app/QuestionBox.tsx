"use client";

import { useId, useState } from "react";
import { account, AccountError } from "@/lib/account";
import { t, type Locale } from "@/lib/i18n";
import type { QuestionRecord } from "@/lib/types";

interface Props {
  locale: Locale;
  today: QuestionRecord | null | undefined; // undefined = loading
  unlimited: boolean;
  onAnswered: (q: QuestionRecord) => void;
  conversationHref: string;
}

/** One free-text question per day, answered once; the answer stays until midnight (SPEC section 3.3). */
export default function QuestionBox({ locale, today, unlimited, onAnswered, conversationHref }: Props) {
  const a = t(locale).app;
  const r = t(locale).reading;
  const id = useId();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const used = !!today && !unlimited;

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await account.ask(q.trim(), locale);
      onAnswered(res.question);
      setQ("");
    } catch (err) {
      const ae = err instanceof AccountError ? err : null;
      if (ae?.code === "maintenance") setError(a.maintenance);
      else if (ae?.status === 503 || ae?.status === 502) setError(a.retry);
      else if (ae?.status === 429) setError(a.usedHint);
      else setError(a.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card lavender stack">
      <div className="between">
        <div className="eyebrow">{a.ask}</div>
        <span className="muted small">{unlimited ? a.unlimited : used ? a.used : a.left}</span>
      </div>
      {today && (
        <div className="qa">
          <span className="q">{today.question}</span>
          <span className="a">{today.answer}</span>
        </div>
      )}
      {used ? (
        <p className="muted small">{a.usedHint} <a href={conversationHref}>{a.conv} →</a></p>
      ) : today === undefined ? (
        <p className="muted small">…</p>
      ) : (
        <form onSubmit={ask} className="stack tight">
          <label htmlFor={`${id}-q`} className="sr-only">{a.yourQuestion}</label>
          <input id={`${id}-q`} className="input" value={q} maxLength={300} placeholder={r.askPlaceholder} onChange={(e) => setQ(e.target.value)} disabled={busy} />
          <button className="btn lavender" type="submit" disabled={busy || !q.trim()}>{busy && <span className="spinner" aria-hidden />}{busy ? a.asking : a.askBtn}</button>
          <p className="muted small">{a.oneAnswer}</p>
        </form>
      )}
      {error && <div className="alert" role="alert">{error}</div>}
    </section>
  );
}
