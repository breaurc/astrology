import { stripeWebhook } from "@/lib/server/credits";

export const runtime = "nodejs";
export const POST = (req: Request) => stripeWebhook(req);
