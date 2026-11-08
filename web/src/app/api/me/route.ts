import { me } from "@/lib/server/me";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => me(req);
