"use client";

import { CATEGORIES, longDate, t, weekday, type Locale } from "@/lib/i18n";
import type { CalendarDay } from "@/lib/types";

interface Props { locale: Locale; days: CalendarDay[] | null; selected: string | null; onSelect: (date: string) => void; error?: string | null; }

/** 7 days starting today, each favourable / mixed / careful, with the selected day's good/avoid lists (SPEC section 3.2). */
export default function CalendarStrip({ locale, days, selected, onSelect, error }: Props) {
  const a = t(locale).app;
  const day = days?.find((x) => x.date === selected) ?? days?.[0] ?? null;
  return (
    <div className="stack">
      {days ? (
        <div className="week" role="tablist" aria-label={a.titleAnon}>
          {days.map((x) => (
            <button key={x.date} type="button" role="tab" className={`day ${x.verdict}`} aria-selected={day?.date === x.date} onClick={() => onSelect(x.date)}
              title={`${longDate(x.date, locale)} · ${t(locale).verdict[x.verdict]}`}>
              <small>{weekday(x.date, locale)}</small>
              <b>{Number(x.date.slice(8, 10))}</b>
              <i aria-hidden />
            </button>
          ))}
        </div>
      ) : (
        <div className="week" aria-busy="true">{Array.from({ length: 7 }).map((_, i) => <div className="day" key={i} style={{ opacity: 0.4, minHeight: 66 }} />)}</div>
      )}
      <div className="legend">
        {(["GOOD", "MIXED", "CAUTION"] as const).map((v) => <span key={v} className={v}>● {a.legend[v]}</span>)}
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      {day && (
        <section className="card soft day-detail stack tight">
          <div className={`eyebrow ${day.verdict}`}>{longDate(day.date, locale).toUpperCase()} · {a.legend[day.verdict]}</div>
          <p>
            {day.good.length > 0 && <><b>{a.goodFor}:</b> {day.good.map((c) => CATEGORIES[locale][c] ?? c).join(", ").toLowerCase()}.<br /></>}
            {day.avoid.length > 0 && <><b>{a.avoid}:</b> {day.avoid.map((c) => CATEGORIES[locale][c] ?? c).join(", ").toLowerCase()}.</>}
          </p>
          {day.reasons.length > 0 && <p className="muted small">{day.reasons.join(" · ")}</p>}
          <p className="muted small">{a.computed}</p>
        </section>
      )}
    </div>
  );
}
