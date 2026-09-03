# ClickRank 👆

Who's the most clickable person on Instagram?

ClickRank is a small social experiment: people submit their Instagram profiles,
and profiles are ranked by how many **valid clicks** they receive. Click a
profile → it climbs the leaderboard → the visitor is redirected to Instagram.

> **The core mechanic:** more clicks = higher rank. One valid click per visitor
> + profile per rolling cooldown window (default 5 seconds). Deliberately
> minimal — no accounts, no followers sync, no payments.

## The core loop

```
Submit Instagram
       ↓
Appear on leaderboard
       ↓
People click your profile
       ↓
Valid click is recorded
       ↓
You climb the leaderboard
       ↓
Visitor is redirected to Instagram
```

## Tech stack

- **Next.js 16** (App Router, Server Components + Route Handlers, Turbopack)
- **React 19**, **Tailwind CSS v4**
- **Supabase** (Postgres) with **Row Level Security** on every table
- **TypeScript** (strict mode)

## Project layout

```
app/
  page.tsx                    Landing: hero + live leaderboard (all time)
  submit/page.tsx             Profile submission page
  go/[username]/route.ts      GET: records a click, 302 → Instagram
  api/profiles/route.ts       POST: validate + insert a profile (rate limited)
  layout.tsx / globals.css    Root layout + Tailwind theme/animations
  loading.tsx / error.tsx / not-found.tsx
components/
  click-target.tsx            "+1" click flow (POST or /go redirect)
  leaderboard.tsx             Client leaderboard with En Vivo badge + rows
  avatar.tsx / submit-form.tsx
lib/
  supabase.ts                 Server-only service-role client (the ONLY db client)
  security.ts                 Visitor cookie, IP hashing, anti-abuse primitives
  username.ts                 Instagram username validation/normalization
  leaderboard.ts              Typed wrapper around the SQL ranking function
  avatar.ts                   Deterministic generated SVG avatars
supabase/
  migrations/                 Schema + RLS + ranking functions (reproducible)
  seed.sql                    Demo data (dev only)
```

## Getting started

### 1. Database (Supabase)

The schema lives in `supabase/migrations/`. It creates:

- `profiles` — Instagram username (normalized, unique), display name, avatar
- `clicks` — one row per valid click, with an **EXCLUDE constraint**
  (`btree_gist` + `tstzrange`) enforcing *one valid click per visitor + profile
  per rolling cooldown window*, **atomically in the database** (window length
  comes from the `click_config` table)
- `click_config` — single-row config table holding the click cooldown
  interval (default 5 seconds)
- `submission_events` — lightweight per-IP rate limiting for submissions
- RLS policies + ranking functions (`get_leaderboard`, `get_profile_stats`,
  `get_next_ranked`) computed in Postgres

**Local development:**

```bash
supabase start          # starts the local stack (Docker)
supabase db reset       # applies migrations + seeds demo data
```

Then copy `.env.example` to `.env.local` and fill in the values from
`supabase status`.

**Production:** link your Supabase project and run:

```bash
supabase link --project-ref <ref>
supabase db push        # applies migrations to the remote database
```

### 2. App

```bash
npm install
npm run dev             # http://localhost:3000
```

## Environment variables

See `.env.example`.

- `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**. Never shipped to the browser;
  all data access (leaderboard reads, profile submission, click recording)
  happens server-side through `lib/supabase.ts`.
- `CLICKRANK_IP_HASH_SECRET` — salt for the HMAC used to hash visitor IPs
  before storage. Raw IPs are never stored. Use a long random string in
  production (`openssl rand -hex 32`).

## How the click flow works

1. On the leaderboard a visitor taps a profile row -> the client shows a brief
   "+1" confirmation (optimistic UI).
2. The client POSTs to `/api/clicks/[username]`; the visitor stays on the page.
3. The server resolves the anonymous visitor id (HttpOnly cookie, minted if
   missing), hashes the IP, and **atomically attempts to insert a click**.
4. The database's EXCLUDE constraint rejects duplicate clicks (same visitor +
   profile within the rolling cooldown window) - no SELECT-then-INSERT race,
   no client-trusted state.
5. The row updates with the server verdict: the count only moves when the DB
   actually recorded the click, and a live countdown pill + progress bar shows
   while a (visitor, profile) cooldown window is active ("Click counted -
   next click in Ns", or amber "Already helped" on a blocked attempt), driven
   by the DB window so it always matches `click_config`.

A separate `/go/[username]` route records the click and 302-redirects the
visitor to the Instagram profile **regardless** of whether the click counted
- handy when the click should hand the visitor off to Instagram.

## Security model

- **RLS enabled everywhere.** Anonymous clients can only `SELECT profiles` (the
  leaderboard). The `clicks`, `submission_events`, and `click_config` tables
  have zero public policies, and the ranking functions are not executable by
  anon/authenticated roles — a malicious client cannot fabricate clicks or
  counts.
- **No anon key in the browser.** All Supabase access goes through the
  server-only service-role client; the key never reaches `.next/static/`.
- **Server-side validation** for username normalization + duplicate detection;
  a unique index on `lower(username)` makes duplicates race-safe.
- **No arbitrary redirect URLs** — destinations are always derived from the
  normalized username server-side.
- **Rate limited** profile submission (per hashed IP).
- **No raw IPs** stored — only salted HMAC hashes.
## Tuning the click cooldown

Clicks are limited to one per (visitor, profile) per rolling cooldown window,
currently **5 seconds**. The database reads the window from the single-row
`click_config` table on every click insert — no app code or deploy involved.

Change it with one UPDATE (Supabase SQL editor, or as a migration):

```sql
update public.click_config set cooldown = interval '5 minutes';
```

The new window applies to clicks recorded after the UPDATE. Raising the
cooldown needs no backfill (already-recorded clicks just expire sooner).
Lowering it should also reshape existing rows so the old, longer windows stop
blocking people:

```sql
update public.clicks set valid_until = created_at + public.click_cooldown();
```

## Verification checklist

- `npm run lint` and `npm run build` pass.
- Click flow: duplicate clicks (including concurrent ones) are rejected by the
  EXCLUDE constraint; redirect still 302s to Instagram; different
  profile/different visitor still counts.
- RLS: anon can only SELECT profiles; cannot write clicks/profiles; cannot
  EXECUTE ranking functions.
- No service-role key or env reference in client bundles.

## Scripts

```bash
npm run dev    # dev server
npm run build  # production build
npm run start  # serve production build
npm run lint   # eslint
```

## Note for AI agents

See `AGENTS.md` for architecture rules (security boundary, RLS, anti-abuse)
and the Next.js 16 gotchas that differ from older versions.
