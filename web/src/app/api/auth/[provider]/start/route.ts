import { oauthStart } from "@/lib/server/auth";

export const runtime = "nodejs";
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  return oauthStart(req, (await params).provider);
}
