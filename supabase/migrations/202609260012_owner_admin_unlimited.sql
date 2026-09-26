begin;

-- The administrator is anchored to the verified Supabase Auth identity for
-- this Google account, never to a client-side email check.
do $$
declare target uuid;
begin
  select id into target from auth.users where lower(email) = 'akhilreddy7841@gmail.com' limit 1;
  if target is null then
    raise exception 'The configured administrator has not signed in yet.';
  end if;
  insert into public.owner_identity(singleton, user_id) values(true, target)
    on conflict (singleton) do update set user_id = excluded.user_id;
  update public.profiles set tier = 'premium' where id = target;
end $$;

create or replace function public.invite_editor(p_project uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_owner(p_project) then raise exception 'Only the project owner can invite editors'; end if;
  if p_email is null or length(trim(p_email)) > 320 or position('@' in p_email) < 2 then raise exception 'invalid email'; end if;
  perform 1 from public.projects where id=p_project and archived_at is null for update; if not found then raise exception 'project unavailable'; end if;
  if not public.is_admin() and (select count(*) from public.project_members where project_id=p_project)>=3 then raise exception 'editor seat limit reached'; end if;
  insert into public.project_invitations(project_id,invitee_email,role,invited_by,accepted_at,revoked_at)
    values(p_project,lower(trim(p_email)),'editor',auth.uid(),null,null)
    on conflict(project_id,invitee_email) do update set invited_by=excluded.invited_by,accepted_at=null,revoked_at=null;
end $$;

create or replace function public.accept_invitation(p_invite uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.project_invitations%rowtype; account_email text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select email into account_email from auth.users where id=auth.uid();
  select * into inv from public.project_invitations where id=p_invite for update;
  if not found or inv.accepted_at is not null or inv.revoked_at is not null or lower(inv.invitee_email)<>lower(account_email) then raise exception 'invitation unavailable'; end if;
  perform 1 from public.projects where id=inv.project_id and archived_at is null for update; if not found then raise exception 'project unavailable'; end if;
  if not exists(select 1 from public.projects p join public.owner_identity oi on oi.user_id=p.owner_id where p.id=inv.project_id)
     and (select count(*) from public.project_members where project_id=inv.project_id)>=3 then raise exception 'editor seat limit reached'; end if;
  insert into public.project_members(project_id,user_id,role) values(inv.project_id,auth.uid(),'editor') on conflict do nothing;
  update public.project_invitations set accepted_at=now() where id=inv.id;
  return inv.project_id;
end $$;

create or replace function public.generate_project_code(p_project uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare code text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; bytes bytea; i integer; expiry timestamptz;
begin
  if auth.uid() is null or not public.is_owner(p_project) then raise exception 'Only the project owner can create an invite code.'; end if;
  if (select tier from public.profiles where id=auth.uid()) <> 'premium' then raise exception 'Collaboration is available on Premium.'; end if;
  perform 1 from public.projects where id=p_project and archived_at is null for update; if not found then raise exception 'Project unavailable.'; end if;
  if not public.is_admin() and (select count(*) from public.project_members where project_id=p_project)>=3 then raise exception 'This project has reached its member limit.'; end if;
  update public.project_join_codes set expires_at=now() where project_id=p_project and used_at is null;
  expiry:=now()+interval '60 seconds';
  loop
    bytes:=decode(replace(gen_random_uuid()::text,'-',''),'hex'); code:='';
    for i in 0..5 loop code:=code||substr(alphabet,(get_byte(bytes,i)%32)+1,1); end loop;
    exit when code ~ '[A-Z]' and code ~ '[0-9]' and not exists(select 1 from public.project_join_codes where code_hash=sha256(convert_to(code,'UTF8')));
  end loop;
  insert into public.project_join_codes(code_hash,project_id,created_by,expires_at) values(sha256(convert_to(code,'UTF8')),p_project,auth.uid(),expiry);
  return jsonb_build_object('code',code,'expiresAt',expiry);
end $$;

create or replace function public.join_project_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare invite public.project_join_codes%rowtype; tries integer; code text:=upper(trim(p_code)); is_admin_project boolean;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if (select tier from public.profiles where id=auth.uid()) <> 'premium' then return jsonb_build_object('error','Collaboration is available on Premium.'); end if;
  insert into public.project_join_attempts(user_id,window_start,attempts) values(auth.uid(),now(),1) on conflict(user_id) do update set attempts=case when public.project_join_attempts.window_start<now()-interval '10 minutes' then 1 else public.project_join_attempts.attempts+1 end,window_start=case when public.project_join_attempts.window_start<now()-interval '10 minutes' then now() else public.project_join_attempts.window_start end returning attempts into tries;
  if tries>10 then return jsonb_build_object('error','Too many attempts. Try again in 10 minutes.'); end if;
  if code !~ '^[A-Z0-9]{6}$' then return jsonb_build_object('error','Enter a six-character invite code.'); end if;
  select * into invite from public.project_join_codes where code_hash=sha256(convert_to(code,'UTF8')); if not found then return jsonb_build_object('error','This code is invalid or has expired.'); end if;
  perform 1 from public.projects where id=invite.project_id and archived_at is null for update; if not found then return jsonb_build_object('error','Project unavailable.'); end if;
  select * into invite from public.project_join_codes where code_hash=sha256(convert_to(code,'UTF8')) for update;
  if invite.expires_at<=now() or invite.used_at is not null then return jsonb_build_object('error','This code is invalid or has expired.'); end if;
  if exists(select 1 from public.project_members where project_id=invite.project_id and user_id=auth.uid()) then return jsonb_build_object('error','You already belong to this project.'); end if;
  select exists(select 1 from public.projects p join public.owner_identity oi on oi.user_id=p.owner_id where p.id=invite.project_id) into is_admin_project;
  if not is_admin_project and (select count(*) from public.project_members where project_id=invite.project_id)>=3 then return jsonb_build_object('error','This project has reached its member limit.'); end if;
  insert into public.project_members(project_id,user_id,role) values(invite.project_id,auth.uid(),'editor'); update public.project_join_codes set used_at=now(),used_by=auth.uid() where code_hash=invite.code_hash;
  return jsonb_build_object('projectId',invite.project_id);
end $$;

notify pgrst,'reload schema';
commit;
