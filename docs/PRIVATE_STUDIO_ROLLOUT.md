# Owner-only PREFRAME rollout — prepared, not deployed

Date: 2026-10-12. User requested a personal workspace, full project/data reset, and deletion of the other registered accounts. The verified administrator must remain: ecd354a0-e442-44d1-8b45-0562cd7eb3f8. Do not remove owner_identity, the owner profile/Auth user, provider identities, sign-in configuration, schema/migration history or buckets.

## Current state

The private UI, owner gate, monitoring RPCs, database restrictions, disabled sharing/public registration, explicit recycle-bin deletion, and reset-generation recovery barrier are staged on work/private-studio-20261012. Nothing has been applied to Supabase or pushed to the live branch. Browser control was halted because it could not establish the current URL safely. No server/database credentials are configured in the shell. Do not work around browser safety verification or retrieve credentials from browser storage.

The historical 2026-10-06 verified package contains 28 table snapshots, 199 tool records, 61 extracted embedded images, 2 cloud covers and the preserved owner anchor. It is not a current backup for a destructive reset on 2026-10-12. Fresh counts and content hashes are required; user edits may have occurred.

## Deployment order

1. Regain a verified signed-in Supabase dashboard session. Audit current tables, buckets/objects and all Auth account IDs. Avoid exposing credentials or auth tokens in outputs/backups.
2. Create a fresh private complete backup outside Git, including project records, settings/history, media binaries, memberships, invitations and audit data. Verify counts, hashes, references and a local restore. Keep the existing 2026-10-06 package as an earlier snapshot.
3. Review/apply 202610120015_private_studio.sql as configuration only. It deliberately contains no project/media/account reset. The owner anchor assertion must pass. Verify owner login before any deletion. Validate the signup rejection trigger with supported Supabase behavior.
4. Test RLS/RPC denial for anonymous and unrelated accounts, even when their old JWTs remain valid. Test owner access and creation of a disposable project inside a rollback-only database transaction. Sharing RPCs must no longer be executable. Run the prepared rollback-only checks in supabase/tests/private_studio_access.sql. These live database tests are NOT yet run.
5. Present the exact current deletion inventory and verified backup path to the user. Request action-time approval for the irreversible project/media/account reset as required by Computer Use. Earlier broad approvals do not replace the reviewed current inventory.
6. Remove exactly the inventoried project-media objects through the Storage API/dashboard, verifying each response. Do not DELETE storage.objects in SQL: metadata deletion does not remove object bytes. Confirm remaining object inventory is empty.
7. Delete all existing app projects with their cascading tool/legacy content, clear orphan/global invitations, join attempts, audit and private activity rows as inventoried. Keep schema, bucket configuration, owner identity and owner account. Advance private_workspace_settings.reset_epoch in the same database transaction as content reset; this prevents pre-reset owner browser drafts/outboxes from reviving old data.
8. Delete each explicitly inventoried non-owner Auth account through the supported Auth Admin API/dashboard only after its Storage objects, project references and other blocking links are cleared. Never delete the owner. Verify exactly one Auth account and its matching owner profile remain. Managed provider/platform operational logs are outside the app reset scope.
9. Verify empty project/tool/media inventories, preserved owner login, and new reset epoch. Do not auto-restore old projects to this private studio: this latest user request deliberately asks for a blank start. Keep backups separately.
10. Publish the matching frontend only after backend checks pass. Verify all eight tools, project creation, notes text/image handling, screenplay Enter/caret, imports/exports, offline recovery, owner-only sign-in and the dashboard with live data. Check desktop/mobile layout and network failures. Do not promise zero possible bugs.

## Live monitoring boundary

Measured: database physical bytes (includes database overhead and may not shrink immediately after row deletion), confirmed project-media metadata bytes/file count, cloud records (includes settings/history), owner presence, actual Auth-account count, project counts, application audit actions, route activity, and browser/sync failure transitions. Realtime events update the visible dashboard; a 15-second poll and manual refresh remain available. Last-confirmed values are marked stale on failure. No fake quota percentages or synthetic user/revenue data are shown.

Provider CPU, IO-budget history, egress/billing, server-wide logs, and remaining plan capacity are not available through the implemented browser RPC. Offline errors cannot reach the cloud until connectivity returns; local recovery remains independent. Do not describe this as monitoring every underlying provider event.

## Commercial archive

C:/Users/pc/Downloads/PreFrame/PREMIUM_FREE_REVENUE_MODEL.md contains pricing, features, revenue arithmetic, future billing requirements, recovery source references, and archived marketing/collaboration source. The private frontend does not expose paid upgrades, donations, collaborator invitations, public registration or tier caps.

Primary references: [User deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [managed Auth data](https://supabase.com/docs/guides/auth/managing-user-data), [Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
