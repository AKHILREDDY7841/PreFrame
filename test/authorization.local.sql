\set ON_ERROR_STOP on
begin;

-- This file is only for the disposable local Supabase database. Every fixture
-- and owner mapping is rolled back even when a check fails.
insert into auth.users
  (id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner@example.test', '', now(), '{}', '{"full_name":"Owner"}', now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'editor@example.test', '', now(), '{}', '{}', now(), now()),
  ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'other@example.test', '', now(), '{}', '{}', now(), now()),
  ('10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'fourth@example.test', '', now(), '{}', '{}', now(), now()),
  ('10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'fifth@example.test', '', now(), '{}', '{}', now(), now());

select public.provision_owner('10000000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claim.email = 'owner@example.test';
do $$ begin
  if not public.is_admin() then raise exception 'owner must be admin'; end if;
end $$;
select public.create_project_limited('Local authorization test', 'UTC') as project_id \gset
select set_config('preframe.test_project_id', :'project_id', true);
insert into public.scenes(project_id, heading, display_number)
values (:'project_id'::uuid, 'INT. CONTROL ROOM - DAY', 1) returning id as admin_scene_id \gset
select set_config('preframe.admin_scene_id', :'admin_scene_id', true);
reset role;
insert into storage.objects(bucket_id, name)
values ('project-media', :'project_id' || '/private-image.jpg');
set local role authenticated;
do $$ begin
  if not exists(select 1 from storage.objects where name = current_setting('preframe.test_project_id') || '/private-image.jpg')
  then raise exception 'project owner cannot read own private media'; end if;
end $$;
do $$ declare extra uuid; begin
  extra := public.create_project_limited('Admin second local project', 'UTC');
  if extra is null then raise exception 'Admin project bypass failed'; end if;
  for i in 1..101 loop
    insert into public.shots(project_id, ordinal)
    values (current_setting('preframe.test_project_id')::uuid, i);
    insert into public.storyboard_frames(project_id, ordinal)
    values (current_setting('preframe.test_project_id')::uuid, i);
  end loop;
end $$;

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
set local request.jwt.claim.email = 'other@example.test';
do $$ begin
  if public.is_admin() then raise exception 'ordinary user became admin'; end if;
  if exists(select 1 from public.projects where id = current_setting('preframe.test_project_id')::uuid)
    then raise exception 'outsider read a private project'; end if;
  if exists(select 1 from storage.objects where name = current_setting('preframe.test_project_id') || '/private-image.jpg')
    then raise exception 'outsider read private media metadata'; end if;
  begin
    perform public.rename_project(current_setting('preframe.test_project_id')::uuid, 'stolen', 1);
    raise exception 'outsider renamed private project';
  exception when others then
    if sqlerrm not like '%not a project member%' then raise; end if;
  end;
end $$;

-- Ordinary users retain the one-project and 50-item limits.
select public.create_project_limited('Free local project', 'UTC') as free_project_id \gset
select set_config('preframe.free_project_id', :'free_project_id', true);
do $$ begin
  if public.is_admin() then raise exception 'forged Admin flag accepted'; end if;
  begin
    insert into public.owner_identity(user_id) values ('10000000-0000-4000-8000-000000000003');
    raise exception 'ordinary user assigned owner identity';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.shots(project_id, scene_id, ordinal)
    values (current_setting('preframe.free_project_id')::uuid,
            current_setting('preframe.admin_scene_id')::uuid, 0);
    raise exception 'cross-project scene reference accepted';
  exception when others then
    if sqlerrm not like '%cross-project scene reference denied%' then raise; end if;
  end;
  begin
    perform public.create_project_limited('Forbidden second project', 'UTC');
    raise exception 'free user created a second project';
  exception when others then
    if sqlerrm not like '%free owned project limit reached%' then raise; end if;
  end;
  for i in 1..50 loop
    insert into public.shots(project_id, ordinal)
    values (current_setting('preframe.free_project_id')::uuid, i);
    insert into public.storyboard_frames(project_id, ordinal)
    values (current_setting('preframe.free_project_id')::uuid, i);
  end loop;
  begin
    insert into public.shots(project_id, ordinal)
    values (current_setting('preframe.free_project_id')::uuid, 51);
    raise exception 'free user added a 51st shot';
  exception when others then
    if sqlerrm not like '%free item limit reached%' then raise; end if;
  end;
  begin
    insert into public.storyboard_frames(project_id, ordinal)
    values (current_setting('preframe.free_project_id')::uuid, 51);
    raise exception 'free user added a 51st frame';
  exception when others then
    if sqlerrm not like '%free item limit reached%' then raise; end if;
  end;
end $$;

select public.invite_editor(:'free_project_id'::uuid, 'editor@example.test') as free_invitation_1 \gset
select public.invite_editor(:'free_project_id'::uuid, 'fourth@example.test') as free_invitation_2 \gset
select public.invite_editor(:'free_project_id'::uuid, 'fifth@example.test') as free_invitation_3 \gset
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
set local request.jwt.claim.email = 'editor@example.test';
select public.accept_project_invitation(:'free_invitation_1'::uuid);
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000004';
set local request.jwt.claim.email = 'fourth@example.test';
select public.accept_project_invitation(:'free_invitation_2'::uuid);
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000005';
set local request.jwt.claim.email = 'fifth@example.test';
select set_config('preframe.third_invitation', :'free_invitation_3', true);
do $$ begin
  begin
    perform public.accept_project_invitation(current_setting('preframe.third_invitation')::uuid);
    raise exception 'fourth seat accepted into free project';
  exception when others then
    if sqlerrm not like '%editor seat limit reached%' then raise; end if;
  end;
end $$;

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claim.email = 'owner@example.test';
select public.invite_editor(:'project_id'::uuid, 'editor@example.test') as invitation_id \gset

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
set local request.jwt.claim.email = 'editor@example.test';
do $$ begin
  if exists(select 1 from public.projects where id = current_setting('preframe.test_project_id')::uuid)
    then raise exception 'unaccepted invite exposed project'; end if;
end $$;
select public.accept_project_invitation(:'invitation_id'::uuid);
do $$ begin
  if not exists(select 1 from public.projects where id = current_setting('preframe.test_project_id')::uuid)
    then raise exception 'accepted editor cannot read project'; end if;
end $$;

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claim.email = 'owner@example.test';
select public.remove_editor(:'project_id'::uuid, '10000000-0000-4000-8000-000000000002');
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
set local request.jwt.claim.email = 'editor@example.test';
do $$ begin
  if exists(select 1 from public.projects where id = current_setting('preframe.test_project_id')::uuid)
    then raise exception 'removed editor retained project access'; end if;
end $$;

rollback;
