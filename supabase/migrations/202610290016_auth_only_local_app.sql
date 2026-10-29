-- Public login, device-only projects. Preserve Auth/configuration; no cloud app-data grants.
begin;
create or replace function public.create_profile_for_new_user() returns trigger
language plpgsql security definer set search_path='' as $$ begin return new; end $$;
revoke all on function public.create_profile_for_new_user() from public,anon,authenticated;
-- Old installed clients must not keep using the retired cloud application APIs.
do $$ declare r record; begin
 for r in select c.oid::regclass as relation from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m') loop
  execute format('revoke all on table %s from public,anon,authenticated',r.relation);
 end loop;
 for r in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef loop
  execute format('revoke all on function %s from public,anon,authenticated',r.signature);
 end loop;
end $$;
-- RLS remains enabled. Deny Storage API access to the retired project bucket.
drop policy if exists device_only_retired_media on storage.objects;
create policy device_only_retired_media on storage.objects as restrictive for all to anon,authenticated using(bucket_id <> 'project-media') with check(bucket_id <> 'project-media');
commit;
