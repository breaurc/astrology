import { searchPlaces } from "@/lib/server/places";
import { logged } from "@/lib/server/log";

export const runtime = "nodejs";
export const GET = logged(searchPlaces);
