import { redirect } from "next/navigation";

/** The multi-step wizard was replaced by the one-step landing form (HLD section 10, increment 1). */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale === "en" ? "en" : "ro"}`);
}
