begin;
create table if not exists public.project_join_codes (
  code_hash bytea primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  used_by uuid references public.profiles(id),
  used_at timestamptz
);
create index if not exists project_join_codes_project on public.project_join_codes(project_id);
create table if not exists public.project_join_attempts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_start timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.project_join_codes enable row level security;
alter table public.project_join_attempts enable row level security;
revoke all on public.project_join_codes, public.project_join_attempts from anon, authenticated;

create or replace function public.generate_project_code(p_project uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare code text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; bytes bytea; i integer; expiry timestamptz;
begin
  if auth.uid() is null or not public.is_owner(p_project) then raise exception 'Only the project owner can create an invite code.'; end if;
  perform 1 from public.projects where id=p_project and archived_at is null for update;
  if not found then raise exception 'Project unavailable.'; end if;
  if (select count(*) from public.project_members where project_id=p_project)>=3 then raise exception 'This project has reached its member limit.'; end if;
  update public.project_join_codes set expires_at=now() where project_id=p_project and used_at is null;
  expiry := now()+interval '60 seconds';
  loop
    code := ''; bytes := pg_catalog.uuid_send(gen_random_uuid());
    for i in 0..5 loop code := code || substr(alphabet, (get_byte(bytes,i) % length(alphabet))+1, 1); end loop;
    if code !~ '[A-Z]' or code !~ '[0-9]' then continue; end if;
    begin
      insert into public.project_join_codes(code_hash,project_id,created_by,expires_at)
      values(sha256(convert_to(code,'UTF8')),p_project,auth.uid(),expiry);
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return jsonb_build_object('code',code,'expiresAt',expiry);
end $$;

create or replace function public.join_project_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare invite public.project_join_codes%rowtype; tries integer; code text := upper(trim(p_code));
begin
  if auth.uid() is null then raise exception 'Sign in to join a project.'; end if;
  insert into public.project_join_attempts(user_id,window_start,attempts) values(auth.uid(),now(),1)
  on conflict(user_id) do update set
    attempts=case when public.project_join_attempts.window_start < now()-interval '10 minutes' then 1 else public.project_join_attempts.attempts+1 end,
    window_start=case when public.project_join_attempts.window_start < now()-interval '10 minutes' then now() else public.project_join_attempts.window_start end
  returning attempts into tries;
  -- Return errors so failed attempts commit and cannot bypass the rate limit.
  if tries>10 then return jsonb_build_object('error','Too many attempts. Try again in 10 minutes.'); end if;
  if code !~ '^[A-Z0-9]{6}$' then return jsonb_build_object('error','Enter a six-character invite code.'); end if;
  select * into invite from public.project_join_codes where code_hash=sha256(convert_to(code,'UTF8'));
  if not found then return jsonb_build_object('error','This code is invalid or has expired.'); end if;
  perform 1 from public.projects where id=invite.project_id and archived_at is null for update;
  if not found then return jsonb_build_object('error','Project unavailable.'); end if;
  select * into invite from public.project_join_codes where code_hash=sha256(convert_to(code,'UTF8')) for update;
  if invite.expires_at<=now() or invite.used_at is not null then return jsonb_build_object('error','This code is invalid or has expired.'); end if;
  if exists(select 1 from public.project_members where project_id=invite.project_id and user_id=auth.uid()) then return jsonb_build_object('error','You already belong to this project.'); end if;
  if (select count(*) from public.project_members where project_id=invite.project_id)>=3 then return jsonb_build_object('error','This project has reached its member limit.'); end if;
  insert into public.project_members(project_id,user_id,role) values(invite.project_id,auth.uid(),'editor');
  update public.project_join_codes set used_at=now(),used_by=auth.uid() where code_hash=invite.code_hash;
  return jsonb_build_object('projectId',invite.project_id);
end $$;
revoke all on function public.generate_project_code(uuid), public.join_project_code(text) from public, anon;
grant execute on function public.generate_project_code(uuid), public.join_project_code(text) to authenticated;
notify pgrst, 'reload schema';
commit;
