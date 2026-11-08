import { logout } from "@/lib/server/auth";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const POST = logged(logout);
