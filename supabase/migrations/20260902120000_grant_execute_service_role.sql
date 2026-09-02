-- ClickRank: grant function execution to service_role
-- ====================================================
-- The ranking/config functions are revoked from public/anon/authenticated so
-- PostgREST never exposes click counts. The server-side service-role client
-- (the Secret key) is the ONLY caller of these functions (lib/leaderboard.ts),
-- plus `click_cooldown()` is evaluated in the `clicks.valid_until` default
-- expression during a service-role INSERT.
--
-- Hosted Supabase does not carry the counterpart default grant to
-- `service_role`, so those calls failed in production with SQLSTATE 42501
-- ("permission denied for function get_leaderboard"). Local CLI stacks happen
-- to grant EXECUTE to service_role by default; hosted does not. This migration
-- makes the intended grant explicit and idempotent on both.

grant execute on function public.get_leaderboard(text, int) to service_role;
grant execute on function public.get_profile_stats(text) to service_role;
grant execute on function public.get_next_ranked(text) to service_role;
grant execute on function public.click_cooldown() to service_role;
