"use client";

import { useEffect, useRef } from "react";
import type { SessionInfo } from "@/lib/profile";
import { fill, t, type Locale } from "@/lib/i18n";
import AuthPanel from "./AuthPanel";

interface Props {
  locale: Locale;
  open: boolean;
  onClose: () => void;
  onAuthenticated: (s: SessionInfo) => void | Promise<void>;
  /** The visitor's first name, to make the pitch personal. */
  name?: string;
  next: string;
}

/** Gate 1: a bottom sheet on the phone, a centered modal on the laptop (SPEC section 4). */
export default function SignInSheet({ locale, open, onClose, onAuthenticated, name, next }: Props) {
  const d = t(locale).sheet;
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="sheet-title">
      <div className="sheet-body">
        <div className="sheet-handle" aria-hidden />
        <h2 id="sheet-title">{d.title}</h2>
        <p className="muted">{name ? fill(d.text, { name }) : d.textAnon}</p>
        {open && <AuthPanel locale={locale} next={next} defaultName={name} onAuthenticated={onAuthenticated} />}
        <button type="button" className="link quiet center" onClick={onClose}>{d.notNow}</button>
      </div>
    </dialog>
  );
}
