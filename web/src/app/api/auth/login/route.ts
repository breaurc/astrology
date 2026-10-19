import { login } from "@/lib/server/auth";

export const runtime = "nodejs";
export const POST = (req: Request) => login(req);
