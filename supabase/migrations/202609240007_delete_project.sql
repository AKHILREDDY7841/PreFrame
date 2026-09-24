-- The project owner may permanently delete a project only when it has no
-- uploaded media. Storage objects require a separate, authenticated removal
-- workflow and must never be silently orphaned.
create or replace function public.delete_project(p_project uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.projects
    where id = p_project and owner_id = auth.uid()
  ) then
    raise exception 'Only the project owner can delete this project';
  end if;
  if exists (select 1 from public.media where project_id = p_project) then
    raise exception 'Export and remove uploaded media before deleting this project';
  end if;
  delete from public.projects where id = p_project and owner_id = auth.uid();
end;
$$;
revoke all on function public.delete_project(uuid) from public, anon;
grant execute on function public.delete_project(uuid) to authenticated;
