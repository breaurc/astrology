import { redirect } from "next/navigation";

/** The profile moved from /me to /profile (HLD section 2). */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale === "en" ? "en" : "ro"}/profile`);
}
