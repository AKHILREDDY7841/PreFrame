begin;

-- Presence is refreshed by authenticated browser sessions. It is used only for
-- the owner dashboard and defines "active" as seen within the last 10 minutes.
create table if not exists public.workspace_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.workspace_presence enable row level security;

create or replace function public.record_workspace_presence()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  insert into public.workspace_presence(user_id, last_seen_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
end;
$$;

revoke all on function public.record_workspace_presence() from public, anon;
grant execute on function public.record_workspace_presence() to authenticated;

create or replace function public.admin_workspace_metrics()
returns table (
  storage_bytes bigint,
  registered_users bigint,
  active_users bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'administrator access required';
  end if;

  return query
  select
    coalesce(sum(nullif(object_row.metadata ->> 'size', '')::bigint), 0)::bigint,
    (select count(*)::bigint from public.profiles),
    (select count(*)::bigint from public.workspace_presence where last_seen_at >= now() - interval '10 minutes')
  from storage.objects as object_row
  where object_row.bucket_id = 'project-media';
end;
$$;

revoke all on function public.admin_workspace_metrics() from public, anon;
grant execute on function public.admin_workspace_metrics() to authenticated;

commit;
