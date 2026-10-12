-- Owner-only mode. ADDITIVE CONFIGURATION; this migration does not erase projects/media/accounts.
-- Requires a current verified backup and the existing owner_identity anchor.
begin;
do $$ begin
 if (select count(*) from public.owner_identity)<>1 or not exists(select 1 from public.owner_identity where user_id='ecd354a0-e442-44d1-8b45-0562cd7eb3f8'::uuid) then raise exception 'Verified owner identity does not match; stop migration';end if;
end $$;
create table if not exists public.private_workspace_settings(singleton boolean primary key default true check(singleton),reset_epoch bigint not null default 0 check(reset_epoch>=0),created_at timestamptz not null default now());
insert into public.private_workspace_settings(singleton)values(true)on conflict do nothing;
alter table public.private_workspace_settings enable row level security;
revoke all on public.private_workspace_settings from public,anon,authenticated;
create table if not exists public.private_workspace_events(id bigint generated always as identity primary key,owner_id uuid not null references public.profiles(id),actor_id uuid references public.profiles(id) on delete set null,project_id uuid,kind text not null check(char_length(kind)between 1 and 40),message text not null check(char_length(message)<=240),created_at timestamptz not null default now());
create index if not exists private_workspace_events_created on public.private_workspace_events(created_at desc);
alter table public.private_workspace_events enable row level security;
revoke all on public.private_workspace_events from public,anon,authenticated;
grant select on public.private_workspace_events to authenticated;
drop policy if exists owner_reads_private_events on public.private_workspace_events;
create policy owner_reads_private_events on public.private_workspace_events for select to authenticated using(public.is_admin() and owner_id=auth.uid());
create or replace function public.is_owner(p uuid)returns boolean language sql stable security definer set search_path='' as $$ select public.is_admin() and exists(select 1 from public.projects where id=p and owner_id=auth.uid()) $$;
create or replace function public.is_member(p uuid)returns boolean language sql stable security definer set search_path='' as $$ select public.is_owner(p) $$;
revoke all on function public.is_owner(uuid),public.is_member(uuid) from public,anon;
grant execute on function public.is_owner(uuid),public.is_member(uuid) to authenticated;
-- AND with existing permissive policies: unrelated authenticated accounts cannot use direct REST access.
do $$ declare name text;begin
 foreach name in array array['profiles','projects','project_members','project_invitations','screenplay_drafts','screenplay_blocks','scenes','screenplay_comments','notes','characters','actors','character_actors','locations','media','shots','storyboard_frames','shoot_days','schedule_entries','call_sheet_versions','audit_log','project_tool_records','project_join_codes','project_join_attempts','workspace_presence'] loop
 if to_regclass('public.'||name)is not null then
  execute format('alter table public.%I enable row level security',name);
  execute format('drop policy if exists private_owner_only on public.%I',name);
  execute format('create policy private_owner_only on public.%I as restrictive for all to authenticated using(public.is_admin()) with check(public.is_admin())',name);
 end if;end loop;
end $$;
-- Disable sharing RPCs, including legacy aliases, without removing migration history.
do $$ declare routine_entry record;begin
 for routine_entry in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname in('invite_editor','accept_invitation','accept_project_invitation','generate_project_code','join_project_code','join_project_with_code','remove_editor','record_project_join_attempt','add_editor_limited')loop
 execute format('revoke execute on function %s from public,anon,authenticated',routine_entry.signature);
 end loop;
end $$;
-- New registrations are deliberately rejected; existing verified owner OAuth sign-in is preserved.
create or replace function public.create_profile_for_new_user()returns trigger language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.owner_identity where user_id=new.id)then raise exception 'PREFRAME is a private owner-only workspace';end if;
 insert into public.profiles(id,display_name)values(new.id,coalesce(new.raw_user_meta_data->>'full_name','Akhil'))on conflict(id)do nothing;return new;
end $$;
revoke all on function public.create_profile_for_new_user()from public,anon,authenticated;
create or replace function public.create_project_limited(p_title text,p_timezone text)returns uuid language plpgsql security definer set search_path='' as $$ declare pid uuid;begin
 if not public.is_admin()then raise exception 'Private workspace owner required';end if;
 if p_title is null or char_length(trim(p_title))not between 1 and 160 then raise exception 'Project title must be 1–160 characters';end if;
 if not exists(select 1 from pg_timezone_names where name=p_timezone)then raise exception 'Invalid timezone';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 insert into public.projects(owner_id,title,timezone)values(auth.uid(),trim(p_title),p_timezone)returning id into pid;
 insert into public.project_members(project_id,user_id,role)values(pid,auth.uid(),'owner');return pid;
end $$;
revoke all on function public.create_project_limited(text,text)from public,anon;
grant execute on function public.create_project_limited(text,text)to authenticated;
-- Recovery remains available until explicit deletion; no automatic permanent purge on page loads or cron.
create or replace function public.purge_expired_projects()returns integer language plpgsql security definer set search_path='' as $$ begin return 0;end $$;
revoke all on function public.purge_expired_projects()from public,anon,authenticated;
create or replace function public.move_project_to_recycle_bin(p_project uuid)returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_owner(p_project)then raise exception 'Private workspace owner required';end if;
 update public.projects set archived_at=now(),purge_after=null,updated_at=now()where id=p_project and archived_at is null;
 if not found then raise exception 'Project unavailable';end if;
end $$;
create or replace function public.restore_project_from_recycle_bin(p_project uuid)returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_owner(p_project)then raise exception 'Private workspace owner required';end if;
 update public.projects set archived_at=null,purge_after=null,updated_at=now()where id=p_project and archived_at is not null;
 if not found then raise exception 'Project unavailable';end if;
end $$;
create or replace function public.private_workspace_bootstrap()returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin()then raise exception 'Private workspace owner required';end if;
 return jsonb_build_object('owner_id',auth.uid(),'reset_epoch',(select reset_epoch from public.private_workspace_settings where singleton));end $$;
revoke all on function public.private_workspace_bootstrap()from public,anon;
grant execute on function public.private_workspace_bootstrap()to authenticated;
create or replace function public.record_private_event(p_kind text,p_message text,p_path text default '')returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin()then raise exception 'Private workspace owner required';end if;
 if p_kind not in('page_open','client_error','sync_error','sync_restored')then raise exception 'Unsupported event';end if;
 if char_length(coalesce(p_message,''))>240 or char_length(coalesce(p_path,''))>200 then raise exception 'Event metadata too long';end if;
 insert into public.private_workspace_events(owner_id,actor_id,kind,message)values(auth.uid(),auth.uid(),p_kind,left(coalesce(p_message,'')||case when p_path<>''then ' · '||p_path else ''end,240));end $$;
revoke all on function public.record_private_event(text,text,text)from public,anon;
grant execute on function public.record_private_event(text,text,text)to authenticated;
create or replace function public.private_workspace_state()returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin()then raise exception 'Private workspace owner required';end if;
 return jsonb_build_object(
 'owner_id',auth.uid(),'reset_epoch',(select reset_epoch from public.private_workspace_settings where singleton),'sampled_at',now(),
 'storage_bytes',(select coalesce(sum(coalesce(nullif(metadata->>'size','')::bigint,0)),0)from storage.objects where bucket_id='project-media'),
 'database_bytes',pg_database_size(current_database()),'objects',(select count(*)from storage.objects where bucket_id='project-media'),
 'records',(select count(*)from public.project_tool_records r join public.projects p on p.id=r.project_id where p.owner_id=auth.uid()),
 'projects',(select count(*)from public.projects where owner_id=auth.uid()and archived_at is null),'archived_projects',(select count(*)from public.projects where owner_id=auth.uid()and archived_at is not null),
 'registered_users',(select count(*)from auth.users),'active_users',(select count(*)from public.workspace_presence where user_id=auth.uid()and last_seen_at>=now()-interval '10 minutes'),
 'events',(select coalesce(jsonb_agg(e),'[]'::jsonb)from(select id,kind,message,created_at,project_id from public.private_workspace_events where owner_id=auth.uid() union all select -id,action kind,action message,created_at,project_id from public.audit_log where actor_id=auth.uid()order by created_at desc limit 30)e));end $$;
revoke all on function public.private_workspace_state()from public,anon;
grant execute on function public.private_workspace_state()to authenticated;
-- Restrict presence writing too; monitor only the verified owner.
create or replace function public.record_workspace_presence()returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin()then raise exception 'Private workspace owner required';end if;
 insert into public.workspace_presence(user_id,last_seen_at)values(auth.uid(),now())on conflict(user_id)do update set last_seen_at=excluded.last_seen_at;end $$;
do $$ declare name text;begin
 foreach name in array array['private_workspace_events','projects','audit_log']loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'and schemaname='public'and tablename=name)then execute format('alter publication supabase_realtime add table public.%I',name);end if;end loop;
end $$;
commit;
