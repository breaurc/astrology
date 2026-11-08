import { closeThread, getThread } from "@/lib/server/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return getThread(req, (await params).id);
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return closeThread(req, (await params).id);
}
