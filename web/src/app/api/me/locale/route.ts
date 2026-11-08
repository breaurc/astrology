import { putLocale } from "@/lib/server/auth";

export const runtime = "nodejs";
export const PUT = (req: Request) => putLocale(req);
