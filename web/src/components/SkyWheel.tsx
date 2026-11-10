"use client";

import { useId, useState } from "react";
import { ASPECTS, ASPECT_GLYPHS, PLANETS, PLANET_GLYPHS, SIGNS, SIGN_GLYPHS, SIGN_ORDER, fill, longDate, t, type Locale } from "@/lib/i18n";
import type { Sky, SkyAspect, SkyPosition } from "@/lib/types";

interface Props {
  sky: Sky;
  locale: Locale;
  /** Smaller wheel for side panels. */
  compact?: boolean;
}

// Geometry in a 440 × 440 view box: sign ring outside, transiting planets, natal planets, aspects inside.
const C = 220;
const R_OUT = 196, R_SIGN = 166, R_TRANSIT = 146, R_NATAL = 110, R_INNER = 82, R_HOUSE_NO = 70;

/**
 * Point on a circle for an ecliptic longitude. The Ascendant (or 0° Aries when the birth time is unknown)
 * sits at the left and the zodiac runs counter-clockwise, as on a printed chart.
 */
function pt(lon: number, r: number, asc: number): [number, number] {
  const a = ((180 + lon - asc) * Math.PI) / 180;
  return [C + r * Math.cos(a), C - r * Math.sin(a)];
}

/** Nudges glyphs apart so planets that stand close together stay readable; the true position keeps its mark. */
function spread(positions: SkyPosition[], minGap: number): Map<string, number> {
  const items = positions.map((p) => ({ body: p.body, lon: p.longitude })).sort((a, b) => a.lon - b.lon);
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      const a = items[i], b = items[(i + 1) % items.length];
      const gap = (i === items.length - 1 ? b.lon + 360 : b.lon) - a.lon;
      if (gap < minGap) {
        const push = (minGap - gap) / 2;
        a.lon -= push;
        b.lon += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return new Map(items.map((x) => [x.body, ((x.lon % 360) + 360) % 360]));
}

const natureClass = (a: SkyAspect) => (a.nature > 0 ? "pos" : a.nature < 0 ? "neg" : "conj");

/**
 * The day's sky drawn over the natal chart: outer ring today's planets, inner ring the birth planets, and the
 * transit-to-natal aspects the narration talks about as lines through the middle. Hover or tap an aspect in
 * the list to single it out. Pure SVG, fixed aspect ratio, so nothing below it moves while it loads.
 */
export default function SkyWheel({ sky, locale, compact }: Props) {
  const s = t(locale).sky;
  const id = useId();
  const asc = sky.ascendant ?? 0;
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const active = hover ?? pinned;

  const tLon = spread(sky.transit, compact ? 10 : 8);
  const nLon = spread(sky.natal, compact ? 13 : 11);
  const aspects = [...sky.aspects].sort((a, b) => a.orb - b.orb);
  const lonOf = (list: SkyPosition[], body: string) => list.find((p) => p.body === body)?.longitude ?? 0;
  const planetTitle = (p: SkyPosition) =>
    `${PLANETS[locale][p.body] ?? p.body} · ${SIGNS[locale][p.sign] ?? p.sign} ${Math.floor(p.degree)}°${p.retrograde ? ` · ${s.retro}` : ""}${p.house ? ` · ${s.house} ${p.house}` : ""}`;
  const aspectLabel = (a: SkyAspect) =>
    fill(s.pattern, { transit: PLANETS[locale][a.transit] ?? a.transit, aspect: ASPECTS[locale][a.aspect] ?? a.aspect.toLowerCase(), natal: PLANETS[locale][a.natal] ?? a.natal });

  const angleLabel = (lon: number | null, text: string) => {
    if (lon == null) return null;
    const [x, y] = pt(lon, R_OUT + 12, asc);
    return <text className="angle-label" x={x} y={y} textAnchor="middle" dominantBaseline="central">{text}</text>;
  };

  return (
    <figure className={`sky${compact ? " compact" : ""}${active != null ? " has-active" : ""}`}>
      <svg viewBox="0 0 440 440" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>{fill(s.titleDay, { date: longDate(sky.date, locale) })}</title>

        {/* rings */}
        <circle className="ring" cx={C} cy={C} r={R_OUT} />
        <circle className="ring" cx={C} cy={C} r={R_SIGN} />
        <circle className="ring soft" cx={C} cy={C} r={R_INNER} />

        {/* the twelve signs with 10° ticks */}
        {SIGN_ORDER.map((sign, i) => {
          const [x1, y1] = pt(i * 30, R_SIGN, asc), [x2, y2] = pt(i * 30, R_OUT, asc);
          const [gx, gy] = pt(i * 30 + 15, (R_OUT + R_SIGN) / 2, asc);
          return (
            <g key={sign}>
              <line className="tick" x1={x1} y1={y1} x2={x2} y2={y2} />
              {[10, 20].map((d) => {
                const [a1, b1] = pt(i * 30 + d, R_SIGN, asc), [a2, b2] = pt(i * 30 + d, R_SIGN + 5, asc);
                return <line key={d} className="tick" x1={a1} y1={b1} x2={a2} y2={b2} />;
              })}
              <text className="sign" x={gx} y={gy} textAnchor="middle" dominantBaseline="central">
                <title>{SIGNS[locale][sign]}</title>{SIGN_GLYPHS[sign]}
              </text>
            </g>
          );
        })}

        {/* houses (whole sign) and the two axes, only when the birth time is known */}
        {sky.timeKnown && sky.houseCusps.map((cusp, i) => {
          const [x1, y1] = pt(cusp, R_INNER, asc), [x2, y2] = pt(cusp, R_SIGN, asc);
          const [hx, hy] = pt(cusp + 15, R_HOUSE_NO, asc);
          return (
            <g key={i}>
              <line className="cusp" x1={x1} y1={y1} x2={x2} y2={y2} />
              <text className="house-no" x={hx} y={hy} textAnchor="middle" dominantBaseline="central">{i + 1}</text>
            </g>
          );
        })}
        {sky.timeKnown && [sky.ascendant, sky.midheaven].map((lon, i) => {
          if (lon == null) return null;
          const [x1, y1] = pt(lon, R_INNER, asc), [x2, y2] = pt(lon + 180, R_INNER, asc);
          const [x3, y3] = pt(lon, R_SIGN, asc), [x4, y4] = pt(lon + 180, R_SIGN, asc);
          return (
            <g key={i}>
              <line className="cusp angle" x1={x1} y1={y1} x2={x3} y2={y3} />
              <line className="cusp angle" x1={x2} y1={y2} x2={x4} y2={y4} />
            </g>
          );
        })}
        {sky.timeKnown && angleLabel(sky.ascendant, s.asc)}
        {sky.timeKnown && angleLabel(sky.midheaven, s.mc)}

        {/* transit-to-natal aspects */}
        {aspects.map((a, i) => {
          const [x1, y1] = pt(lonOf(sky.transit, a.transit), R_INNER, asc);
          const [x2, y2] = pt(lonOf(sky.natal, a.natal), R_INNER, asc);
          return (
            <line key={i} className={`aspect ${natureClass(a)}${active === i ? " active" : ""}`} x1={x1} y1={y1} x2={x2} y2={y2}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <title>{aspectLabel(a)}</title>
            </line>
          );
        })}

        {/* natal planets: a dot at the true position on the inner circle, the glyph on the natal ring */}
        {sky.natal.map((p) => {
          const [mx, my] = pt(p.longitude, R_INNER, asc);
          const [gx, gy] = pt(nLon.get(p.body) ?? p.longitude, R_NATAL, asc);
          return (
            <g key={p.body} className="body natal">
              <circle className="mark natal" cx={mx} cy={my} r={2.4} />
              <text className="planet natal" x={gx} y={gy} textAnchor="middle" dominantBaseline="central">
                <title>{planetTitle(p)}</title>{PLANET_GLYPHS[p.body] ?? p.body[0]}
              </text>
              {p.retrograde && <text className="rx" x={gx + 8} y={gy - 7} textAnchor="middle" dominantBaseline="central">R</text>}
            </g>
          );
        })}

        {/* transiting planets: a tick at the true position under the sign ring, the glyph on the transit ring */}
        {sky.transit.map((p) => {
          const [x1, y1] = pt(p.longitude, R_SIGN, asc), [x2, y2] = pt(p.longitude, R_SIGN - 7, asc);
          const [gx, gy] = pt(tLon.get(p.body) ?? p.longitude, R_TRANSIT, asc);
          return (
            <g key={p.body} className="body transit">
              <line className="mark transit" x1={x1} y1={y1} x2={x2} y2={y2} />
              <text className="planet transit" x={gx} y={gy} textAnchor="middle" dominantBaseline="central">
                <title>{planetTitle(p)}</title>{PLANET_GLYPHS[p.body] ?? p.body[0]}
              </text>
              {p.retrograde && <text className="rx" x={gx + 8} y={gy - 7} textAnchor="middle" dominantBaseline="central">R</text>}
            </g>
          );
        })}
      </svg>

      <figcaption className="sky-legend">
        <span className="transit"><i aria-hidden />{s.outer}</span>
        <span className="natal"><i aria-hidden />{s.inner}</span>
        {!sky.timeKnown && <span className="wide">{s.noTime}</span>}
      </figcaption>

      <div className="eyebrow">{s.aspects}</div>
      {aspects.length > 0 ? (
        <ul className="sky-aspects">
          {aspects.map((a, i) => (
            <li key={i} className={natureClass(a)}>
              <button type="button" aria-pressed={pinned === i}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={() => setPinned(pinned === i ? null : i)}>
                <span className="glyph" aria-hidden>{ASPECT_GLYPHS[a.aspect] ?? "·"}</span>
                <span>{aspectLabel(a)}</span>
                <small>{fill(s.orb, { orb: a.orb.toFixed(1) })}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{s.none}</p>
      )}
    </figure>
  );
}
