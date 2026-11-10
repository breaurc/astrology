"use client";

import { useEffect, useState } from "react";
import { account } from "@/lib/account";
import { fill, longDate, t, type Locale } from "@/lib/i18n";
import type { Sky } from "@/lib/types";
import SkyWheel from "../SkyWheel";

interface Props {
  locale: Locale;
  /** yyyy-mm-dd; the wheel follows the selected calendar day. */
  date: string;
  compact?: boolean;
}

/** Signed-in wheel for one day. Fetches /api/sky and keeps a same-size placeholder while loading, so nothing jumps. */
export default function SkyCard({ locale, date, compact }: Props) {
  const s = t(locale).sky;
  const [sky, setSky] = useState<Sky | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    account.sky(date).then((r) => { if (live) setSky(r); }).catch(() => { if (live) { setSky(null); setFailed(true); } });
    return () => { live = false; };
  }, [date]);

  const title = sky?.date === date ? fill(s.titleDay, { date: longDate(date, locale) }) : s.loading;

  return (
    <section className={`card soft stack tight sky-card${compact ? " compact" : ""}`} aria-busy={!sky || sky.date !== date}>
      <div className="eyebrow">{failed ? s.unavailable : title}</div>
      {sky && !failed
        ? <SkyWheel sky={sky} locale={locale} compact={compact} />
        : <div className="sky-placeholder" aria-hidden />}
    </section>
  );
}
