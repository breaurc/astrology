"use client";

import type { Almanac, Chart, ChineseProfile, Day, Numerology } from "@/lib/api";
import { ANIMALS, ELEMENTS, PLANETS, PLANET_GLYPHS, SIGNS, SIGN_GLYPHS, t, type Locale } from "@/lib/i18n";
import {
  ANIMAL_INFO, ANIMAL_TEXT, CHINESE_ELEMENT_TEXT, MODALITIES, NUMBER_TEXT, RETRO_TEXT, SIGN_INFO, SIGN_TEXT,
  WESTERN_ELEMENTS, WESTERN_ELEMENT_TEXT,
} from "@/lib/descriptions";
import { stemLabel } from "@/lib/bazi";

interface Props {
  locale: Locale;
  chart: Chart;
  chinese: { profile: ChineseProfile; today: Almanac };
  numerology: Numerology;
  day: Day | null;
  date: string;
}

/** Personal descriptions: signs, elements, retrogrades and numbers, built from the three profile endpoints. */
export default function ProfilePanel({ locale, chart, chinese, numerology, day, date }: Props) {
  const d = t(locale);
  const p = d.profile;
  const signs = SIGNS[locale];
  const planets = PLANETS[locale];
  const signText = SIGN_TEXT[locale];
  const retroText = RETRO_TEXT[locale];

  const sun = chart.sunSign;
  const info = SIGN_INFO[sun];
  const animal = chinese.profile.animal;

  const natalRetro = chart.positions.filter((x) => x.retrograde && retroText[x.body]).map((x) => x.body);
  const todayRetro = (day?.context.retrogrades ?? "").split(",").filter((b) => b && retroText[b]);

  const lucky = Array.from(new Set([
    ...(info?.lucky ?? []), ...(ANIMAL_INFO[animal]?.lucky ?? []), numerology.lifePath, numerology.birthday,
  ]));

  return (
    <div className="profile">
      <section className="pcard">
        <h3>{p.western}</h3>
        <div className="phead">
          <span className="pglyph">{SIGN_GLYPHS[sun]}</span>
          <div>
            <div className="ptitle">{p.sunSign}: {signs[sun]}</div>
            {info && (
              <div className="chips">
                <span>{WESTERN_ELEMENTS[locale][info.element]}</span>
                <span>{MODALITIES[locale][info.modality]}</span>
                <span>{p.ruledBy} {PLANET_GLYPHS[info.ruler]} {planets[info.ruler]}</span>
              </div>
            )}
          </div>
        </div>
        <p>{signText[sun]?.sun}</p>
        {info && <p className="muted">{WESTERN_ELEMENT_TEXT[locale][info.element]}</p>}
        <p><b>{p.moonSign}: {SIGN_GLYPHS[chart.moonSign]} {signs[chart.moonSign]}.</b> {signText[chart.moonSign]?.moon}</p>
        {chart.risingSign
          ? <p><b>{d.rising}: {SIGN_GLYPHS[chart.risingSign]} {signs[chart.risingSign]}.</b> {signText[chart.risingSign]?.rising}</p>
          : <p className="muted">{d.rising}: {d.unknownRising}</p>}
      </section>

      <section className="pcard">
        <h3>{p.chinese}</h3>
        <div className="phead">
          <span className="pglyph">{ANIMAL_GLYPHS[animal] ?? "☯"}</span>
          <div>
            <div className="ptitle">{ANIMALS[locale][animal]}</div>
            <div className="chips">
              <span>{ELEMENTS[locale][chinese.profile.yinYang]} {ELEMENTS[locale][chinese.profile.element]}</span>
              <span>{d.dayMaster}: {stemLabel(chinese.profile.dayMaster, locale)} <small className="muted">{chinese.profile.dayMaster}</small></span>
            </div>
          </div>
        </div>
        <p>{ANIMAL_TEXT[locale][animal]}</p>
        <p className="muted">{CHINESE_ELEMENT_TEXT[locale][chinese.profile.element]} {CHINESE_ELEMENT_TEXT[locale][chinese.profile.yinYang]}</p>
      </section>

      <section className="pcard">
        <h3>{p.retrogrades}</h3>
        <p className="muted" style={{ marginTop: 0 }}>{p.natalRetro}</p>
        {natalRetro.length === 0 ? <p>{p.noneNatal}</p> : natalRetro.map((b) => (
          <p key={b}><b>{PLANET_GLYPHS[b]} {planets[b]} ℞.</b> {retroText[b].natal}</p>
        ))}
        <p className="muted">{p.todayRetro.replace("{date}", date)}</p>
        {day == null ? <p className="empty">…</p> : todayRetro.length === 0 ? <p>{p.noneToday}</p> : todayRetro.map((b) => (
          <p key={b}><b>{PLANET_GLYPHS[b]} {planets[b]} ℞.</b> {retroText[b].transit}</p>
        ))}
      </section>

      <section className="pcard">
        <h3>{p.numbers}</h3>
        <p><b>{d.lifePath} {numerology.lifePath}.</b> {NUMBER_TEXT[locale][String(numerology.lifePath)]}</p>
        <p><b>{d.birthday} {numerology.birthday}.</b> {NUMBER_TEXT[locale][String(numerology.birthday)]}</p>
        {numerology.expression != null && (
          <p><b>{d.expression} {numerology.expression}.</b> {NUMBER_TEXT[locale][String(numerology.expression)]}</p>
        )}
        <p className="muted" style={{ marginBottom: 6 }}>{p.luckyNumbers}</p>
        <div className="lucky">{lucky.map((n) => <span key={n}>{n}</span>)}</div>
        <p className="muted" style={{ fontSize: 13 }}>{p.luckyFrom}</p>
      </section>
    </div>
  );
}

const ANIMAL_GLYPHS: Record<string, string> = {
  RAT: "🐀", OX: "🐂", TIGER: "🐅", RABBIT: "🐇", DRAGON: "🐉", SNAKE: "🐍", HORSE: "🐎", GOAT: "🐐",
  MONKEY: "🐒", ROOSTER: "🐓", DOG: "🐕", PIG: "🐖",
};
