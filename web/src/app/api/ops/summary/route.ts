import { logged } from "@/lib/server/log";
import { opsSummary } from "@/lib/server/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = logged(opsSummary);
