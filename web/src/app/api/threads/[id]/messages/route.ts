import { postMessage } from "@/lib/server/features";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const POST = logged(async (req: Request, { params }: { params: Promise<{ id: string }> }) => postMessage(req, (await params).id));
