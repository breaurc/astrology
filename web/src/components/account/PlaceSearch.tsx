"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Place } from "@/lib/profile";
import type { Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";

interface Props {
  locale: Locale;
  value: Place | null;
  onChange: (p: Place | null) => void;
  autoFocus?: boolean;
}

/** City autocomplete (combobox pattern) with a manual coordinates fallback. */
export default function PlaceSearch({ locale, value, onChange, autoFocus }: Props) {
  const t = ta(locale).wizard.place;
  const id = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [m, setM] = useState({ label: "", lat: "", lon: "", zone: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctl = new AbortController();
    setLoading(true);
    const h = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?${new URLSearchParams({ q, lang: locale })}`, { signal: ctl.signal });
        const list = (await res.json()) as Place[];
        setResults(list);
        setActive(0);
        setOpen(true);
      } catch {
        /* aborted */
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(h);
      ctl.abort();
    };
  }, [q, locale]);

  function pick(p: Place) {
    onChange(p);
    setOpen(false);
    setQ("");
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); pick(results[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  function applyManual(next: typeof m) {
    setM(next);
    const lat = Number(next.lat), lon = Number(next.lon);
    let zoneOk = false;
    try { new Intl.DateTimeFormat("en", { timeZone: next.zone }); zoneOk = !!next.zone; } catch { zoneOk = false; }
    if (next.label.trim() && next.lat !== "" && next.lon !== "" && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && zoneOk) {
      onChange({ label: next.label.trim(), latitude: lat, longitude: lon, zone: next.zone });
    } else {
      onChange(null);
    }
  }

  if (value && !manual) {
    return (
      <div className="place-picked">
        <span className="pin" aria-hidden>◉</span>
        <div>
          <b>{value.label}</b>
          <small>{value.latitude.toFixed(2)}°, {value.longitude.toFixed(2)}° · {value.zone}</small>
        </div>
        <button type="button" className="link" onClick={() => { onChange(null); setTimeout(() => inputRef.current?.focus(), 0); }}>
          {t.change}
        </button>
      </div>
    );
  }

  return (
    <div className="place-search">
      {!manual ? (
        <div className="combo">
          <label htmlFor={`${id}-q`} className="sr-only">{t.label}</label>
          <input
            id={`${id}-q`} ref={inputRef} className="big-input" value={q} placeholder={t.placeholder} autoFocus={autoFocus}
            autoComplete="off" role="combobox" aria-expanded={open} aria-controls={`${id}-list`}
            aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
            onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} onFocus={() => results.length && setOpen(true)}
          />
          {loading && <span className="combo-status">{t.searching}</span>}
          {open && (
            <ul id={`${id}-list`} role="listbox" className="combo-list">
              {results.length === 0 && !loading ? <li className="combo-empty">{t.none}</li> : results.map((p, i) => (
                <li key={`${p.label}-${p.latitude}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
                  onMouseDown={(e) => { e.preventDefault(); pick(p); }} onMouseEnter={() => setActive(i)}>
                  <b>{p.label.split(", ")[0]}</b>
                  <small>{p.label.split(", ").slice(1).join(", ")} · {p.zone}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="manual">
          <div className="field">
            <label htmlFor={`${id}-ml`}>{t.manualLabel}</label>
            <input id={`${id}-ml`} value={m.label} onChange={(e) => applyManual({ ...m, label: e.target.value })} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor={`${id}-lat`}>{t.lat}</label>
              <input id={`${id}-lat`} inputMode="decimal" value={m.lat} placeholder="47.16" onChange={(e) => applyManual({ ...m, lat: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor={`${id}-lon`}>{t.lon}</label>
              <input id={`${id}-lon`} inputMode="decimal" value={m.lon} placeholder="27.59" onChange={(e) => applyManual({ ...m, lon: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor={`${id}-zone`}>{t.zone}</label>
            <input id={`${id}-zone`} value={m.zone} placeholder="Europe/Bucharest" onChange={(e) => applyManual({ ...m, zone: e.target.value })} />
          </div>
        </div>
      )}
      <button type="button" className="link" onClick={() => { setManual(!manual); onChange(null); }}>
        {manual ? t.manualHide : t.manual}
      </button>
    </div>
  );
}
