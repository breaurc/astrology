import { notFound, redirect } from "next/navigation";
import ChatView from "@/components/app/ChatView";
import { LOCALES, type Locale } from "@/lib/i18n";
import { serverMe } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string; threadId: string }> }) {
  const { locale, threadId } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const me = await serverMe();
  if (!me.user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/app/chat/${threadId}`)}`);
  return <ChatView locale={locale as Locale} threadId={threadId} />;
}
