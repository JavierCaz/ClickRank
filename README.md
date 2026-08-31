# ClickRank 👆

Who's the most clickable person on Instagram?

A small social experiment: submit your Instagram profile, then collect clicks.
Every valid visitor click pushes you up the leaderboard. More clicks = higher rank.

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

- **Next.js 16** (App Router, Server Components + Route Handlers)
- **React 19**, **Tailwind CSS v4**
- **Supabase** (Postgres) with Row Level Security
- TypeScript, strict mode

## Getting started

### 1. Database (Supabase)

The schema lives in `supabase/migrations/`. It creates:

- `profiles` — Instagram username (normalized, unique), display name, avatar
- `clicks` — one row per valid click, with an **EXCLUDE constraint** enforcing
  *one valid click per visitor + profile per rolling 24h window*, atomically
- `submission_events` — lightweight rate limiting for submissions
- RLS policies + ranking functions (`get_leaderboard`, `get_profile_stats`,
  `get_next_ranked`)

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

See `.env.example`. Important security notes:

- `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — it is never shipped to the
  browser. All data access (leaderboard reads, profile submission, click
  recording) happens server-side.
- `CLICKRANK_IP_HASH_SECRET` salts the HMAC used to hash visitor IPs before
  storage. Raw IPs are never stored.

## How the click flow works

1. A visitor taps a profile → the client shows a brief "+1" confirmation.
2. The browser navigates to `/go/[username]`.
3. The server resolves the anonymous visitor id (HttpOnly cookie), hashes the
   IP, and atomically attempts to insert a click.
4. The database's EXCLUDE constraint rejects duplicate clicks (same visitor +
   profile within 24h) — no SELECT-then-INSERT race, no client-trusted state.
5. The visitor is 302-redirected to the Instagram profile regardless.

Repeat clicks within the cooldown still reach Instagram; they just don't
increment the leaderboard.

## Security model

- **RLS enabled** on every table. Anonymous clients can only read `profiles`
  (needed for the leaderboard). The `clicks` and `submission_events` tables
  have no public policies, and the ranking functions are not executable by
  public roles — a malicious client cannot fabricate clicks or counts.
- **Server-side validation** for username normalization and duplicate
  detection; unique index on `lower(username)` makes duplicates race-safe.
- **No arbitrary redirect URLs** — destinations are always derived from the
  normalized username server-side.
- **Rate limited** profile submission (per hashed IP).
- **No raw IPs** stored — only salted HMAC hashes.

## Scripts

```bash
npm run dev    # dev server
npm run build  # production build
npm run start  # serve production build
npm run lint   # eslint
```
