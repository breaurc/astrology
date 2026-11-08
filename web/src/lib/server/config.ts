/**
 * Limits and integrations, all from the environment so they can be tuned without a release (HLD section 8).
 * Placeholders from the SPEC ([N], [MESSAGE CAP], [MAX CHARS]) get these defaults.
 */
function int(v: string | undefined, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : dflt;
}

export const cfg = {
  /** Anonymous readings per hashed IP per day; identical inputs on the same day are not counted twice. */
  freeReadingsPerIp: int(process.env.FREE_READINGS_PER_IP, 5),
  /** New accounts per hashed IP per day. */
  signupsPerIp: int(process.env.SIGNUPS_PER_IP, 3),
  /** Messages (user turns) one credit buys. */
  messageCap: int(process.env.MESSAGE_CAP, 20),
  /** Characters per conversation message. */
  maxChars: int(process.env.MAX_CHARS, 500),
  /** Characters per daily question (the engine accepts 300). */
  maxQuestionChars: 300,
  /** Days the signed-in calendar shows. */
  calendarDays: int(process.env.CALENDAR_DAYS, 7),

  engineUrl: (process.env.ENGINE_URL ?? "http://localhost:8080").replace(/\/$/, ""),

  stripeSecret: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  /** The optional subscription-like package (SPEC section 6, open question): off by default. */
  monthlyPackage: process.env.MONTHLY_PACKAGE === "on",

  isProd: process.env.NODE_ENV === "production",
} as const;

export function stripeEnabled(): boolean {
  return !!cfg.stripeSecret;
}
