# Astro site — engine + demo

Two parts:

| Folder    | What                                                                                   | Stack                     |
|-----------|----------------------------------------------------------------------------------------|---------------------------|
| `engine/` | Calculation + "Ask" API: Western chart & transits, Chinese zodiac/BaZi/almanac, numerology, day scoring, best-dates search, guardrails, optional LLM narration | Spring Boot 3.3, Java 21, lunar-java |
| `web/`    | Demo page (RO/EN): birth form, Ask box with score dial, today's scores, chart wheel, Chinese, numerology, best days | Next.js 15, React 19       |

## Run

```bash
# 1. engine (port 8080)
cd engine
mvn spring-boot:run

# 2. web (port 3000) — proxies /engine/* to http://localhost:8080/api/*
cd web
npm install
npm run dev
```

Open http://localhost:3000 (redirects to `/ro`; `/en` for English).

Optional LLM narration (otherwise deterministic templates are used). Two providers:

```bash
# Anthropic directly (default provider, default model claude-haiku-4-5)
set ASTRO_LLM_API_KEY=sk-ant-...     # Windows
export ASTRO_LLM_API_KEY=sk-ant-...  # bash

# OpenRouter: any model from https://openrouter.ai/models (default deepseek/deepseek-v4-flash)
set ASTRO_LLM_PROVIDER=openrouter
set ASTRO_LLM_API_KEY=sk-or-...
set ASTRO_LLM_MODEL=deepseek/deepseek-v4-flash
```

`ASTRO_LLM_BASE_URL` overrides the endpoint host (e.g. for a proxy).

Instead of exporting variables, copy `engine/.env.example` to `engine/.env` (git-ignored) and fill it in; Spring imports it at startup, so restart the engine after editing it. Real environment variables take precedence over the file.

## API

All endpoints are `POST` with JSON. Birth data:

```json
{ "name": "Ana Pop", "date": "1990-06-15", "time": "08:30", "zone": "Europe/Bucharest",
  "latitude": 47.16, "longitude": 27.59 }
```

`time` may be `null` (houses/ascendant are then omitted).

| Endpoint | Body | Returns |
|---|---|---|
| `/api/chart` | birth | positions, signs, retrogrades, ASC/MC, whole-sign houses, aspects |
| `/api/chinese?date=` | birth | animal, element, yin/yang, four pillars, day master + the day's almanac (suitable/avoid, auspicious, clash/harmony with your sign) |
| `/api/numerology?date=` | birth | life path, birthday, expression/soul urge/personality (needs name), personal year/month/day |
| `/api/day?date=&locale=` | birth | 1–10 score per category with localized reasons |
| `/api/ask` | `{ birth, question, date?, locale? }` | category, score, verdict, reasons, narrative text, guardrail flag |
| `/api/best-days` | `{ birth, category, from?, days?, limit?, locale? }` | best dates ranked by score |

Categories: `LOVE, CAREER, MONEY, TRAVEL, COMMUNICATION, HOME, WELLBEING, GENERAL`.

Example:

```bash
curl -s localhost:8080/api/ask -H "Content-Type: application/json" -d "{\"birth\":{\"date\":\"1990-06-15\",\"time\":\"08:30\",\"zone\":\"Europe/Bucharest\",\"latitude\":47.16,\"longitude\":27.59},\"question\":\"E o zi bună să cunosc o persoană nouă?\",\"locale\":\"ro\"}"
```

## How a question is answered

1. **Guardrails** (`ask/Guardrails`) — distress → supportive message only; medical/legal/investment → disclaimer prefix.
2. **Classification** (`ask/QuestionClassifier`) — RO/EN keyword classifier → category.
3. **Scoring** (`scoring/ScoringRules`, cached per person+day):
   - Western: transiting planets aspecting natal planets (weighted by planet and aspect), transits through natal houses, retrogrades, Moon phase, Moon sign element, Moon vs natal Sun.
   - Chinese: almanac favorable/avoid activities mapped to categories, Yellow/Black Path day, day branch vs natal year branch (clash/harm/harmony/trine).
   - Numerology: personal day number themes.
   - Factors are summed per category and mapped to 1–10 with a soft curve (`toScore`).
4. **Narration** — `TemplateNarrator` (free, deterministic, RO/EN) or `LlmNarrator` (Anthropic API, told to use only the computed factors; falls back to templates on any error).

## Accuracy notes

- The ephemeris is self-contained (Meeus for Sun/Moon, JPL approximate elements for planets): Sun ~0.01°, Moon ~0.1°, planets ~0.1–0.5° for 1800–2050. Enough for signs, houses and transit aspects with orbs ≥1°. For progressions or exact ingress minutes, swap `astro/Ephemeris` for Swiss Ephemeris (AGPL or commercial licence) — the rest of the code only uses `Ephemeris.longitude()`.
- Houses are whole-sign. Placidus can be added in `ChartCalculator.compute`.
- Timezones use `java.time` + the tz database, so historical DST is handled. Geocoding is a fixed demo list (`web/src/lib/api.ts`); use GeoNames in production.
- Chinese New Year / lunar dates come from lunar-java (`cn.6tail:lunar`). If Maven cannot find version 1.7.3, pick the latest release on Maven Central.

## Tests

```bash
cd engine && mvn test
```

Covers Meeus reference values, equinox sign change, retrograde detection, numerology, classifier/guardrails, scoring ranges, the lunar-java integration and an API smoke test.

## Next steps toward the product

- Persist users and saved charts (PostgreSQL), GDPR consent/deletion.
- SEO pages per sign/day (Next.js SSR) generated from `/api/day`-style data.
- Caffeine/Redis cache instead of the in-memory one.
- Paid tier: free-text Ask + best-days search; PDF natal/compatibility reports.
- More systems behind the same `Factor` model: Vedic (sidereal), tarot of the day, Mayan calendar.
