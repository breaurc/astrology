import { headers } from "next/headers";
import type { MeInfo } from "../types";
import { meFromHeaders } from "./me";

/** The caller as seen by a server component (reads the request cookies). */
export async function serverMe(): Promise<MeInfo> {
  const h = await headers();
  return meFromHeaders(h);
}
