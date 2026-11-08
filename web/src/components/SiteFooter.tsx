import { t, type Locale } from "@/lib/i18n";

export default function SiteFooter({ locale }: { locale: Locale }) {
  const f = t(locale).footer;
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>{f.copyright}</span>
        <a href={`/${locale}/privacy`}>{f.privacy}</a>
        <a href={`/${locale}/terms`}>{f.terms}</a>
        <span>{f.fun}</span>
      </div>
    </footer>
  );
}
