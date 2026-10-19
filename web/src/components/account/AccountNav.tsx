"use client";

import { useEffect, useState } from "react";
import { account } from "@/lib/account";
import type { Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";
import type { SessionInfo } from "@/lib/profile";

export function safeNextClient(next: string | null, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}

/** Header links: "Get your reading" + "Sign in" for guests, "My profile" when signed in. */
export default function AccountNav({ locale, onSession }: { locale: Locale; onSession?: (s: SessionInfo) => void }) {
  const n = ta(locale).nav;
  const [s, setS] = useState<SessionInfo | null>(null);

  useEffect(() => {
    account.session().then((x) => { setS(x); onSession?.(x); }).catch(() => setS({ user: null, profile: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!s) return <div className="account-nav" aria-hidden />;
  return (
    <div className="account-nav">
      {s.user ? (
        <a className="btn small" href={`/${locale}/me`}>{n.me}</a>
      ) : (
        <>
          <a className="link" href={`/${locale}/login`}>{n.signIn}</a>
          <a className="btn small" href={`/${locale}/start`}>{n.start}</a>
        </>
      )}
    </div>
  );
}
