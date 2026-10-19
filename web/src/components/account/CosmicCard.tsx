"use client";

import { useEffect, useState } from "react";
import { api, type Chart, type ChineseProfile, type Day, type Numerology } from "@/lib/api";
import { ANIMALS, ELEMENTS, SIGN_GLYPHS, SIGNS, t, type Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";
import { toBirth, type BirthProfile } from "@/lib/profile";

export const ANIMAL_GLYPHS: Record<string, string> = {
  RAT: "🐀", OX: "🐂", TIGER: "🐅", RABBIT: "🐇", DRAGON: "🐉", SNAKE: "🐍", HORSE: "🐎", GOAT: "🐐",
  MONKEY: "🐒", ROOSTER: "🐓", DOG: "🐕", PIG: "🐖",
};

/** Forces text (not emoji) presentation for zodiac glyphs, matching the gold serif style. */
export const glyph = (g: string | undefined) => (g ? `${g}\uFE0E` : "");

export interface Reading { chart: Chart; chinese: ChineseProfile; numerology: Numerology; day: Day; }

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Loads everything the summary card needs for a profile. */
export function useReading(profile: BirthProfile | null, locale: Locale) {
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState(false);
  const key = profile ? JSON.stringify(toBirth(profile)) : "";

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    const birth = toBirth(profile);
    const date = todayIso();
    setError(false);
    Promise.all([api.chart(birth), api.chinese(birth, date), api.numerology(birth, date), api.day(birth, date, locale)])
      .then(([chart, ch, numerology, day]) => {
        if (!cancelled) setReading({ chart, chinese: ch.profile, numerology, day });
      })
      .catch(() => !cancelled && setError(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, locale]);

  return { reading, error };
}

/** "Cosmic ID": Sun, Moon, Rising, Chinese sign, life path and today's overall score. */
export default function CosmicCard({ locale, profile, reading, error, showToday = true }: {
  locale: Locale; profile: BirthProfile; reading: Reading | null; error: boolean; showToday?: boolean;
}) {
  const d = t(locale);
  const c = ta(locale).card;
  if (error) return <div className="alert" role="alert">{d.error}</div>;
  if (!reading) {
    return (
      <div className="cosmic loading" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => <div className="tile" key={i}><span className="g">✦</span><span className="l">&nbsp;</span><b>&nbsp;</b></div>)}
      </div>
    );
  }
  const { chart, chinese, numerology, day } = reading;
  const overall = day.categories.GENERAL;
  const tiles = [
    { g: glyph(SIGN_GLYPHS[chart.sunSign]), l: c.sun, v: SIGNS[locale][chart.sunSign] },
    { g: glyph(SIGN_GLYPHS[chart.moonSign]), l: c.moon, v: SIGNS[locale][chart.moonSign] },
    chart.risingSign
      ? { g: glyph(SIGN_GLYPHS[chart.risingSign]), l: c.rising, v: SIGNS[locale][chart.risingSign] }
      : { g: "?", l: c.rising, v: c.risingUnknown, muted: true },
    { g: ANIMAL_GLYPHS[chinese.animal] ?? "☯", l: c.chinese,
      v: `${ANIMALS[locale][chinese.animal]}`, sub: `${ELEMENTS[locale][chinese.yinYang]} ${ELEMENTS[locale][chinese.element]}` },
    { g: String(numerology.lifePath), l: c.lifePath, v: d.lifePath, num: true },
  ];
  return (
    <div>
      <div className="cosmic">
        {tiles.map((x) => (
          <div className={`tile${"muted" in x && x.muted ? " muted" : ""}`} key={x.l}>
            <span className={`g${"num" in x && x.num ? " num" : ""}`} aria-hidden>{x.g}</span>
            <span className="l">{x.l}</span>
            {!("num" in x && x.num) && <b>{x.v}</b>}
            {"sub" in x && x.sub && <small>{x.sub}</small>}
          </div>
        ))}
      </div>
      {overall && (showToday || profile.timeAccuracy === "approx") && (
        <p className="cosmic-today">
          {showToday && <span className={`pill ${overall.verdict}`}>{c.today}: {overall.score}/10 · {d.verdict[overall.verdict]}</span>}
          {profile.timeAccuracy === "approx" && <small className="muted">{c.approxNote}</small>}
        </p>
      )}
    </div>
  );
}
