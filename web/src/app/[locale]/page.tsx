import { notFound, redirect } from "next/navigation";
import Landing from "@/components/landing/Landing";
import { LOCALES, type Locale } from "@/lib/i18n";
import { serverMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Landing: form + free reading. A returning signed-in user with saved birth data lands on the week (SPEC section 4). */
export default async function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const me = await serverMe();
  if (me.user && me.profile) redirect(`/${locale}/app`);
  return <Landing locale={locale as Locale} />;
}
