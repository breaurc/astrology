"use client";

const COLORS = { GOOD: "#7fa86b", MIXED: "#c9a24a", CAUTION: "#c96c6c" } as const;

export default function ScoreDial({ score, verdict, glyph }: { score: number; verdict: keyof typeof COLORS; glyph?: string }) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(10, score)) / 10) * c;
  return (
    <svg className="dial" viewBox="0 0 180 180" role="img" aria-label={`${score} / 10`}>
      <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(238,230,210,0.12)" strokeWidth="8" />
      <circle
        className="arc"
        cx="90" cy="90" r={r} fill="none"
        stroke={COLORS[verdict]} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 90 90)"
      />
      <text x="90" y="104" textAnchor="middle" className="score">{score}</text>
      <text x="90" y="126" textAnchor="middle" className="of">/ 10</text>
      {glyph && <text x="90" y="52" textAnchor="middle" fontSize="20">{glyph}</text>}
    </svg>
  );
}
