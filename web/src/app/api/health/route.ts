import { health } from "@/lib/server/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = () => health();
