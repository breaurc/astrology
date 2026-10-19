import { register } from "@/lib/server/auth";

export const runtime = "nodejs";
export const POST = (req: Request) => register(req);
