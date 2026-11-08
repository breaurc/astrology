import { notFound } from "next/navigation";
import LoginView from "@/components/account/LoginView";
import { LOCALES, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  return <LoginView locale={locale as Locale} />;
}
