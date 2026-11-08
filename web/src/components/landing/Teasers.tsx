"use client";

import { t, type Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  /** What the unlock buttons do: open the sign-in sheet, or save the data and go to the week when already signed in. */
  onUnlock: () => void;
  unlockLabel?: string;
  askLabel?: string;
}

/** The two locked teasers under the reading: blurred 7-day strip and question box (SPEC section 3.1). */
export default function Teasers({ locale, onUnlock, unlockLabel, askLabel }: Props) {
  const r = t(locale).reading;
  const colors = ["var(--green-bg)", "var(--green-bg)", "var(--amber-bg)", "var(--green-bg)", "var(--red-bg)", "var(--green-bg)", "var(--amber-bg)"];
  return (
    <div className="teasers">
      <section className="card soft locked" aria-label={r.locked7}>
        <div className="eyebrow">{r.locked7}</div>
        <div className="mini-strip blur" aria-hidden>
          {colors.map((c, i) => <div key={i} style={{ background: c }} />)}
        </div>
        <p className="muted small blur-soft" aria-hidden>{r.lockedCalText}</p>
        <button type="button" className="btn light small cta" onClick={onUnlock}>{unlockLabel ?? r.unlock}</button>
      </section>
      <section className="card soft locked" aria-label={r.lockedQ}>
        <div className="eyebrow">{r.lockedQ}</div>
        <div className="input blur-soft" aria-hidden style={{ display: "flex", alignItems: "center", color: "var(--faint)", fontSize: 14 }}>{r.askPlaceholder}</div>
        <p className="muted small blur-soft" aria-hidden>{r.lockedAskText}</p>
        <button type="button" className="btn light small cta" onClick={onUnlock}>{askLabel ?? r.unlockAsk}</button>
      </section>
    </div>
  );
}

/** Advertises the paid conversation (gold strip at the bottom of the reading). */
export function ConversationStrip({ locale, href, label, credits }: { locale: Locale; href: string; label?: string; credits?: number }) {
  const r = t(locale).reading.strip;
  const a = t(locale).app;
  return (
    <section className="card gold strip">
      <div className="strip-text">
        <b>{r.title}</b>
        <span>{credits == null ? r.text : credits === 0 ? a.credits.replace("{n}", "0") : credits === 1 ? a.credit1 : a.credits.replace("{n}", String(credits))}</span>
      </div>
      <a className={`btn ${credits == null ? "gold-ghost" : ""} pill small`} href={href}>{label ?? r.cta}</a>
    </section>
  );
}
