import type { Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";

/** Consent wording with a link to the privacy notice (opens in a new tab so the form isn't lost). */
export default function ConsentText({ locale }: { locale: Locale }) {
  const a = ta(locale).auth;
  const [before, after] = a.consent.split("{link}");
  return (
    <span>
      {before}
      <a href={`/${locale}/privacy`} target="_blank" rel="noopener">{a.privacyLink}</a>
      {after}
    </span>
  );
}
