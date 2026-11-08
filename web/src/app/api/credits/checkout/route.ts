import { checkout } from "@/lib/server/credits";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const POST = logged(checkout);
