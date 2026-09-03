-- ClickRank: emoji avatars
-- =========================
-- Profiles get a user-picked avatar emoji shown in the leaderboard circle
-- (replacing the generated two-letter initials). NULL means "no pick": the app
-- derives a stable default from the username, so no backfill is needed here.
--
-- `get_leaderboard` must now also return `avatar_emoji`. Its return type
-- changes, so the function is dropped and recreated. Recreating a function
-- re-grants EXECUTE to PUBLIC by default, so we re-assert the lockdown:
-- revoke from public/anon/authenticated, grant to service_role (the only
-- caller, via the server-side client). service_role keeps its table-level
-- "all privileges" on profiles from the earlier grant migration, which covers
-- the new column.

alter table public.profiles add column avatar_emoji text;

drop function if exists public.get_leaderboard(text, int);

create or replace function public.get_leaderboard(p_period text, p_limit int default 100)
returns table (
  id uuid,
  instagram_username text,
  display_name text,
  avatar_url text,
  avatar_emoji text,
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
      p.avatar_emoji,
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
  select r.id, r.instagram_username, r.display_name, r.avatar_url, r.avatar_emoji, r.clicks, r.rank
  from ranked r
  where p_period != 'today' or r.clicks > 0
  order by r.rank
  limit p_limit;
$$;

revoke execute on function public.get_leaderboard(text, int) from public, anon, authenticated;
grant execute on function public.get_leaderboard(text, int) to service_role;
