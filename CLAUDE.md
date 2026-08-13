# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Daivam (`jyotish-ai`) — a Next.js 16 (App Router) Vedic astrology app. Users get a Kundali (birth chart) computed from raw astronomical data, then AI-generated readings (Groq) layered on top: chat, Dasha Fal, Bhavishya Fal, Shubh Ashubh, Numerology, Milan (compatibility), Spouse Portrait.

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
npm run test     # vitest run (all tests)
npx vitest run app/lib/rate-limit/rate-limit.test.ts   # single test file
```

Tests live next to the code they cover (`*.test.ts`), run under `vitest` with `environment: 'node'`. The `@/*` path alias maps to the repo root in both `tsconfig.json` and `vitest.config.ts`.

## Architecture

### Chart computation is hand-rolled, not delegated to the astro libraries in package.json

`app/api/kundali/route.ts` computes the sidereal chart itself: Julian Day, Lahiri ayanamsa, tropical-to-sidereal conversion, Whole Sign houses, Vimshottari Dasha (+ antardashas), and Yogini Dasha. It uses `astronomy-engine` only for raw planetary longitudes/vectors; the ascendant is computed manually. `sweph`/`swisseph-wasm` are present in dependencies but this route does not use them. When touching chart math, the formulas and their sourcing (BPHS cross-references etc.) are documented inline as comments — read those before changing constants like `DASHA_YEARS` or the Yogini starting-index formula.

The core formulas shared across routes — `toJD`, `getLahiriAyanamsa`, `calcRahuTropical`, `norm360`/`toRad`/`toDeg`, `resolveUtcOffsetHours`, and the `SIGNS`/`NAKSHATRAS`/`NAKSHATRA_LORD` tables — live in `app/lib/jyotish/astro.ts`, not inline in `kundali/route.ts`. `transits`, `shubh-ashubh`, and `panchang` all import from there too. Fix formula bugs (ayanamsa precision, node terms, timezone/DST handling) in `astro.ts`, not in a single route — the four routes used to each carry their own copy and had already drifted out of sync before this consolidation.

The computed chart is upserted (one row per user, `onConflict: 'user_id'`) into `kundali_charts`, so regenerating a chart overwrites the previous one and `created_at` never changes on regeneration. Anything that needs to cache-bust on chart changes must use `chartFingerprint()` (`app/lib/cache/route-cache.ts`, hash of chart content), not `created_at`.

### Every downstream reading route follows the same shape

Routes like `dasha-fal`, `bhavishya-fal`, `shubh-ashubh`, `numerology`, `milan`:
1. Auth via `createClient()` (`app/lib/supabase/server.ts`) → 401 if no user.
2. Rate limit via `checkRateLimit(key, limit, windowMs)` (`app/lib/rate-limit/rate-limit.ts`) — Upstash Redis if `UPSTASH_REDIS_REST_URL`/`TOKEN` are set (global across instances), otherwise an in-memory sliding window (per-instance only). Same call signature either way.
3. Load the user's chart from `kundali_charts`.
4. Check `feature_cache` (`app/lib/cache/route-cache.ts`, `getCached`/`setCached`) keyed by `(user_id, feature)` with a per-feature `cacheKey` string (e.g. today's date, or a chart fingerprint) — skip the Groq call entirely on a cache hit. Requires a `feature_cache` table with a UNIQUE `(user_id, feature)` constraint.
5. On a miss, build a prompt from grounded chart facts and call Groq, then `setCached`.

When adding a new AI-backed route, follow this same auth → rate-limit → cache → Groq pipeline rather than inventing a new pattern.

### Two Groq models, chosen deliberately (`app/lib/groq/client.ts`)

- `GROQ_MODEL` (`openai/gpt-oss-20b`) — used by the structured, cache-backed routes where prompt-injected data does the work, not model creativity.
- `GROQ_MODEL_CHAT` (`openai/gpt-oss-120b`) — used only by `app/api/chat/route.ts`, the open-ended surface where a smaller model's generic filler is most noticeable. Chat cost is bounded by rate limiting instead of caching, since answers aren't cacheable.

Both models were switched from deprecated Groq models (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`) — see the comment in that file before reintroducing a llama model.

### Chat's system prompt is the integration point for chart + profile data

`app/api/chat/route.ts` builds a long system prompt (`buildSystemPrompt`) from the user's `profiles` row and their latest `kundali_charts` row on every request (not cached, since chat answers aren't cacheable). It computes gemstone recommendations by house-lordship (`app/lib/jyotish/remedies.ts`: `getOwnedHouses`, `getFunctionalNature`, `REMEDIES`) rather than by dasha lord, and explicitly instructs the model not to invent facts, dates, or remedies beyond what's injected — the model is treated as unreliable at arithmetic and classical lookups, so all numeric/lookup facts (Mulank/Bhagyank, gemstones, dasha timing) are precomputed and handed to it as text, never left for the model to derive.

### Auth and route protection

Supabase (`@supabase/ssr`) handles auth; `app/lib/supabase/server.ts` (server components/route handlers, cookie-based) vs `app/lib/supabase/client.ts` (browser) are separate clients — use the right one for the context.

`middleware.ts` protects dashboard routes. Note: `app/(dashboard)/*` and `app/(auth)/*` are route groups — the parens are stripped from the URL, so `app/(dashboard)/kundali` serves `/kundali`, not `/dashboard/kundali`. `PROTECTED_PATHS` in `middleware.ts` is therefore an explicit list of real URL paths, not a prefix check on `/dashboard`.

### Feature flags and optional infra

The app is designed to run with only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `GROQ_API_KEY` set — see `.env.example` for the full list and what degrades gracefully when unset:
- No Upstash creds → in-memory rate limiting (fine for single instance, not for multi-instance deploys).
- No `HF_TOKEN` / `NEXT_PUBLIC_SPOUSE_PORTRAIT_ENABLED=false` → Spouse Portrait feature is inert (paused pending image-gen budget — HF free tier only covers ~3 generations/month total, shared across all users).
- No Sentry DSN → errors only surface in server logs, not reported anywhere.

### Root-level `.patch` files

Several `*.patch` files sit at the repo root (`rate-limit-hardening.patch`, `milan-markdown-fix.patch`, `milan-payload-cap-fix.patch`, `graha-maitri-fix.patch`). These are historical/reference patches, not applied automatically — check whether their contents are already reflected in the current code before assuming they still need applying.
