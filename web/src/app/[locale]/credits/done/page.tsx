import { notFound, redirect } from "next/navigation";
import CreditsDone from "@/components/app/CreditsDone";
import { LOCALES, type Locale } from "@/lib/i18n";
import { serverMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const me = await serverMe();
  if (!me.user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/credits/done`)}`);
  return <CreditsDone locale={locale as Locale} />;
}
