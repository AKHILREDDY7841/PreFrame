-- Owner-approved revision: Free projects allow 50 active shots and 50 active
-- storyboard frames. Existing records are retained; only new active writes
-- above the cap are denied. Admin-owned and Premium-owned projects bypass it.
create or replace function public.enforce_project_item_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare active_count integer;
begin
  perform 1 from public.projects where id = new.project_id for update;
  if not found then raise exception 'project unavailable'; end if;
  if public.is_admin_project(new.project_id)
     or exists(select 1 from public.projects p join public.profiles owner on owner.id = p.owner_id
               where p.id = new.project_id and owner.tier = 'premium')
  then return new; end if;
  if tg_table_name = 'shots' then
    select count(*) into active_count from public.shots
    where project_id = new.project_id and archived_at is null and id <> new.id;
  else
    select count(*) into active_count from public.storyboard_frames
    where project_id = new.project_id and archived_at is null and id <> new.id;
  end if;
  if active_count >= 50 then raise exception 'free item limit reached'; end if;
  return new;
end $$;
revoke all on function public.enforce_project_item_quota() from public, anon, authenticated;
