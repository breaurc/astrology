import { getPackages } from "@/lib/server/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = () => getPackages();
