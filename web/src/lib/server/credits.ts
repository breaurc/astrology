/**
 * Prepaid credits (SPEC section 6, HLD section 7): packages, Stripe Checkout and the webhook that writes the ledger.
 * The site never sees card data; the ledger is only credited from verified Stripe events (or, in development
 * without Stripe keys, from a simulated purchase that is clearly marked as such).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CreditPackage } from "../types";
import { cfg, stripeEnabled } from "./config";
import { body, fail, json, localeOf, sameOrigin } from "./request";
import { store } from "./store";
import { caller, gate } from "./tier";

interface PackageDef extends CreditPackage { priceId: string; enabled: boolean; }

/** Placeholder prices until Stripe Price ids are configured (SPEC: [PRICE 1], [PRICE 5], [PRICE M]). */
function packages(): PackageDef[] {
  return [
    { id: "single", credits: 1, amount: process.env.PACKAGE_SINGLE_EUR || "2.99", currency: "EUR", highlight: false,
      priceId: process.env.STRIPE_PRICE_SINGLE || "", enabled: true },
    { id: "pack", credits: 5, amount: process.env.PACKAGE_PACK_EUR || "9.99", currency: "EUR", highlight: true,
      priceId: process.env.STRIPE_PRICE_PACK || "", enabled: true },
    { id: "monthly", credits: 10, amount: process.env.PACKAGE_MONTHLY_EUR || "14.99", currency: "EUR", highlight: false,
      unlimitedQuestionsDays: 30, priceId: process.env.STRIPE_PRICE_MONTHLY || "", enabled: cfg.monthlyPackage },
  ];
}

// Prices live in Stripe and are read at startup (cached an hour), so changing a price needs no deploy.
const priceCache = new Map<string, { amount: string; currency: string; at: number }>();

async function stripe<T>(path: string, params?: Record<string, string>): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: params ? "POST" : "GET",
    headers: { Authorization: `Bearer ${cfg.stripeSecret}`, ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: params ? new URLSearchParams(params) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`stripe ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function withLivePrices(list: PackageDef[]): Promise<PackageDef[]> {
  if (!stripeEnabled()) return list;
  return Promise.all(list.map(async (p) => {
    if (!p.priceId) return p;
    const hit = priceCache.get(p.priceId);
    if (hit && Date.now() - hit.at < 3600_000) return { ...p, amount: hit.amount, currency: hit.currency };
    try {
      const pr = await stripe<{ unit_amount: number; currency: string }>(`/prices/${p.priceId}`);
      const v = { amount: (pr.unit_amount / 100).toFixed(2), currency: pr.currency.toUpperCase(), at: Date.now() };
      priceCache.set(p.priceId, v);
      return { ...p, amount: v.amount, currency: v.currency };
    } catch (e) {
      console.error("[credits] price lookup failed", e);
      return p;
    }
  }));
}

/** GET /api/credits/packages */
export async function getPackages(): Promise<Response> {
  const list = (await withLivePrices(packages().filter((p) => p.enabled)))
    .map(({ priceId: _p, enabled: _e, ...pub }) => pub);
  return json({ packages: list, stripe: stripeEnabled(), dev: !stripeEnabled() && !cfg.isProd, messageCap: cfg.messageCap });
}

/** POST /api/credits/checkout { packageId, locale } → { url } to redirect the browser to. */
export async function checkout(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const c = await caller(req);
  const g = gate(c, "user");
  if (g) return g;
  const b = await body(req);
  const pkg = packages().find((p) => p.enabled && p.id === b.packageId);
  if (!pkg) return fail(400, "validation", { fields: ["packageId"] });
  const locale = localeOf(b.locale, c.user!.locale ?? "ro");
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;

  if (!stripeEnabled()) {
    if (cfg.isProd) return fail(503, "not_configured");
    // Development: simulate a completed checkout so the funnel can be walked end to end.
    const sessionId = `dev_${randomBytes(8).toString("hex")}`;
    await grant(c.user!.id, pkg, sessionId);
    return json({ url: `${origin}/${locale}/credits/done?session_id=${sessionId}&dev=1`, dev: true });
  }
  if (!pkg.priceId) return fail(503, "not_configured", { details: `STRIPE_PRICE_${pkg.id.toUpperCase()} is not set` });
  try {
    const session = await stripe<{ id: string; url: string }>("/checkout/sessions", {
      mode: "payment",
      "line_items[0][price]": pkg.priceId,
      "line_items[0][quantity]": "1",
      client_reference_id: c.user!.id,
      "metadata[userId]": c.user!.id,
      "metadata[credits]": String(pkg.credits),
      "metadata[packageId]": pkg.id,
      ...(c.user!.email ? { customer_email: c.user!.email } : {}),
      locale: locale === "ro" ? "ro" : "en",
      "automatic_tax[enabled]": "true",
      invoice_creation: "true",
      success_url: `${origin}/${locale}/credits/done?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/credits`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("[credits] checkout failed", e);
    return fail(502, "stripe_error");
  }
}

async function grant(userId: string, pkg: PackageDef, stripeSessionId: string) {
  await store.credit(userId, pkg.credits, "purchase", { stripeSessionId, packageId: pkg.id });
  if (pkg.unlimitedQuestionsDays) {
    await store.setUnlimitedQuestions(userId, new Date(Date.now() + pkg.unlimitedQuestionsDays * 86400_000).toISOString());
  }
}

/** Verifies a Stripe-Signature header (t=…,v1=…) against the raw body; 5-minute tolerance. */
function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]).filter(([k]) => k === "t" || k === "v1").map(([k, v]) => [k, v]));
  const sigs = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(nowSec - t) > 300 || sigs.length === 0) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s, "hex"), Buffer.from(expected, "hex")));
}

/** POST /api/webhooks/stripe — signature-verified; credits the ledger once per event id. */
export async function stripeWebhook(req: Request): Promise<Response> {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), cfg.stripeWebhookSecret)) {
    return fail(400, "bad_signature");
  }
  let event: { id: string; type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return fail(400, "bad_payload");
  }
  if (event.type === "checkout.session.completed") {
    const first = await store.markStripeEvent(event.id, event.type);
    if (first) {
      const s = event.data.object;
      const meta = (s.metadata ?? {}) as Record<string, string>;
      const userId = (s.client_reference_id as string) || meta.userId;
      const pkg = packages().find((p) => p.id === meta.packageId);
      const credits = Number(meta.credits) || pkg?.credits || 0;
      if (userId && credits > 0 && (s.payment_status === "paid" || s.payment_status === "no_payment_required")) {
        await grant(userId, pkg ?? { ...packages()[0], credits }, String(s.id));
      } else {
        console.warn("[credits] checkout.session.completed without a payable user/credits", { userId, credits, status: s.payment_status });
      }
    }
  }
  return json({ received: true });
}

/** GET /api/credits/history → the ledger (purchases, openings, refunds), newest first. */
export async function creditHistory(req: Request): Promise<Response> {
  const c = await caller(req);
  const g = gate(c, "user");
  if (g) return g;
  return json({ credits: c.credits, entries: await store.ledgerOf(c.user!.id) });
}
