-- Admin bypass applies only to application quotas on projects the designated
-- owner owns. It never grants membership or visibility in another project.
create or replace function public.is_admin_project(p_project uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    join public.owner_identity o on o.user_id = p.owner_id
    where p.id = p_project
  );
$$;
revoke all on function public.is_admin_project(uuid) from public, anon, authenticated;

create or replace function public.create_project_limited(p_title text, p_timezone text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if not public.is_admin()
     and (select tier from public.profiles where id = auth.uid()) = 'free'
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
  if not public.is_admin_project(p_project)
     and (select count(*) from public.project_members where project_id = p_project) >= 3
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
  if not public.is_admin_project(inv.project_id)
     and (select count(*) from public.project_members where project_id = inv.project_id) >= 3
  then raise exception 'editor seat limit reached'; end if;
  insert into public.project_members(project_id, user_id, role)
  values(inv.project_id, auth.uid(), 'editor') on conflict do nothing;
  update public.project_invitations set accepted_at = now() where id = p_invitation;
  return inv.project_id;
end $$;
revoke all on function public.accept_project_invitation(uuid) from public, anon;
grant execute on function public.accept_project_invitation(uuid) to authenticated;

create or replace function public.enforce_project_item_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cap integer; active_count integer;
begin
  perform 1 from public.projects where id = new.project_id for update;
  if not found then raise exception 'project unavailable'; end if;
  if public.is_admin_project(new.project_id)
     or exists(select 1 from public.projects p join public.profiles owner on owner.id = p.owner_id
               where p.id = new.project_id and owner.tier = 'premium')
  then return new; end if;
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
revoke all on function public.enforce_project_item_quota() from public, anon, authenticated;
