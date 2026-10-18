"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api, PLACES, type Answer, type Almanac, type BestDay, type Birth, type Chart, type ChineseProfile, type Day, type Numerology,
} from "@/lib/api";
import {
  ANIMALS, CATEGORIES, ELEMENTS, LOCALES, PHASE_GLYPHS, PLANET_GLYPHS, PLANETS, RELATIONS, SIGN_GLYPHS, SIGNS, t, type Locale,
} from "@/lib/i18n";
import ScoreDial from "./ScoreDial";
import ChartWheel from "./ChartWheel";
import ProfilePanel from "./ProfilePanel";
import { PILLAR_NAMES, pillarLabel, stemLabel } from "@/lib/bazi";

type Tab = "today" | "profile" | "chart" | "chinese" | "numerology" | "best";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Demo({ locale }: { locale: Locale }) {
  const d = t(locale);
  const [name, setName] = useState("");
  const [date, setDate] = useState("1990-06-15");
  const [time, setTime] = useState("12:00");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeId, setPlaceId] = useState(PLACES[0].id);
  const [lat, setLat] = useState(PLACES[0].lat);
  const [lon, setLon] = useState(PLACES[0].lon);
  const [zone, setZone] = useState(PLACES[0].zone);

  const [question, setQuestion] = useState("");
  const [askDate, setAskDate] = useState(todayIso());
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("today");
  const [day, setDay] = useState<Day | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [chinese, setChinese] = useState<{ profile: ChineseProfile; today: Almanac } | null>(null);
  const [numerology, setNumerology] = useState<Numerology | null>(null);
  const [bestCategory, setBestCategory] = useState("LOVE");
  const [best, setBest] = useState<BestDay[] | null>(null);

  const birth: Birth = useMemo(
    () => ({ name: name || undefined, date, time: timeUnknown ? null : time, zone, latitude: lat, longitude: lon }),
    [name, date, time, timeUnknown, zone, lat, lon],
  );
  const birthKey = JSON.stringify(birth);

  function choosePlace(id: string) {
    setPlaceId(id);
    const p = PLACES.find((x) => x.id === id);
    if (p) { setLat(p.lat); setLon(p.lon); setZone(p.zone); }
  }

  // reload the active tab whenever birth data or the day changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setError(null);
        if (tab === "today") setDay(await api.day(birth, askDate, locale));
        if (tab === "profile") {
          const [c, ch, n, dy] = await Promise.all([
            api.chart(birth), api.chinese(birth, askDate), api.numerology(birth, askDate), api.day(birth, askDate, locale),
          ]);
          if (cancelled) return;
          setChart(c); setChinese(ch); setNumerology(n); setDay(dy);
        }
        if (tab === "chart") setChart(await api.chart(birth));
        if (tab === "chinese") setChinese(await api.chinese(birth, askDate));
        if (tab === "numerology") setNumerology(await api.numerology(birth, askDate));
        if (tab === "best") setBest(await api.bestDays(birth, bestCategory, askDate, locale));
      } catch (e) {
        if (!cancelled) setError(`${d.error} [${e instanceof Error ? e.message : String(e)}]`);
      }
    };
    const handle = setTimeout(run, 250); // debounce typing in the form
    return () => { cancelled = true; clearTimeout(handle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, birthKey, askDate, bestCategory, locale]);

  async function ask(q: string) {
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setAnswer(await api.ask(birth, q.trim(), askDate, locale));
    } catch (e) {
      setError(`${d.error} [${e instanceof Error ? e.message : String(e)}]`);
    } finally {
      setBusy(false);
    }
  }

  const ctx = answer?.context ?? day?.context;
  const phase = ctx?.moonPhase;

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <h1>{d.title}</h1>
          <p>{d.tagline}</p>
        </div>
        <nav className="lang" aria-label="Language">
          {LOCALES.map((l) => (
            <a key={l} href={`/${l}`} aria-current={l === locale ? "page" : undefined}>{l.toUpperCase()}</a>
          ))}
        </nav>
      </header>

      <div className="grid">
        <aside className="card sticky">
          <h2>{d.birth}</h2>
          <div className="field">
            <label htmlFor="name">{d.name}</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="date">{d.date}</label>
              <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="time">{d.time}</label>
              <input id="time" type="time" value={time} disabled={timeUnknown} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
            {d.timeUnknown}
          </label>
          <div className="field">
            <label htmlFor="place">{d.place}</label>
            <select id="place" value={placeId} onChange={(e) => choosePlace(e.target.value)}>
              {PLACES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">{d.custom}</option>
            </select>
          </div>
          {placeId === "custom" && (
            <>
              <div className="row">
                <div className="field">
                  <label htmlFor="lat">{d.lat}</label>
                  <input id="lat" type="number" step="0.01" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor="lon">{d.lon}</label>
                  <input id="lon" type="number" step="0.01" value={lon} onChange={(e) => setLon(Number(e.target.value))} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="zone">{d.zone}</label>
                <input id="zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Europe/Bucharest" />
              </div>
            </>
          )}
        </aside>

        <section>
          <div className="card ask">
            <h2>{d.askTitle}</h2>
            <form onSubmit={(e) => { e.preventDefault(); ask(question); }}>
              <input
                className="question" value={question} placeholder={d.askPlaceholder}
                onChange={(e) => setQuestion(e.target.value)} maxLength={300} aria-label={d.askTitle}
              />
              <div className="controls">
                <label className="muted" htmlFor="askDate">{d.askDate}</label>
                <input id="askDate" type="date" value={askDate} onChange={(e) => setAskDate(e.target.value)} />
                <button className="btn" type="submit" disabled={busy}>{busy ? d.asking : d.askButton}</button>
              </div>
            </form>
            <div className="examples">
              {d.examples.map((ex) => (
                <button key={ex} type="button" onClick={() => { setQuestion(ex); ask(ex); }}>{ex}</button>
              ))}
            </div>

            {error && <div className="alert" role="alert">{error}</div>}

            {answer && (
              <div className="answer" aria-live="polite">
                {answer.guardrail === "DISTRESS" ? (
                  <div className="alert" style={{ gridColumn: "1 / -1" }}>{answer.text}</div>
                ) : (
                  <>
                    <ScoreDial score={answer.score} verdict={answer.verdict} glyph={phase ? PHASE_GLYPHS[phase] : undefined} />
                    <div>
                      <p className={`verdict ${answer.verdict}`}>{d.verdict[answer.verdict]}</p>
                      <div className="meta">
                        {d.category}: {CATEGORIES[locale][answer.category]} · {answer.date}
                        {answer.narrator === "llm" ? " · AI" : ""}
                      </div>
                      <p className="narrative">{answer.text}</p>
                      <ul className="reasons">
                        {answer.reasons.slice(0, 6).map((r, i) => (
                          <li key={i}>
                            <span className={`w ${r.weight > 0 ? "pos" : "neg"}`}>{r.weight > 0 ? "+" : "−"}</span>
                            <span className="src">{d.source[r.source as keyof typeof d.source] ?? r.source}</span>
                            <span>{r.text}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="disclaimer">{answer.disclaimer}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="tabs" role="tablist">
            {(Object.keys(d.tabs) as Tab[]).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{d.tabs[k]}</button>
            ))}
          </div>

          <div className="card">
            {tab === "today" && (
              day ? (
                <>
                  <div className="context">
                    {day.context.moonPhase && <span>{PHASE_GLYPHS[day.context.moonPhase]} {d.phase[day.context.moonPhase as keyof typeof d.phase]}</span>}
                    {day.context.transitMoonSign && <span>☽ {SIGNS[locale][day.context.transitMoonSign]}</span>}
                    {day.context.dayAnimal && <span>{ANIMALS[locale][day.context.dayAnimal]} · {RELATIONS[locale][day.context.branchRelation]}</span>}
                    {day.context.personalDay && <span>{d.personalDay} {day.context.personalDay}</span>}
                    {day.context.mercuryRetrograde === "true" && <span>☿ {d.retro}</span>}
                  </div>
                  <div className="scores">
                    {Object.entries(day.categories).map(([k, v]) => (
                      <div className="score-row" key={k}>
                        <span>{CATEGORIES[locale][k]}</span>
                        <div className="bar"><div className={`fill ${v.verdict}`} style={{ width: `${v.score * 10}%` }} /></div>
                        <span className="n">{v.score}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="empty">…</p>
            )}

            {tab === "profile" && (
              chart && chinese && numerology
                ? <ProfilePanel locale={locale} chart={chart} chinese={chinese} numerology={numerology} day={day} date={askDate} />
                : <p className="empty">…</p>
            )}

            {tab === "chart" && (
              chart ? (
                <div className="chart">
                  <ChartWheel chart={chart} />
                  <div>
                    <div className="dl" style={{ marginBottom: 18 }}>
                      <div><span>{d.sun}</span><b>{SIGN_GLYPHS[chart.sunSign]} {SIGNS[locale][chart.sunSign]}</b></div>
                      <div><span>{d.moon}</span><b>{SIGN_GLYPHS[chart.moonSign]} {SIGNS[locale][chart.moonSign]}</b></div>
                      <div><span>{d.rising}</span><b>{chart.risingSign ? `${SIGN_GLYPHS[chart.risingSign]} ${SIGNS[locale][chart.risingSign]}` : <small className="muted">{d.unknownRising}</small>}</b></div>
                    </div>
                    <table className="plain">
                      <thead><tr><th>{d.planet}</th><th>{d.sign}</th><th>°</th>{chart.timeKnown && <th>{d.house}</th>}</tr></thead>
                      <tbody>
                        {chart.positions.map((p) => (
                          <tr key={p.body}>
                            <td><span className="glyph">{PLANET_GLYPHS[p.body]}</span> {PLANETS[locale][p.body]}{p.retrograde && <small className="muted"> ℞</small>}</td>
                            <td>{SIGN_GLYPHS[p.sign]} {SIGNS[locale][p.sign]}</td>
                            <td>{p.degree.toFixed(1)}</td>
                            {chart.timeKnown && <td>{p.house}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <p className="empty">…</p>
            )}

            {tab === "chinese" && (
              chinese ? (
                <>
                  <div className="dl" style={{ marginBottom: 18 }}>
                    <div><span>{d.animal}</span><b>{ANIMALS[locale][chinese.profile.animal]}</b></div>
                    <div><span>{d.element}</span><b>{ELEMENTS[locale][chinese.profile.yinYang]} {ELEMENTS[locale][chinese.profile.element]}</b></div>
                    <div><span>{d.dayMaster}</span><b>{stemLabel(chinese.profile.dayMaster, locale)} <small className="muted">{chinese.profile.dayMaster}</small></b></div>
                  </div>
                  <p className="muted" style={{ margin: "0 0 6px" }}>{d.pillars}</p>
                  <div className="dl" style={{ marginBottom: 18 }}>
                    {chinese.profile.pillars.map((pl, i) => pl && (
                      <div key={i}><span>{PILLAR_NAMES[locale][i]}</span><b style={{ fontSize: 18 }}>{pillarLabel(pl, locale)} <small className="muted">{pl}</small></b></div>
                    ))}
                  </div>
                  <p className="muted" style={{ marginTop: 0 }}>
                    {d.relation}: <b>{ANIMALS[locale][chinese.today.dayAnimal]}</b> — {RELATIONS[locale][chinese.today.relationToNatal]}
                  </p>
                  <p className="muted" style={{ margin: "14px 0 6px" }}>{d.todaySuitable}</p>
                  <div className="chips good">{chinese.today.suitable.map((s) => <span key={s}>{s}</span>)}</div>
                  <p className="muted" style={{ margin: "14px 0 6px" }}>{d.todayAvoid}</p>
                  <div className="chips bad">{chinese.today.avoid.map((s) => <span key={s}>{s}</span>)}</div>
                </>
              ) : <p className="empty">…</p>
            )}

            {tab === "numerology" && (
              numerology ? (
                <>
                  <div className="dl" style={{ marginBottom: 18 }}>
                    <div><span>{d.lifePath}</span><b className="big">{numerology.lifePath}</b></div>
                    <div><span>{d.birthday}</span><b className="big">{numerology.birthday}</b></div>
                    <div><span>{d.expression}</span><b className="big">{numerology.expression ?? "–"}</b></div>
                    <div><span>{d.soulUrge}</span><b className="big">{numerology.soulUrge ?? "–"}</b></div>
                    <div><span>{d.personality}</span><b className="big">{numerology.personality ?? "–"}</b></div>
                  </div>
                  {numerology.expression == null && <p className="muted">{d.needName}</p>}
                  <div className="dl">
                    <div><span>{d.personalYear}</span><b>{numerology.personalYear}</b></div>
                    <div><span>{d.personalMonth}</span><b>{numerology.personalMonth}</b></div>
                    <div><span>{d.personalDay}</span><b>{numerology.personalDay}</b></div>
                  </div>
                </>
              ) : <p className="empty">…</p>
            )}

            {tab === "best" && (
              <>
                <div className="context" style={{ alignItems: "center" }}>
                  <span>{d.bestFor}</span>
                  <select value={bestCategory} onChange={(e) => setBestCategory(e.target.value)}
                    style={{ background: "var(--night-deep)", color: "var(--ivory)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}>
                    {Object.keys(CATEGORIES[locale]).filter((k) => k !== "GENERAL").map((k) => <option key={k} value={k}>{CATEGORIES[locale][k]}</option>)}
                  </select>
                  <span>{d.nextDays}</span>
                </div>
                {best ? (
                  <div className="best">
                    {best.map((b) => (
                      <div className="day" key={b.date}>
                        <div><b>{b.date}</b><span className={`verdict ${b.verdict}`} style={{ fontSize: 18 }}>{b.score}/10</span></div>
                        <ul className="reasons">
                          {b.reasons.map((r, i) => (
                            <li key={i}>
                              <span className={`w ${r.weight > 0 ? "pos" : "neg"}`}>{r.weight > 0 ? "+" : "−"}</span>
                              <span className="src">{d.source[r.source as keyof typeof d.source] ?? r.source}</span>
                              <span>{r.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : <p className="empty">…</p>}
              </>
            )}
          </div>
          <p className="disclaimer">{d.disclaimer}</p>
        </section>
      </div>
    </main>
  );
}
