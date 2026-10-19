import { notFound } from "next/navigation";
import Onboarding from "@/components/account/Onboarding";
import { LOCALES, type Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  return <Onboarding locale={locale as Locale} />;
}
