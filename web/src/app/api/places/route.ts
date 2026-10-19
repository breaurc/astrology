import { searchPlaces } from "@/lib/server/places";

export const runtime = "nodejs";
export const GET = (req: Request) => searchPlaces(req);
