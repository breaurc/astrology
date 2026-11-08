import { verifyEmail } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => verifyEmail(req);
