<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ClickRank — Agent Guide

ClickRank is a small social experiment: people submit their Instagram profiles,
and profiles are ranked by how many valid clicks they receive. Click a profile →
it climbs the leaderboard → the visitor is redirected to Instagram.

> **Core mechanic:** more clicks = higher rank. One valid click per visitor +
> profile per rolling cooldown window (see `click_config`, default 5 seconds).
> Do not add social features, auth, followers sync, payments, or analytics
> dashboards. Keep it minimal.

## Stack

- **Next.js 16** (App Router, Server Components + Route Handlers, Turbopack)
- **React 19**, **Tailwind CSS v4**, **TypeScript** (strict)
- **Supabase** (Postgres) as the only database — with RLS enabled everywhere
- Local stack via the Supabase CLI (Docker)

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
  leaderboard.ts              Typed wrappers around the SQL ranking functions
  avatar.ts                   Deterministic generated SVG avatars
supabase/
  migrations/20260831000000_initial.sql   Schema + RLS + ranking functions
  migrations/20260902000000_click_cooldown_configurable.sql
                                        Configurable click cooldown
  seed.sql                    Demo data (dev only)
```

## Architecture rules (non-negotiable)

1. **All Supabase access goes through `lib/supabase.ts`** (service-role client,
   tagged `server-only`). Do NOT use the anon key in the browser, do NOT create
   other Supabase clients, do NOT move DB calls into client components. This is
   the security boundary: clients must never be able to write clicks or counts.
2. **RLS stays enabled.** `profiles` is publicly readable; `clicks` and
   `submission_events` have zero public policies; the ranking functions
   (`get_leaderboard`, `get_profile_stats`, `get_next_ranked`) are not
   executable by anon/authenticated roles. Don't "simplify" this.
3. **Anti-abuse is enforced by the database**, not app logic. The `clicks`
   table has an EXCLUDE constraint (`btree_gist` + `tstzrange`) that atomically
   enforces one valid click per (visitor, profile) per rolling cooldown window.
   The window length lives in the single-row `click_config` table and is read
   via `click_cooldown()` (default `interval '5 seconds'`). Tune it with
   `update public.click_config set cooldown = interval '…';` — never hardcode
   a duration in app code. Never replace this with SELECT → check → INSERT.
4. **Never store raw IPs.** Always `hashIp()` (HMAC with
   `CLICKRANK_IP_HASH_SECRET`) before persisting anything IP-derived.
5. **Redirect targets are always derived server-side** from the normalized
   username via `instagramProfileUrl()`. Never accept a client-supplied URL.
6. **Ranking is computed in Postgres functions**, not in the app. Leaderboard
   pages must never fetch raw click rows to compute counts.
7. Pages rendering live data must stay dynamic (`export const dynamic =
   "force-dynamic"`). `cacheComponents` is NOT enabled, so the classic
   route-segment configs still apply.

## Next.js 16 gotchas (already tripped over here)

- `params` is a **Promise** — `const { username } = await params`.
- Type route handlers with the global `RouteContext<"/go/[username]">` and
  pages with `PageProps<"/...">` / `LayoutProps<"/">` helpers (generated during
  build — they are global, don't import them).
- `middleware.ts` was **renamed to `proxy.ts`** (exported function `proxy`).
- Route handlers use the Web `Request`/`Response` APIs; use `NextResponse.redirect`.
- `next/image` on an SVG data-URI throws — the `Avatar` fallback deliberately
  uses a plain `<img>`.

## Working with the database

- Migrations live in `supabase/migrations/` (reproducible from a clean DB).
- Local dev: `supabase start` → `supabase db reset` (applies migrations +
  seed). Verify schema/RLS with `docker exec supabase_db_clickrank psql -U
  postgres -d postgres`.
- Production: `supabase link --project-ref <ref>` then `supabase db push`.
- Migrations that revoke privileges or create objects MUST explicitly GRANT
  what `service_role` needs (function EXECUTE, table privileges, sequence
  USAGE). Hosted Supabase does NOT default-grant to `service_role` the way
  the local CLI stack does — omitting grants works locally and then fails in
  prod with SQLSTATE 42501 ("permission denied"). See
  `20260902120000_grant_execute_service_role.sql` and
  `20260902130000_grant_table_access_service_role.sql`.
- The service-role Secret key authenticates as the `service_role` role.
- Env: copy `.env.example` → `.env.local`; values come from `supabase status`.
  `SUPABASE_SERVICE_ROLE_KEY` and `CLICKRANK_IP_HASH_SECRET` are server-only.

## Verification checklist

Before calling a change done:

- `npm run lint` clean, `npm run build` passes.
- If you touched the click flow: the EXCLUDE constraint still rejects duplicate
  clicks (including concurrent ones), redirect still 302s to Instagram, and a
  different profile/different visitor still counts.
- If you touched RLS/migrations: anon can only SELECT profiles; anon cannot
  INSERT/UPDATE/DELETE clicks or profiles; anon cannot EXECUTE the ranking
  functions.
- Confirm no service-role key / env reference appears in `.next/static/`
  client bundles.
