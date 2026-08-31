-- ClickRank: initial schema
-- Social experiment: submit Instagram profiles, rank by valid clicks.
--
-- Security model
-- ---------------
-- RLS is enabled on every table. The public/anonymous role can only READ
-- profiles (needed to render the leaderboard). The `clicks` table has NO
-- policies at all, so anonymous/authenticated roles cannot read or write
-- click records directly — a malicious client can never fabricate a click.
--
-- All writes (profile submission, click recording) flow through server-side
-- code using the Supabase service-role client, which bypasses RLS. The
-- service-role key never leaves the server.
--
-- Anti-abuse
-- -----------
-- The `clicks` table carries an EXCLUDE constraint (btree_gist + tstzrange)
-- that enforces, atomically in the database:
--
--     one valid click per (visitor, profile) per rolling 24h window
--
-- This is race-condition safe: two concurrent INSERTs for the same visitor +
-- profile within 24h cannot both succeed. We never do SELECT -> check ->
-- INSERT in application code; we simply attempt the INSERT and let the
-- constraint reject the duplicate.
--
-- Timezone policy: all "today" boundaries are computed in UTC.

-- ============================================================================
-- Extensions
-- ============================================================================

create extension if not exists btree_gist;

-- ============================================================================
-- Profiles
-- ============================================================================

create table if not exists public.profiles (
  id                 uuid primary key default gen_random_uuid(),
  instagram_username text not null,
  display_name       text,
  avatar_url         text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

-- Instagram usernames are unique and case-insensitive (we store normalized
-- lowercase usernames; this index keeps lookups + duplicate checks fast).
create unique index if not exists profiles_instagram_username_key
  on public.profiles (lower(instagram_username));

-- ============================================================================
-- Clicks
-- ============================================================================

create table if not exists public.clicks (
  id           bigint generated always as identity primary key,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  visitor_id   uuid not null,  -- anonymous visitor cookie id
  visitor_hash text not null,  -- HMAC-SHA256(ip, server secret); NEVER a raw IP
  created_at   timestamptz not null default now(),
  -- Anti-abuse window. Click at T is valid until T + 24h. The EXCLUDE
  -- constraint below rejects any click whose [created_at, valid_until)
  -- range overlaps another click's range for the same (visitor, profile).
  valid_until  timestamptz not null default now() + interval '24 hours'
);

-- Atomic anti-abuse: at most one valid click per (visitor, profile) per
-- rolling 24h window. btree_gist lets us index uuid columns in a GiST index.
alter table public.clicks
  add constraint clicks_one_valid_per_visitor_profile_24h
  exclude using gist (
    profile_id with =,
    visitor_id with =,
    tstzrange(created_at, valid_until) with &&
  );

-- Leaderboard aggregation: count clicks per profile.
create index if not exists clicks_profile_id_idx on public.clicks (profile_id);

-- "Today" leaderboard: filter clicks by created_at >= start of UTC day.
create index if not exists clicks_created_at_idx on public.clicks (created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.clicks enable row level security;

-- Profiles: publicly readable so any client can render the leaderboard.
create policy "profiles_are_publicly_readable"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies on profiles:
-- submissions happen server-side through the service-role client.

-- Clicks: deliberately NO policies. anon/authenticated get nothing
-- (RLS denies when no policy grants access). All click writes go through
-- server-side service-role code. Even if a malicious client finds the anon
-- key and attempts an INSERT into clicks, RLS rejects it.

-- key and attempts an INSERT into clicks, RLS rejects it.

-- ============================================================================
-- Submission rate limiting
-- Submission rate limiting
-- ============================================================================
--
-- Lightweight server-side rate limit for profile submissions, keyed by
-- hashed IP (never raw IP). The API route checks the count for the last
-- hour and rejects with 429 when it exceeds the cap.

create table if not exists public.submission_events (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

create index if not exists submission_events_ip_hash_created_idx
  on public.submission_events (ip_hash, created_at);

alter table public.submission_events enable row level security;
-- No policies: only the server-side service-role client touches this table.

-- ============================================================================
-- Ranking / aggregation functions
-- ============================================================================
--
-- Rankings are computed in the database (not in the app) so the leaderboard
-- never streams click records to the frontend. These run with the privileges
-- of the caller (the service-role client), which bypasses RLS.

-- Leaderboard. `p_period` is 'today' or 'all'. Profiles with zero clicks are
-- still listed in 'all' mode (they appear on the board immediately after
-- submission) but excluded from the 'today' board.
create or replace function public.get_leaderboard(p_period text, p_limit int default 100)
returns table (
  id uuid,
  instagram_username text,
  display_name text,
  avatar_url text,
  clicks bigint,
  rank bigint
)
language sql
stable
as $$
  with ranked as (
    select
      p.id,
      p.instagram_username,
      p.display_name,
      p.avatar_url,
      case
        when p_period = 'today'
          then count(c.id) filter (
            where c.created_at >= timezone('utc', date_trunc('day', timezone('utc', now())))
          )
        else count(c.id)
      end as clicks,
      row_number() over (
        order by
          case
            when p_period = 'today'
              then count(c.id) filter (
                where c.created_at >= timezone('utc', date_trunc('day', timezone('utc', now())))
              )
            else count(c.id)
          end desc,
          p.created_at asc
      )::bigint as rank
    from public.profiles p
    left join public.clicks c on c.profile_id = p.id
    where p.is_active = true
    group by p.id
  )
  select r.id, r.instagram_username, r.display_name, r.avatar_url, r.clicks, r.rank
  from ranked r
  where p_period != 'today' or r.clicks > 0
  order by r.rank
  limit p_limit;
$$;

-- Stats for a single profile page: identity, click counts, and all-time rank.
create or replace function public.get_profile_stats(p_username text)
returns table (
  id uuid,
  instagram_username text,
  display_name text,
  avatar_url text,
  is_active boolean,
  created_at timestamptz,
  total_clicks bigint,
  today_clicks bigint,
  rank bigint
)
language sql
stable
as $$
  with me as (
    select p.*, count(c.id) as clicks
    from public.profiles p
    left join public.clicks c on c.profile_id = p.id
    where p.instagram_username = lower(p_username)
    group by p.id
  )
  select
    me.id,
    me.instagram_username,
    me.display_name,
    me.avatar_url,
    me.is_active,
    me.created_at,
    me.clicks as total_clicks,
    (
      select count(*)::bigint
      from public.clicks c
      where c.profile_id = me.id
        and c.created_at >= timezone('utc', date_trunc('day', timezone('utc', now())))
    ) as today_clicks,
    (
      select count(*)::bigint + 1
      from (
        select p2.id, count(c2.id) as clicks
        from public.profiles p2
        left join public.clicks c2 on c2.profile_id = p2.id
        where p2.is_active = true
        group by p2.id
        having count(c2.id) > me.clicks
           or (count(c2.id) = me.clicks and p2.created_at < me.created_at)
      ) above
    ) as rank
  from me;
$$;

-- The profile ranked immediately above the given one (all-time), so the page
-- can show "X clicks to overtake @user". Returns an empty set when there is
-- no profile above (already #1).
create or replace function public.get_next_ranked(p_username text)
returns table (instagram_username text, clicks bigint)
language sql
stable
as $$
  with me as (
    select p.id, p.instagram_username, p.created_at, count(c.id) as clicks
    from public.profiles p
    left join public.clicks c on c.profile_id = p.id
    where p.instagram_username = lower(p_username)
    group by p.id
  ),
  ranked as (
    select
      p.id,
      p.instagram_username,
      p.created_at,
      count(c.id) as clicks
    from public.profiles p
    left join public.clicks c on c.profile_id = p.id
    where p.is_active = true
    group by p.id
  )
  select r.instagram_username, r.clicks
  from ranked r
  cross join me
  where r.clicks > me.clicks
     or (r.clicks = me.clicks and r.created_at < me.created_at)
  order by r.clicks asc, r.created_at asc, r.instagram_username asc
  limit 1;
$$;

-- ============================================================================
-- Lock down function execution
-- ============================================================================
--
-- Ranking functions are called only by the server-side service-role client.
-- By default Postgres grants EXECUTE to PUBLIC on new functions, and
-- Supabase's default privileges also grant anon/authenticated. We revoke
-- all of those so click counts are never exposed through PostgREST. The
-- service-role client keeps its explicit EXECUTE grant.

revoke execute on function public.get_leaderboard(text, int) from public, anon, authenticated;
revoke execute on function public.get_profile_stats(text) from public, anon, authenticated;
revoke execute on function public.get_next_ranked(text) from public, anon, authenticated;
