-- Shared, revisioned records backing every project tool.
-- The browser uses these rows for screenplay, notes, shots, storyboards,
-- schedules, locations and call sheets. Project membership controls access.
begin;

create table if not exists public.project_tool_records (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  tool text not null check (tool in ('screenplay','notes','shots','storyboards','schedule','locations','call-sheets')),
  title text not null check (char_length(title) between 1 and 160),
  fields jsonb not null default '{}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_tool_records_project_tool_updated
  on public.project_tool_records(project_id, tool, updated_at desc);

alter table public.project_tool_records enable row level security;
revoke all on public.project_tool_records from anon;
grant select on public.project_tool_records to authenticated;
drop policy if exists project_members_read_tool_records on public.project_tool_records;
create policy project_members_read_tool_records on public.project_tool_records
  for select to authenticated using (public.is_member(project_id));

create or replace function public.save_project_tool_record(
  p_project uuid,
  p_tool text,
  p_record uuid,
  p_title text,
  p_fields jsonb,
  p_expected_revision integer
)
returns public.project_tool_records
language plpgsql security definer set search_path = '' as $$
declare saved public.project_tool_records;
begin
  if auth.uid() is null or not public.is_member(p_project) then
    raise exception 'not a project member';
  end if;
  if p_tool not in ('screenplay','notes','shots','storyboards','schedule','locations','call-sheets')
     or p_title is null or char_length(trim(p_title)) not between 1 and 160
     or p_fields is null or jsonb_typeof(p_fields) <> 'object'
     or p_expected_revision < 0 then
    raise exception 'invalid tool record';
  end if;
  perform 1 from public.projects where id = p_project and archived_at is null for update;
  if not found then raise exception 'project unavailable'; end if;
  select * into saved from public.project_tool_records where id = p_record for update;
  if found then
    if saved.project_id <> p_project or saved.tool <> p_tool or saved.revision <> p_expected_revision then
      raise exception 'revision conflict' using errcode = '40001';
    end if;
    update public.project_tool_records
      set title = trim(p_title), fields = p_fields, revision = revision + 1, updated_at = now()
      where id = p_record returning * into saved;
  else
    if p_expected_revision <> 0 then raise exception 'revision conflict' using errcode = '40001'; end if;
    insert into public.project_tool_records(id, project_id, tool, title, fields)
      values (p_record, p_project, p_tool, trim(p_title), p_fields)
      returning * into saved;
  end if;
  insert into public.audit_log(project_id, actor_id, action)
    values (p_project, auth.uid(), 'saved ' || p_tool || ' record');
  return saved;
end $$;
revoke all on function public.save_project_tool_record(uuid,text,uuid,text,jsonb,integer) from public, anon;
grant execute on function public.save_project_tool_record(uuid,text,uuid,text,jsonb,integer) to authenticated;

create or replace function public.delete_project_tool_record(p_project uuid, p_record uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare deleted_tool text;
begin
  if auth.uid() is null or not public.is_member(p_project) then raise exception 'not a project member'; end if;
  delete from public.project_tool_records
    where id = p_record and project_id = p_project returning tool into deleted_tool;
  if not found then raise exception 'record unavailable'; end if;
  insert into public.audit_log(project_id, actor_id, action)
    values (p_project, auth.uid(), 'deleted ' || deleted_tool || ' record');
end $$;
revoke all on function public.delete_project_tool_record(uuid,uuid) from public, anon;
grant execute on function public.delete_project_tool_record(uuid,uuid) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.project_tool_records;
exception when duplicate_object then null;
end $$;
notify pgrst, 'reload schema';
commit;
