import { resendVerification } from "@/lib/server/auth";

export const runtime = "nodejs";
export const POST = (req: Request) => resendVerification(req);
