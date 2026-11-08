import { notFound, redirect } from "next/navigation";
import AppHome from "@/components/app/AppHome";
import { LOCALES, type Locale } from "@/lib/i18n";
import { serverMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Signed-in home: calendar, question, conversation entry. Anonymous visitors go back to the landing page. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const me = await serverMe();
  if (!me.user) redirect(`/${locale}`);
  return <AppHome locale={locale as Locale} />;
}
