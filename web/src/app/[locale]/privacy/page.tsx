import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PrivacyNotice from "@/components/PrivacyNotice";
import { LOCALES, type Locale } from "@/lib/i18n";

// Read the operator details at request time, so they can be changed without rebuilding.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Privacy · Astro" };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  return (
    <PrivacyNotice locale={locale as Locale} cfg={{
      controller: process.env.PRIVACY_CONTROLLER,
      email: process.env.PRIVACY_EMAIL,
      hosting: process.env.PRIVACY_HOSTING,
      ai: process.env.PRIVACY_AI,
      social: process.env.SOCIAL_LOGIN === "on",
    }} />
  );
}
