import { postReading } from "@/lib/server/features";

export const runtime = "nodejs";
export const POST = (req: Request) => postReading(req);
