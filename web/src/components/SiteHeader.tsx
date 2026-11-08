"use client";

import { usePathname } from "next/navigation";
import { useMe } from "./MeProvider";
import { account } from "@/lib/account";
import { LOCALES, t, type Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  /** Opens the sign-in sheet instead of navigating to /login (landing page). */
  onSignIn?: () => void;
}

/** Brand, language toggle, credit balance and the sign-in / profile entry (SPEC section 4: sign in top-right). */
export default function SiteHeader({ locale, onSignIn }: Props) {
  const d = t(locale);
  const { me } = useMe();
  const path = usePathname() ?? `/${locale}`;

  const swap = (l: Locale) => {
    const rest = path.replace(/^\/(ro|en)(?=\/|$)/, "");
    return `/${l}${rest}`;
  };
  const changeLang = (l: Locale) => {
    if (me?.user) account.setLocale(l).catch(() => undefined);
  };
  const initial = (me?.profile?.displayName || me?.user?.name || me?.user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="header">
      <div className="wrap">
        <a href={`/${locale}`} className="brand">{d.brand}</a>
        <div className="header-right">
          <nav className="lang" aria-label="Language">
            {LOCALES.map((l) => (
              <a key={l} href={swap(l)} aria-current={l === locale ? "page" : undefined} onClick={() => changeLang(l)}>{l.toUpperCase()}</a>
            ))}
          </nav>
          {me?.user ? (
            <>
              <a className="credits-pill" href={`/${locale}/credits`} title={d.nav.credits}>✦ {me.credits}</a>
              <a className="avatar" href={`/${locale}/profile`} aria-label={d.nav.profile}>{initial}</a>
            </>
          ) : me ? (
            onSignIn
              ? <button type="button" className="btn ghost small" onClick={onSignIn}>{d.nav.signIn}</button>
              : <a className="btn ghost small" href={`/${locale}/login`}>{d.nav.signIn}</a>
          ) : <span className="btn ghost small" style={{ visibility: "hidden" }}>{d.nav.signIn}</span>}
        </div>
      </div>
    </header>
  );
}
