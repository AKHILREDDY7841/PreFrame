begin;

alter table public.projects add column if not exists purge_after timestamptz;
create index if not exists projects_recycle_bin on public.projects(owner_id, purge_after) where archived_at is not null;

create or replace function public.purge_expired_projects()
returns integer language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  delete from public.projects where archived_at is not null and purge_after <= now();
  get diagnostics removed = row_count;
  return removed;
end $$;
revoke all on function public.purge_expired_projects() from public, anon;
grant execute on function public.purge_expired_projects() to authenticated;

-- Supabase projects normally include pg_cron. When available, this makes the
-- 15-day retention deadline independent of a future page visit.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''preframe-purge-recycle-bin''';
    execute $cron$select cron.schedule('preframe-purge-recycle-bin', '15 3 * * *', 'select public.purge_expired_projects()')$cron$;
  end if;
exception when undefined_table or undefined_function then
  null;
end $$;

create or replace function public.create_project_limited(p_title text, p_timezone text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform public.purge_expired_projects();
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if (select tier from public.profiles where id=auth.uid())='free'
     and exists(select 1 from public.projects where owner_id=auth.uid() and (archived_at is null or purge_after > now()))
  then raise exception 'Your Free plan allows one project. Permanently delete the project in Recycle bin, or upgrade to Premium.'; end if;
  insert into public.projects(owner_id,title,timezone) values(auth.uid(),p_title,p_timezone) returning id into pid;
  insert into public.project_members(project_id,user_id,role) values(pid,auth.uid(),'owner');
  return pid;
end $$;

create or replace function public.move_project_to_recycle_bin(p_project uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_owner(p_project) then raise exception 'Only the project owner can move it to Recycle bin'; end if;
  update public.projects set archived_at=now(), purge_after=now()+interval '15 days', updated_at=now()
    where id=p_project and archived_at is null;
  if not found then raise exception 'Project is already in Recycle bin or unavailable'; end if;
end $$;
revoke all on function public.move_project_to_recycle_bin(uuid) from public, anon;
grant execute on function public.move_project_to_recycle_bin(uuid) to authenticated;

create or replace function public.restore_project_from_recycle_bin(p_project uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_owner(p_project) then raise exception 'Only the project owner can restore it'; end if;
  update public.projects set archived_at=null,purge_after=null,updated_at=now() where id=p_project and archived_at is not null and purge_after>now();
  if not found then raise exception 'Project cannot be restored'; end if;
end $$;
revoke all on function public.restore_project_from_recycle_bin(uuid) from public, anon;
grant execute on function public.restore_project_from_recycle_bin(uuid) to authenticated;

create or replace function public.permanently_delete_recycled_project(p_project uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_owner(p_project) then raise exception 'Only the project owner can delete it'; end if;
  delete from public.projects where id=p_project and archived_at is not null;
  if not found then raise exception 'Move the project to Recycle bin first'; end if;
end $$;
revoke all on function public.permanently_delete_recycled_project(uuid) from public, anon;
grant execute on function public.permanently_delete_recycled_project(uuid) to authenticated;

create or replace function public.generate_project_code(p_project uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare code text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; bytes bytea; i integer; expiry timestamptz;
begin
  if auth.uid() is null or not public.is_owner(p_project) then raise exception 'Only the project owner can create an invite code.'; end if;
  if (select tier from public.profiles where id=auth.uid()) <> 'premium' then raise exception 'Collaboration is available on Premium.'; end if;
  perform 1 from public.projects where id=p_project and archived_at is null for update; if not found then raise exception 'Project unavailable.'; end if;
  if (select count(*) from public.project_members where project_id=p_project)>=3 then raise exception 'This project has reached its member limit.'; end if;
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
declare invite public.project_join_codes%rowtype; tries integer; code text:=upper(trim(p_code));
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
  if (select count(*) from public.project_members where project_id=invite.project_id)>=3 then return jsonb_build_object('error','This project has reached its member limit.'); end if;
  insert into public.project_members(project_id,user_id,role) values(invite.project_id,auth.uid(),'editor'); update public.project_join_codes set used_at=now(),used_by=auth.uid() where code_hash=invite.code_hash;
  return jsonb_build_object('projectId',invite.project_id);
end $$;
notify pgrst,'reload schema';
commit;
