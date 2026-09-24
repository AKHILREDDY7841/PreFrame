# Supabase setup and current integration state

The free Supabase project is `PreFrame` (`tvrhjgwegascckqsfmtk`, Mumbai). The public URL and **publishable** key are defaults in `src/cloud.ts`; a build can override them with `PREFRAME_SUPABASE_URL` and `PREFRAME_SUPABASE_PUBLISHABLE_KEY`. A publishable key is designed for browser use; no secret or service-role key belongs in this repository.

`202609240001_core.sql` was applied to that project. `202609240002_hardening.sql` is a follow-up migration in the repository; **do not expose cloud writes until it has been applied and its authorization tests pass**. The follow-up adds the auth profile trigger, narrow invitation RPCs, serialized quota checks, reference checks, storage policies, and revision-checked project renames. It has not been applied to the hosted project yet.

Google Cloud project `PreFrame OAuth` (`custom-cycling-509519-q8`) has an OAuth branding configuration. The Google OAuth client and Supabase provider still need to be completed. Its sole Google redirect URI should be `https://tvrhjgwegascckqsfmtk.supabase.co/auth/v1/callback`. In Supabase Auth URL Configuration use `https://akhilreddy7841.github.io/PreFrame/` as the site URL and allow the matching `/PreFrame/**` path plus `http://localhost:4173/**` for local testing. The Google client **secret** goes only into Supabase's provider settings.

After Akhil's first successful Google sign-in, an operator can look up the verified auth UUID and execute `select public.provision_owner('<verified-uuid>');` once from a privileged SQL session. Do not infer Admin from the email address or client metadata. Only `public.is_admin()` should drive the avatar badge.

The unresolved product policy for a Free account invited into other users' projects remains open. The current owned-project limit does not impose an invented cap on invited memberships.

For local backend verification, run both migrations against a disposable Supabase stack, then use two ordinary test accounts and direct REST requests to verify: one Free owned active project, fourth accepted member denied, 101st active shot/frame denied, forged foreign references denied, nonmember reads/writes denied, removed editor access denied, and an ordinary account cannot call `provision_owner`. Race the fourth-member and 101st-item operations from separate connections. No such full local backend test has passed yet.

Rollback of the hardening migration is not automatic: retain a database backup before applying it. Its policy/trigger/function changes affect authorization and should be reversed only by a separately reviewed migration; deleting project data is not part of rollback.
