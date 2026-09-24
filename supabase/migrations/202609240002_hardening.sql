-- Prompt 02 follow-up. Apply after 202609240001_core.sql.
-- The schema is private by default; only the narrow RPCs below may mutate
-- membership and project ownership. Functions use a fixed search path.
create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Member'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_preframe on auth.users;
create trigger on_auth_user_created_preframe after insert on auth.users
for each row execute function public.create_profile_for_new_user();
insert into public.profiles(id, display_name)
select id, coalesce(raw_user_meta_data->>'full_name', email, 'Member') from auth.users
on conflict (id) do nothing;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.owner_identity where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "owners manage members" on public.project_members;
drop policy if exists "owners manage invitations" on public.project_invitations;
drop policy if exists editor_write_audit_log on public.audit_log;
drop policy if exists editor_update_audit_log on public.audit_log;
create policy owner_reads_invitations on public.project_invitations for select
using (public.is_owner(project_id));
create policy invitee_reads_invitations on public.project_invitations for select
using (lower(invitee_email) = lower((auth.jwt()->>'email')::text) and revoked_at is null);

create or replace function public.create_project_limited(p_title text, p_timezone text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if (select tier from public.profiles where id = auth.uid()) = 'free'
     and exists(select 1 from public.projects where owner_id = auth.uid() and archived_at is null)
  then raise exception 'free owned project limit reached'; end if;
  insert into public.projects(owner_id, title, timezone)
  values (auth.uid(), p_title, p_timezone) returning id into pid;
  insert into public.project_members(project_id, user_id, role)
  values (pid, auth.uid(), 'owner');
  return pid;
end $$;
revoke all on function public.create_project_limited(text,text) from public, anon;
grant execute on function public.create_project_limited(text,text) to authenticated;

create or replace function public.invite_editor(p_project uuid, p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation_id uuid;
begin
  if auth.uid() is null or not public.is_owner(p_project) then raise exception 'not project owner'; end if;
  if p_email is null or length(trim(p_email)) > 320 or position('@' in p_email) < 2
  then raise exception 'invalid email'; end if;
  perform 1 from public.projects where id = p_project and archived_at is null for update;
  if not found then raise exception 'project unavailable'; end if;
  if (select count(*) from public.project_members where project_id = p_project) >= 3
  then raise exception 'editor seat limit reached'; end if;
  insert into public.project_invitations(project_id, invitee_email, role, invited_by, accepted_at, revoked_at)
  values (p_project, lower(trim(p_email)), 'editor', auth.uid(), null, null)
  on conflict (project_id, invitee_email) do update
  set revoked_at = null, accepted_at = null, invited_by = auth.uid(), created_at = now()
  returning id into invitation_id;
  return invitation_id;
end $$;
revoke all on function public.invite_editor(uuid,text) from public, anon;
grant execute on function public.invite_editor(uuid,text) to authenticated;

create or replace function public.accept_project_invitation(p_invitation uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.project_invitations%rowtype; account_email text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select email into account_email from auth.users where id = auth.uid();
  select * into inv from public.project_invitations where id = p_invitation;
  if not found or inv.revoked_at is not null or inv.accepted_at is not null
     or lower(inv.invitee_email) <> lower(account_email)
  then raise exception 'invitation unavailable'; end if;
  perform 1 from public.projects where id = inv.project_id and archived_at is null for update;
  if not found then raise exception 'project unavailable'; end if;
  if (select count(*) from public.project_members where project_id = inv.project_id) >= 3
  then raise exception 'editor seat limit reached'; end if;
  insert into public.project_members(project_id, user_id, role)
  values(inv.project_id, auth.uid(), 'editor') on conflict do nothing;
  update public.project_invitations set accepted_at = now() where id = p_invitation;
  return inv.project_id;
end $$;
revoke all on function public.accept_project_invitation(uuid) from public, anon;
grant execute on function public.accept_project_invitation(uuid) to authenticated;

create or replace function public.remove_editor(p_project uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_owner(p_project) then raise exception 'not project owner'; end if;
  perform 1 from public.projects where id = p_project for update;
  delete from public.project_members
  where project_id = p_project and user_id = p_user and role = 'editor';
end $$;
revoke all on function public.remove_editor(uuid,uuid) from public, anon;
grant execute on function public.remove_editor(uuid,uuid) to authenticated;

-- Remove the earlier unused editor RPC; only invite acceptance can add members.
revoke all on function public.add_editor_limited(uuid,uuid) from public, anon, authenticated;

-- The project title update is compare-and-swap. Direct updates are disallowed.
drop policy if exists "owners update" on public.projects;
create or replace function public.rename_project(p_project uuid, p_title text, p_expected_revision integer)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare result public.projects;
begin
  if auth.uid() is null or not public.is_member(p_project) then raise exception 'not a project member'; end if;
  update public.projects set title = p_title, revision = revision + 1, updated_at = now()
  where id = p_project and revision = p_expected_revision and archived_at is null
  returning * into result;
  if not found then raise exception 'revision conflict' using errcode = '40001'; end if;
  return result;
end $$;
revoke all on function public.rename_project(uuid,text,integer) from public, anon;
grant execute on function public.rename_project(uuid,text,integer) to authenticated;

-- Row locking serializes quota checks even when inserts arrive concurrently.
create or replace function public.enforce_project_item_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cap integer; active_count integer;
begin
  perform 1 from public.projects where id = new.project_id for update;
  if not found then raise exception 'project unavailable'; end if;
  if exists(select 1 from public.projects p join public.profiles owner on owner.id = p.owner_id
            where p.id = new.project_id and owner.tier = 'premium') then return new; end if;
  if tg_table_name = 'shots' then
    select count(*) into active_count from public.shots where project_id = new.project_id and archived_at is null and id <> new.id;
    cap := 100;
  else
    select count(*) into active_count from public.storyboard_frames where project_id = new.project_id and archived_at is null and id <> new.id;
    cap := 100;
  end if;
  if active_count >= cap then raise exception 'free item limit reached'; end if;
  return new;
end $$;
drop trigger if exists preframe_shot_quota on public.shots;
create trigger preframe_shot_quota before insert or update of archived_at, project_id on public.shots
for each row when (new.archived_at is null) execute function public.enforce_project_item_quota();
drop trigger if exists preframe_frame_quota on public.storyboard_frames;
create trigger preframe_frame_quota before insert or update of archived_at, project_id on public.storyboard_frames
for each row when (new.archived_at is null) execute function public.enforce_project_item_quota();
revoke all on function public.enforce_project_item_quota() from public, anon, authenticated;

-- A composite reference may never point into another project.
create or replace function public.assert_same_project_references()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'screenplay_blocks' and not exists
    (select 1 from public.screenplay_drafts where id = new.draft_id and project_id = new.project_id)
  then raise exception 'cross-project draft reference denied'; end if;
  if tg_table_name = 'scenes' and new.draft_id is not null and not exists
    (select 1 from public.screenplay_drafts where id = new.draft_id and project_id = new.project_id)
  then raise exception 'cross-project draft reference denied'; end if;
  if tg_table_name = 'screenplay_comments' and not exists
    (select 1 from public.screenplay_blocks where id = new.block_id and project_id = new.project_id)
  then raise exception 'cross-project block reference denied'; end if;
  if tg_table_name = 'shots' and new.scene_id is not null and not exists
    (select 1 from public.scenes where id = new.scene_id and project_id = new.project_id)
  then raise exception 'cross-project scene reference denied'; end if;
  if tg_table_name = 'storyboard_frames' then
    if new.shot_id is not null and not exists
      (select 1 from public.shots where id = new.shot_id and project_id = new.project_id)
    then raise exception 'cross-project shot reference denied'; end if;
    if new.media_id is not null and not exists
      (select 1 from public.media where id = new.media_id and project_id = new.project_id)
    then raise exception 'cross-project media reference denied'; end if;
  end if;
  if tg_table_name = 'schedule_entries' then
    if not exists(select 1 from public.shoot_days where id = new.shoot_day_id and project_id = new.project_id)
    then raise exception 'cross-project shoot day reference denied'; end if;
    if new.scene_id is not null and not exists
      (select 1 from public.scenes where id = new.scene_id and project_id = new.project_id)
    then raise exception 'cross-project scene reference denied'; end if;
  end if;
  return new;
end $$;
do $$ declare table_name text; begin
  foreach table_name in array array['screenplay_blocks','scenes','screenplay_comments','shots','storyboard_frames','schedule_entries'] loop
    execute format('drop trigger if exists preframe_project_ref on public.%I', table_name);
    execute format('create trigger preframe_project_ref before insert or update on public.%I for each row execute function public.assert_same_project_references()', table_name);
  end loop;
end $$;
revoke all on function public.assert_same_project_references() from public, anon, authenticated;

insert into storage.buckets(id, name, public)
values ('project-media', 'project-media', false)
on conflict (id) do update set public = false;
drop policy if exists preframe_media_read on storage.objects;
drop policy if exists preframe_media_write on storage.objects;
create policy preframe_media_read on storage.objects for select to authenticated
using (bucket_id = 'project-media' and public.is_member((split_part(name, '/', 1))::uuid));
create policy preframe_media_write on storage.objects for insert to authenticated
with check (bucket_id = 'project-media' and public.is_member((split_part(name, '/', 1))::uuid));
