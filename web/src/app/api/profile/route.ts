import { deleteProfile, getProfile, putProfile } from "@/lib/server/auth";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = logged(getProfile);
export const PUT = logged(putProfile);
export const DELETE = logged(deleteProfile);
