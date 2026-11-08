"use client";

import { useState } from "react";
import { clearInputs } from "@/lib/inputs";
import type { Locale } from "@/lib/i18n";

/** Removes everything this site keeps in the browser's localStorage. */
export default function ClearBrowserData({ locale }: { locale: Locale }) {
  const [done, setDone] = useState(false);
  return (
    <p>
      <button className="btn ghost small" type="button" onClick={() => { clearInputs(); setDone(true); }} disabled={done}>
        {done ? (locale === "ro" ? "✓ Șters din acest browser" : "✓ Cleared from this browser")
          : (locale === "ro" ? "Șterge datele din acest browser" : "Clear data saved in this browser")}
      </button>
    </p>
  );
}
