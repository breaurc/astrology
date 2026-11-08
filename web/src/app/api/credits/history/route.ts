import { creditHistory } from "@/lib/server/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => creditHistory(req);
