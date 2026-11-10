import { getSky } from "@/lib/server/features";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = logged(getSky);
