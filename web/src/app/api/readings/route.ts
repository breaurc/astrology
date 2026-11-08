import { postReading } from "@/lib/server/features";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const POST = logged(postReading);
