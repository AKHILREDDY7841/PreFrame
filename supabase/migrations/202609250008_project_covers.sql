-- Project covers are private media. Their paths are saved only through an
-- owner-only, compare-and-swap RPC, and are served with short-lived URLs.
alter table public.projects add column if not exists cover_path text;

create or replace function public.set_project_cover(
  p_project uuid,
  p_cover_path text,
  p_expected_revision integer
)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare result public.projects;
begin
  if auth.uid() is null or not public.is_owner(p_project) then
    raise exception 'not project owner';
  end if;
  if p_cover_path is null
     or p_cover_path !~ ('^' || p_project::text || '/covers/[0-9a-f-]+\\.jpg$') then
    raise exception 'invalid project cover path';
  end if;
  update public.projects
  set cover_path = p_cover_path, revision = revision + 1, updated_at = now()
  where id = p_project and revision = p_expected_revision and archived_at is null
  returning * into result;
  if not found then raise exception 'revision conflict' using errcode = '40001'; end if;
  return result;
end $$;
revoke all on function public.set_project_cover(uuid,text,integer) from public, anon;
grant execute on function public.set_project_cover(uuid,text,integer) to authenticated;

-- Cover replacement removes the previous object after the database update;
-- object deletion remains restricted to project owners.
drop policy if exists preframe_media_delete on storage.objects;
create policy preframe_media_delete on storage.objects for delete to authenticated
using (bucket_id = 'project-media' and public.is_owner((split_part(name, '/', 1))::uuid));
