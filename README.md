# Cosmic Triad — cosmictriad.com

A personal daily reading in one step, then a three-tier funnel: free reading → free account (7-day calendar, one
question a day) → credits (multi-turn conversation). Western zodiac, Chinese horoscope and numerology, in Romanian
and English. Implements the companion *Astro Site — Functional Specification (SPEC)* and *High-Level Design (HLD)*.

| Folder    | What                                                                                                   | Stack                     |
|-----------|--------------------------------------------------------------------------------------------------------|---------------------------|
| `engine/` | Pure compute + narration: charts, transits, Chinese almanac, numerology, day scoring; `reading`, `answer` and `chat` narration modes with versioned prompts, token budget and timeouts | Spring Boot 3.3, Java 21, lunar-java |
| `web/`    | The site: landing with the free reading, sign-in sheet, calendar + question, paywall, conversation, profile; identity, quotas, credits and the Stripe integration live in its server layer | Next.js 15, React 19 |

## Run

```bash
# 1. engine (port 8080)
cd engine
mvn spring-boot:run

# 2. web (port 3000)
cd web
npm install
npm run dev
```

Open http://localhost:3000 (redirects to `/ro`; `/en` for English). Without a mail provider the sign-in sheet shows a
*"Development: open the verification link"* button; without Stripe keys the paywall simulates the purchase.

LLM narration is optional (templates otherwise). Copy `engine/.env.example` to `engine/.env`:

```bash
ASTRO_LLM_PROVIDER=openrouter          # or anthropic
ASTRO_LLM_API_KEY=sk-or-...
ASTRO_LLM_MODEL=deepseek/deepseek-v4-flash
ASTRO_LLM_REASONING=on                 # on | low | medium | high | off: hidden thinking of a reasoning model
ASTRO_LLM_REASONING_TOKENS=1500        # thinking budget on top of each answer cap
ASTRO_LLM_FALLBACK_MODEL=              # tried on errors / timeouts
ASTRO_LLM_TIMEOUT_MS=30000
ASTRO_LLM_DAILY_TOKENS=0               # daily ceiling; 0 = unlimited
```

## The funnel (SPEC sections 2 to 4)

| Tier | Screen | Route | What the server enforces |
|---|---|---|---|
| Free | Landing: form + reading on one page; locked calendar and question teasers; conversation strip | `/[locale]` | `POST /api/readings`: `FREE_READINGS_PER_IP` per hashed IP per day (identical inputs are not counted twice); the engine caches a reading per inputs + date until its hourly clear |
| Signed in | Sign-in sheet (bottom sheet / modal) → *Your week*: 7-day strip, day detail, question box, conversation panel | `/[locale]/app` | 401 without a session, 409 without birth data; `POST /api/questions` is unique per (user, local day) → 429 with `retryAt` |
| Paid | Paywall → Stripe Checkout → *credits/done* → conversation | `/[locale]/credits`, `/[locale]/app/chat/[id]` | `POST /api/threads` takes one credit in the same transaction (402 at zero); `MESSAGE_CAP` messages and `MAX_CHARS` per message; a thread closed with no messages refunds the credit |

Also: `/[locale]/profile` (birth data, language, credits and history, export, delete), `/[locale]/privacy`,
`/[locale]/terms`, `/[locale]/login` (deep links and OAuth returns). `/me` and `/start` redirect to the new routes.

Every gate is decided by the server and surfaced as a machine-readable reason (`sign_in`, `birth_data`, `credits`,
`free_readings`, `daily_question`, `thread_closed`); the UI only renders the matching locked state.

### How it maps onto the HLD

The HLD puts identity, quotas and credits in the Spring engine with PostgreSQL. This version keeps them in the
Next.js server layer (`web/src/lib/server/*`), which already had sessions and the user store, and keeps the engine
stateless; the engine is reachable only from the web container, so the enforcement point is still single. The
data model follows HLD section 5 (users, birth data, readings cache in the engine, questions, threads, messages,
credit ledger, Stripe events, hashed IP quota), stored in `web/.data/users.json` behind one serialized store
(`lib/server/store.ts`). Moving that store to PostgreSQL, or the whole layer into the engine, needs no change
elsewhere. See *Next steps*.

## Web server layer (`web/src/lib/server`)

| File | Responsibility |
|---|---|
| `tier.ts` | Resolves the caller to `anonymous` / `user` / `paid` (credits > 0) and gates features; builds `GET /api/me` |
| `features.ts` | `POST /api/readings`, `GET /api/calendar`, `GET/POST /api/questions`, `/api/threads[...]` |
| `credits.ts` | Packages (prices read from Stripe at startup when ids are set), `POST /api/credits/checkout`, signature-verified `POST /api/webhooks/stripe` (idempotent by event id), ledger history |
| `auth.ts` | Email + password with verification link, Google / Facebook (PKCE, state), session cookie, profile, language, GDPR export / delete |
| `store.ts` | The JSON-file store: users, questions, threads, messages, ledger, Stripe events, IP counters; cascading delete |
| `engine.ts` | The only client of the Spring engine (fakeable in tests) |
| `mailer.ts` | Verification emails through Resend; logs the link when not configured |
| `request.ts` | JSON helpers, daily-salted IP hash, the caller's local date from `X-Timezone` |

Configuration: `web/.env.example` (limits, Stripe, mail, social login, privacy notice).

## Engine API (`/api`, JSON)

Birth data: `{ "name": "Ana Pop", "date": "1990-06-15", "time": "08:30", "zone": "Europe/Bucharest", "latitude": 47.16, "longitude": 27.59 }`
(`time` may be `null`).

| Endpoint | Body | Returns |
|---|---|---|
| `POST /api/reading` | `{ birth, system: WESTERN\|CHINESE\|NUMEROLOGY, date?, locale? }` | computed facts for the system, score/verdict, factors, ~4-line text (`narrator`: llm/template). Cached per inputs + date + locale |
| `POST /api/calendar` | `{ birth, from?, days?, locale? }` | per day: score, verdict, `good` / `avoid` category keys, per-category scores, top reasons. No LLM |
| `POST /api/chat` | `{ birth, date?, locale?, history: [{role,text}], message }` | the next reply; guardrails (distress, medical/legal/investment prefix, off-topic refusal without an LLM call) |
| `POST /api/ask` | `{ birth, question, date?, locale? }` | the daily question: category, score, verdict, reasons, text, token usage |
| `POST /api/chart`, `/chinese`, `/numerology`, `/day`, `/best-days` | as before | raw computations |

Narration (`ask/NarrationService`): one versioned system prompt per mode and language under
`resources/prompts/{mode}.{lang}.txt`; the facts are always computed in Java and handed to the model as context.
Per-mode output caps, a 20 s timeout with an optional fallback model, a daily token ceiling (readings fall back to
templates, answer/chat return `503 budget`), and `model` / `tokens_in` / `tokens_out` / latency logged per call and
returned to the web tier, which stores them on the question / message rows.

## Accounts, consent and GDPR (SPEC section 5)

- Email accounts are created only with the consent box ticked and become active when the verification link is
  opened (24 h, resendable); social sign-in carries the consent flag and is refused without it.
- The privacy notice (`/privacy`) and the terms (`/terms`) exist in both languages; the terms state the service is
  for entertainment. Fill `PRIVACY_CONTROLLER`, `PRIVACY_EMAIL`, `PRIVACY_HOSTING`, `PRIVACY_AI`.
- Profile page: edit birth data, change language (also sent to the engine with every call), download everything as
  JSON (account, questions, threads, messages, ledger), delete birth data (withdraw consent) or delete the account
  (cascades; Stripe keeps its own records).
- Anonymous visitors: nothing stored server-side beyond a daily-salted IP hash counter; inputs stay in
  `localStorage` (`astro.inputs`). Session cookie only, no analytics, no cookie banner.

## Payments (SPEC section 6)

Prepaid credits, one credit = one conversation of `MESSAGE_CAP` messages. Packages: single (1), pack (5, highlighted),
monthly (10 + unlimited questions for 30 days; `MONTHLY_PACKAGE=on` to offer it). Stripe Checkout hosted page with
automatic tax and invoice; the ledger is written only from the verified `checkout.session.completed` webhook. Set
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the `STRIPE_PRICE_*` ids; without a secret key, development
simulates the purchase and production returns 503.

## Tests

```bash
cd engine && mvn test                      # ephemeris, numerology, scoring, guardrails, API smoke + funnel endpoints (template mode)
cd web && npx tsx --test tests/*.test.ts   # accounts, verification, OAuth round-trips, GDPR; readings quota, gates, question quota, credits, threads, Stripe webhook
```

## Logs and observability

- One line per API request in the web log: `[req] id=<request id> POST /api/readings 200 123ms tier=anonymous code=...`.
  Ids and tokens in paths are masked, no IP or user id is logged. The id is forwarded to the engine as
  `X-Request-Id`, appears as `rid=` on every engine log line and is returned to the browser.
- `GET /api/health`: 200 when the engine answers, 503 otherwise; for the uptime monitor and the deploy smoke test.
- Daily summary (06:00 UTC, `lib/server/ops.ts`): accounts, questions, conversations, tokens and credits from the
  store, plus in-process counters (requests by route and status, readings by tier, quota hits, engine failures by
  cause). Logged, emailed to `OPS_EMAIL`, and available on demand at `GET /api/ops/summary` with `OPS_TOKEN`.
- Engine counters via Micrometer on the internal actuator: `narration.calls`, `narration.tokens`, `api.unavailable`.
- Docker log files are capped in `docker-compose.yml`. Caddy access logging stays off (no visitor IPs on disk).

## Deploy

Docker Compose + Caddy on the Oracle Cloud VM: see [deploy/DEPLOY.md](deploy/DEPLOY.md). `ENGINE_URL` is a runtime
variable of the web container (compose sets `http://engine:8080`). New production settings in
`deploy/web.env.example`: limits, Resend, Stripe. Add the webhook endpoint `https://<domain>/api/webhooks/stripe`
for `checkout.session.completed` in the Stripe dashboard.

## Next steps

- Move `lib/server/store.ts` to PostgreSQL (same functions), then optionally the whole entitlement layer into the
  engine as the HLD describes (HLD section 10, increments 2 and 5).
- Cloudflare rate rules in front of `/api/readings` and `/api/auth/*`; Turnstile if sign-up abuse appears.
- The monthly package as a real Stripe subscription (`invoice.paid`).
- PWA manifest and service worker once sign-ins exist.
- Open questions from the SPEC: the exact `[N]` quotas and price points are environment variables with placeholder defaults.
