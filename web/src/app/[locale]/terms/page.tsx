import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Terms from "@/components/Terms";
import { LOCALES, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms" };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  return <Terms locale={locale as Locale} controller={process.env.PRIVACY_CONTROLLER} email={process.env.PRIVACY_EMAIL} />;
}
