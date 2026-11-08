import { closeThread, getThread } from "@/lib/server/features";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = logged(async (req: Request, { params }: { params: Promise<{ id: string }> }) => getThread(req, (await params).id));
export const DELETE = logged(async (req: Request, { params }: { params: Promise<{ id: string }> }) => closeThread(req, (await params).id));
