import { createThread, listThreads } from "@/lib/server/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => listThreads(req);
export const POST = (req: Request) => createThread(req);
