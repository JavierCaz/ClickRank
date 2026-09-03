-- ClickRank seed data (dev only).
--
-- Runs automatically on `supabase db reset`. Inserts a few demo profiles and
-- synthetic clicks so the leaderboard isn't empty in local development.
-- Production databases should not run this (only `supabase db reset` applies
-- seed.sql, which is a local-development command).

insert into public.profiles (instagram_username, display_name, avatar_emoji)
values
  ('maria', 'Maria', '🦄'),
  ('juan', null, null),
  ('pedro', 'Pedro', '🚀'),
  ('ana', 'Ana', '🌸'),
  ('carlos', 'Carlos', '🐼');

-- Synthetic clicks from "different" anonymous visitors so ranks populate.
-- visitor_id values are fixed UUIDs (dev-only, no real PII).
insert into public.clicks (profile_id, visitor_id, visitor_hash)
select p.id, v.visitor_id, 'dev-seed-hash'
from public.profiles p
cross join (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid),
    ('22222222-2222-2222-2222-222222222222'::uuid),
    ('33333333-3333-3333-3333-333333333333'::uuid)
) as v(visitor_id)
where p.instagram_username = 'maria'
   or p.instagram_username = 'juan';
