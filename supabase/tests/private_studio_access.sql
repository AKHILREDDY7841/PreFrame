-- Run after 202610120015, before reset/deployment. All probe writes roll back.
-- These live RLS tests have NOT been executed while browser access is unavailable.
begin;
set local role anon;
do $$begin
 begin perform public.private_workspace_state();raise exception 'FAIL: anonymous monitoring RPC allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
do $$declare routine_entry record;begin
 if public.is_admin()then raise exception 'FAIL: unrelated account became administrator';end if;
 if exists(select 1 from public.projects)or exists(select 1 from public.project_tool_records)or exists(select 1 from public.private_workspace_events)then raise exception 'FAIL: unrelated account can read private data';end if;
 begin perform public.private_workspace_state();raise exception 'FAIL: unrelated monitoring RPC allowed';exception when raise_exception then if SQLERRM<>'Private workspace owner required'then raise;end if;end;
 for routine_entry in select oid,oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname in('invite_editor','accept_invitation','accept_project_invitation','generate_project_code','join_project_code','add_editor_limited','remove_editor')loop
 if has_function_privilege(current_user,routine_entry.oid,'execute')then raise exception 'FAIL: sharing RPC still executable: %',routine_entry.signature;end if;end loop;
end $$;
select set_config('request.jwt.claims','{"sub":"ecd354a0-e442-44d1-8b45-0562cd7eb3f8","role":"authenticated"}',true);
do $$declare pid uuid;state jsonb;begin
 if not public.is_admin()then raise exception 'FAIL: verified owner denied';end if;
 state:=public.private_workspace_bootstrap();if state->>'owner_id'<>'ecd354a0-e442-44d1-8b45-0562cd7eb3f8'then raise exception 'FAIL: bootstrap owner mismatch';end if;
 state:=public.private_workspace_state();if state->>'database_bytes'is null then raise exception 'FAIL: measured database usage absent';end if;
 pid:=public.create_project_limited('__private-mode-rollback-probe__','Asia/Kolkata');if not public.is_owner(pid)or not public.is_member(pid)then raise exception 'FAIL: owner project denied';end if;
 perform public.save_project_tool_record(pid,'notes',gen_random_uuid(),'Rollback probe','{"body":"Disposable rollback-only probe"}'::jsonb,0);
 if not exists(select 1 from public.project_tool_records where project_id=pid)then raise exception 'FAIL: owner save/read denied';end if;
end $$;
rollback;
select 'PASS: owner access, unrelated/anonymous denial, disabled sharing; probes rolled back' verification;
