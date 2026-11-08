import { getCalendar } from "@/lib/server/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => getCalendar(req);
