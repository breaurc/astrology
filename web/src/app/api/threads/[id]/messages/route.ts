import { postMessage } from "@/lib/server/features";

export const runtime = "nodejs";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return postMessage(req, (await params).id);
}
