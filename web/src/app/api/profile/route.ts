import { deleteProfile, getProfile, putProfile } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => getProfile(req);
export const PUT = (req: Request) => putProfile(req);
export const DELETE = (req: Request) => deleteProfile(req);
