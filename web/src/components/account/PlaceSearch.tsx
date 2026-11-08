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

/** City autocomplete (combobox pattern). The picked place is a fixed-height row, same height as the input. */
export default function PlaceSearch({ locale, value, onChange, autoFocus }: Props) {
  const t = ta(locale).place;
  const id = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
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

  if (value) {
    return (
      <div className="place-picked" title={`${value.latitude.toFixed(2)}°, ${value.longitude.toFixed(2)}° · ${value.zone}`}>
        <span className="pin" aria-hidden>◉</span>
        <b>{value.label}</b>
        <button type="button" className="link" onClick={() => { onChange(null); setTimeout(() => inputRef.current?.focus(), 0); }}>
          {t.change}
        </button>
      </div>
    );
  }

  return (
    <div className="combo">
      <label htmlFor={`${id}-q`} className="sr-only">{t.label}</label>
      <input
        id={`${id}-q`} ref={inputRef} className="input" value={q} placeholder={t.placeholder} autoFocus={autoFocus}
        autoComplete="off" role="combobox" aria-expanded={open} aria-controls={`${id}-list`}
        aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
        onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
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
  );
}
