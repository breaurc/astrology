import { oauthCallback } from "@/lib/server/auth";

export const runtime = "nodejs";
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  return oauthCallback(req, (await params).provider);
}
