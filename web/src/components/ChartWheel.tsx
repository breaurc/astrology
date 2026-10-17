"use client";

import type { Chart } from "@/lib/api";
import { PLANET_GLYPHS, SIGN_GLYPHS } from "@/lib/i18n";

const SIGNS = ["ARIES", "TAURUS", "GEMINI", "CANCER", "LEO", "VIRGO", "LIBRA", "SCORPIO", "SAGITTARIUS", "CAPRICORN", "AQUARIUS", "PISCES"];

/** Natal wheel. The Ascendant sits at the left (9 o'clock); zodiac runs counter-clockwise, as is conventional. */
export default function ChartWheel({ chart }: { chart: Chart }) {
  const size = 420;
  const cx = size / 2, cy = size / 2;
  const rOuter = 200, rSigns = 172, rPlanets = 130, rInner = 100;
  // rotate so that the ascendant (or 0° Aries when the time is unknown) is at the left
  const asc = chart.ascendant ?? 0;
  const toXY = (lon: number, r: number) => {
    const a = ((180 - (lon - asc)) * Math.PI) / 180; // counter-clockwise from the left
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };

  // avoid overlapping glyphs: push planets apart when within 7°
  const sorted = [...chart.positions].sort((a, b) => a.longitude - b.longitude);
  const placed: { body: string; lon: number; retrograde: boolean }[] = [];
  for (const p of sorted) {
    let lon = p.longitude;
    const prev = placed[placed.length - 1];
    if (prev && lon - prev.lon < 7) lon = prev.lon + 7;
    placed.push({ body: p.body, lon, retrograde: p.retrograde });
  }

  return (
    <svg className="wheel" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Natal chart wheel">
      <circle cx={cx} cy={cy} r={rOuter} fill="rgba(13,15,34,0.6)" stroke="#c9a24a" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r={rSigns - 28} fill="none" stroke="rgba(238,230,210,0.25)" />
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="rgba(238,230,210,0.25)" />

      {SIGNS.map((s, i) => {
        const start = toXY(i * 30, rOuter);
        const end = toXY(i * 30, rSigns - 28);
        const mid = toXY(i * 30 + 15, rSigns);
        return (
          <g key={s}>
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="rgba(238,230,210,0.35)" />
            <text x={mid.x} y={mid.y + 6} textAnchor="middle" fontSize="18" fill="#e0c37a">{SIGN_GLYPHS[s]}{"\uFE0E"}</text>
          </g>
        );
      })}

      {chart.houseCusps.map((c, i) => {
        const a = toXY(c, rSigns - 28);
        const b = toXY(c, rInner);
        const label = toXY(c + 15, rInner + 12);
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(238,230,210,0.2)" />
            <text x={label.x} y={label.y + 4} textAnchor="middle" fontSize="10" fill="#9a9bc2">{i + 1}</text>
          </g>
        );
      })}

      {chart.aspects.map((a, i) => {
        const p1 = chart.positions.find((p) => p.body === a.a);
        const p2 = chart.positions.find((p) => p.body === a.b);
        if (!p1 || !p2) return null;
        const s = toXY(p1.longitude, rInner);
        const e = toXY(p2.longitude, rInner);
        const hard = a.aspect === "SQUARE" || a.aspect === "OPPOSITION";
        return <line key={i} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={hard ? "#c96c6c" : "#7fa86b"} strokeOpacity="0.6" />;
      })}

      {placed.map((p) => {
        const real = chart.positions.find((q) => q.body === p.body)!;
        const pos = toXY(p.lon, rPlanets);
        const tick = toXY(real.longitude, rInner);
        const tick2 = toXY(real.longitude, rInner + 8);
        return (
          <g key={p.body}>
            <line x1={tick.x} y1={tick.y} x2={tick2.x} y2={tick2.y} stroke="#eee6d2" />
            <text x={pos.x} y={pos.y + 6} textAnchor="middle" fontSize="20" fill="#eee6d2">{PLANET_GLYPHS[p.body]}{"\uFE0E"}</text>
            {p.retrograde && <text x={pos.x + 11} y={pos.y - 4} fontSize="9" fill="#c96c6c">R</text>}
          </g>
        );
      })}

      {chart.ascendant != null && (
        <text x={cx - rOuter + 6} y={cy - 6} textAnchor="start" fontSize="11" fill="#c9a24a">ASC</text>
      )}
    </svg>
  );
}
