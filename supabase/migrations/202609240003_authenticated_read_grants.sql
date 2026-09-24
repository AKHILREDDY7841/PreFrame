-- Prompt 02 follow-up: RLS policies limit rows but do not grant table access.
-- The authenticated role needs these narrow read grants for the client queries
-- below; the existing RLS policies remain the effective authorization boundary.
grant usage on schema public to authenticated;
grant select on public.profiles, public.projects, public.project_members, public.project_invitations to authenticated;
