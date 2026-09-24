-- PL/pgSQL may evaluate fields in a boolean expression before checking the
-- table-name guard. Branch first so each trigger reads only fields on its row.
create or replace function public.assert_same_project_references()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'screenplay_blocks' then
    if not exists (select 1 from public.screenplay_drafts where id = new.draft_id and project_id = new.project_id)
    then raise exception 'cross-project draft reference denied'; end if;
  elsif tg_table_name = 'scenes' then
    if new.draft_id is not null and not exists
      (select 1 from public.screenplay_drafts where id = new.draft_id and project_id = new.project_id)
    then raise exception 'cross-project draft reference denied'; end if;
  elsif tg_table_name = 'screenplay_comments' then
    if not exists (select 1 from public.screenplay_blocks where id = new.block_id and project_id = new.project_id)
    then raise exception 'cross-project block reference denied'; end if;
  elsif tg_table_name = 'shots' then
    if new.scene_id is not null and not exists
      (select 1 from public.scenes where id = new.scene_id and project_id = new.project_id)
    then raise exception 'cross-project scene reference denied'; end if;
  elsif tg_table_name = 'storyboard_frames' then
    if new.shot_id is not null and not exists
      (select 1 from public.shots where id = new.shot_id and project_id = new.project_id)
    then raise exception 'cross-project shot reference denied'; end if;
    if new.media_id is not null and not exists
      (select 1 from public.media where id = new.media_id and project_id = new.project_id)
    then raise exception 'cross-project media reference denied'; end if;
  elsif tg_table_name = 'schedule_entries' then
    if not exists (select 1 from public.shoot_days where id = new.shoot_day_id and project_id = new.project_id)
    then raise exception 'cross-project shoot day reference denied'; end if;
    if new.scene_id is not null and not exists
      (select 1 from public.scenes where id = new.scene_id and project_id = new.project_id)
    then raise exception 'cross-project scene reference denied'; end if;
  end if;
  return new;
end $$;
revoke all on function public.assert_same_project_references() from public, anon, authenticated;
