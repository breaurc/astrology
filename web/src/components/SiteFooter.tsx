import type { Locale } from "@/lib/i18n";
import { ta } from "@/lib/i18n-account";

export default function SiteFooter({ locale }: { locale: Locale }) {
  const f = ta(locale).footer;
  return (
    <footer className="site-footer">
      <span>{f.demo}</span>
      <span>{f.entertainment}</span>
      <a href={`/${locale}/privacy`}>{f.privacy}</a>
    </footer>
  );
}
