import { notFound, redirect } from "next/navigation";
import MyProfile from "@/components/account/MyProfile";
import { LOCALES, type Locale } from "@/lib/i18n";
import { serverMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const me = await serverMe();
  if (!me.user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/profile`)}`);
  return <MyProfile locale={locale as Locale} />;
}
