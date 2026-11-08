"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { account } from "@/lib/account";
import type { MeInfo } from "@/lib/types";

const ANON: MeInfo = { tier: "anonymous", user: null, profile: null, credits: 0, locale: null, question: null };

interface Ctx { me: MeInfo | null; refresh: () => Promise<MeInfo>; set: (m: MeInfo) => void; }

const MeContext = createContext<Ctx>({ me: null, refresh: async () => ANON, set: () => undefined });

/** Fetches /api/me once per page load and shares it (HLD section 2). `me` is null until the first answer. */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeInfo | null>(null);
  const refresh = useCallback(async () => {
    try {
      const m = await account.me();
      setMe(m);
      return m;
    } catch {
      setMe(ANON);
      return ANON;
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const value = useMemo(() => ({ me, refresh, set: setMe }), [me, refresh]);
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  return useContext(MeContext);
}
