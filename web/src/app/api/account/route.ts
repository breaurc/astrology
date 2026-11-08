import { deleteAccount, exportAccount } from "@/lib/server/auth";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = logged(exportAccount);
export const DELETE = logged(deleteAccount);
