-- ClickRank: grant table access to service_role
-- =============================================
-- Same root cause as the function grants: hosted Supabase does not carry the
-- default table/sequence privileges for `service_role` that local CLI stacks
-- grant. The server-side service-role client (Secret key) is the ONLY role
-- that touches these tables — it bypasses RLS but still needs explicit table
-- privileges, otherwise every call fails with SQLSTATE 42501 ("permission
-- denied for table ...").
--
-- RLS policies still gate `anon`/`authenticated` reads (profiles only); this
-- grant does not loosen that: anon/authenticated get nothing here and their
-- table access is unchanged.

grant all privileges on table
  public.profiles,
  public.clicks,
  public.submission_events,
  public.click_config
to service_role;

-- Identity columns back their defaults with sequences; INSERTs as
-- service_role need USAGE (and SELECT, for completeness) on them.
grant usage, select on sequence
  public.clicks_id_seq,
  public.submission_events_id_seq
to service_role;
