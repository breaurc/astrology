import { oauthCallback } from "@/lib/server/auth";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const GET = logged(async (req: Request, { params }: { params: Promise<{ provider: string }> }) => oauthCallback(req, (await params).provider));
