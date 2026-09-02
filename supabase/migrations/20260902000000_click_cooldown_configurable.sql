-- ClickRank: configurable click cooldown
-- ======================================
--
-- The click anti-abuse window was hardcoded to 24h in the initial migration:
-- every `clicks.valid_until` defaulted to `created_at + interval '24 hours'`,
-- and the EXCLUDE constraint rejected any (visitor, profile) pair whose
-- [created_at, valid_until) ranges overlapped.
--
-- This migration makes the window length runtime-configurable so it can be
-- tuned (up or down) with a single UPDATE — no app deploy or code change:
--
--     update public.click_config set cooldown = interval '1 hour';
--
-- The default is 5 seconds (low traffic phase). New clicks get their window
-- from `click_config.cooldown` via the `click_cooldown()` function.
--
-- When RAISING the cooldown the change applies to clicks recorded from that
-- moment on; no backfill is needed (old rows simply expire sooner). When
-- LOWERING it, existing rows should be reshaped to the new (shorter) window so
-- old rows stop blocking — shrinking a range can never overlap a sibling
-- range, so that UPDATE is always safe under the EXCLUDE constraint.

-- ============================================================================
-- Config table (single row)
-- ============================================================================

create table if not exists public.click_config (
  singleton boolean primary key default true check (singleton),
  cooldown  interval not null default interval '5 seconds'
);

insert into public.click_config (singleton, cooldown)
values (true, interval '5 seconds')
on conflict (singleton) do nothing;

alter table public.click_config enable row level security;
-- No policies: only the service-role client (which bypasses RLS) inserts rows
-- into `clicks` and thus reads this table through the default expression. An
-- operator changes the cooldown directly as the table owner (Supabase SQL
-- editor / migration), not through PostgREST.

-- ============================================================================
-- Cooldown lookup function
-- ============================================================================

create or replace function public.click_cooldown()
returns interval
language sql
stable
as $$
  select coalesce(
    (select cooldown from public.click_config where singleton),
    interval '5 seconds'
  );
$$;

-- The function exists only to evaluate the `clicks.valid_until` default during
-- a service-role INSERT; anon/authenticated never need to call it.
revoke execute on function public.click_cooldown() from public, anon, authenticated;

-- ============================================================================
-- Retarget the clicks table
-- ============================================================================

-- New clicks: window comes from the config table instead of a hardcoded 24h.
alter table public.clicks
  alter column valid_until set default (now() + public.click_cooldown());

-- Existing rows were minted with 24h windows; expire them after the new
-- (5 second) cooldown so the change applies immediately. Safe: each new range
-- is a strict subset of the old one, and the old ranges never overlapped for
-- the same (visitor, profile).
update public.clicks
  set valid_until = created_at + public.click_cooldown();

-- The constraint name hardcoded the old policy; rename to match the new
-- configurable window.
alter table public.clicks
  rename constraint clicks_one_valid_per_visitor_profile_24h
  to clicks_one_valid_per_visitor_profile_window;
