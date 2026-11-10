"use client";

import { useEffect, useRef, useState } from "react";
import { account, AccountError } from "@/lib/account";
import { fill, t, type Locale } from "@/lib/i18n";
import { todayIso } from "@/lib/inputs";
import type { MessageRecord, ThreadRecord } from "@/lib/types";
import { useMe } from "../MeProvider";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import SkyCard from "./SkyCard";

/** One conversation thread (SPEC section 3.4): messages, counter, composer; read-only once closed. */
export default function ChatView({ locale, threadId }: { locale: Locale; threadId: string }) {
  const d = t(locale);
  const c = d.chat;
  const { me, refresh } = useMe();
  const [thread, setThread] = useState<ThreadRecord | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [maxChars, setMaxChars] = useState(500);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    account.thread(threadId).then((r) => { setThread(r.thread); setMessages(r.messages); setMaxChars(r.maxChars); })
      .catch(() => setNotFound(true));
  }, [threadId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !thread || thread.status !== "open") return;
    if (body.length > maxChars) { setError(fill(c.tooLong, { n: maxChars })); return; }
    setBusy(true);
    setError(null);
    const optimistic: MessageRecord = { id: "tmp", threadId, role: "user", text: body, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setText("");
    try {
      const r = await account.send(threadId, body);
      setThread(r.thread);
      setMessages((m) => [...m.filter((x) => x.id !== "tmp"), ...r.messages]);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== "tmp"));
      setText(body);
      const ae = err instanceof AccountError ? err : null;
      if (ae?.code === "maintenance") setError(d.app.maintenance);
      else if (ae?.status === 503 || ae?.status === 502) setError(d.app.retry);
      else if (ae?.status === 409) { setError(c.closed); setThread((t) => (t ? { ...t, status: "closed" } : t)); }
      else if (ae?.code === "too_long") setError(fill(c.tooLong, { n: maxChars }));
      else setError(d.app.generic);
    } finally {
      setBusy(false);
    }
  }

  async function openNew() {
    try {
      const { thread: nt } = await account.createThread(locale);
      await refresh();
      window.location.href = `/${locale}/app/chat/${nt.id}`;
    } catch (err) {
      if (err instanceof AccountError && err.status === 402) window.location.href = `/${locale}/credits`;
      else setError(d.app.generic);
    }
  }

  async function end() {
    if (!thread) return;
    const r = await account.closeThread(thread.id);
    setThread(r.thread);
    await refresh();
  }

  return (
    <div className="page">
      <SiteHeader locale={locale} />
      <main className="main">
        <div className="wrap chat-wrap">
          <div className="chat">
          <div className="between">
            <a className="link quiet" href={`/${locale}/app`}>← {c.back}</a>
            {thread && <span className="counter">{fill(c.counter, { n: thread.messageCount, cap: thread.messageCap })}{thread.status === "closed" ? ` · ${d.app.closed}` : ""}</span>}
          </div>
          <h1 style={{ fontSize: 30 }}>{c.title}</h1>
          {notFound && <div className="alert" role="alert">{d.app.generic}</div>}
          <div className="chat-log" aria-live="polite">
            {thread && messages.length === 0 && <p className="muted">{c.empty}</p>}
            {messages.map((m) => <div key={m.id} className={`bubble ${m.role}`}>{m.text}</div>)}
            {busy && <div className="bubble assistant muted"><span className="spinner" aria-hidden /></div>}
            <div ref={endRef} />
          </div>
          {error && <div className="alert" role="alert">{error}</div>}
          {thread?.status === "open" ? (
            <form className="stack tight" onSubmit={send}>
              <div className="composer">
                <textarea className="input" value={text} placeholder={c.placeholder} maxLength={maxChars} rows={2} disabled={busy}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }} />
                <button className="btn" type="submit" disabled={busy || !text.trim()}>{c.send}</button>
              </div>
              <div className="between">
                <span className="counter">{text.length}/{maxChars} · {c.disclaimer}</span>
                <button type="button" className="link quiet small" onClick={end} title={c.endNote}>{c.end}</button>
              </div>
            </form>
          ) : thread && (
            <div className="card gold stack tight">
              <p>{c.closed}</p>
              {me && (me.credits > 0
                ? <button type="button" className="btn pill small" onClick={openNew}>{c.openNew}</button>
                : <a className="btn pill small" href={`/${locale}/credits`}>{d.app.getCredits}</a>)}
            </div>
          )}
          </div>
          <aside className="chat-aside">
            <SkyCard locale={locale} date={todayIso()} compact />
          </aside>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
