# Prompts 01–04 handoff

## Implemented locally

- A responsive public landing page, auth gate, signed-in home, project dashboard, and dedicated routes for every approved workspace.
- Typed UUID domain entities and repository boundaries. UI code never calls Supabase directly.
- Warm eye-saver preference, reduced-motion support, real route parsing, clear 404/unavailable states, and sample data explicitly labelled local-only.
- IndexedDB-backed local project persistence and a coalescing revision-aware sync queue. It labels local data as local and cannot call a cloud backend until one is configured.
- A reviewed Supabase migration and a setup guide for the actual Prompt 02/03 integration.

## Integration gate / not complete

There is no configured Supabase project or Google OAuth application available to this repository. Therefore actual RLS execution, cloud project recovery, invite acceptance/removal, Google login/logout, two-device recovery, and server-backed sync cannot truthfully be marked complete. The disabled sign-in control is deliberate; it does not simulate authentication.

## Backup/import policy

Prompt 04 requires complete export/import after the project document and media repository are implemented. The current local foundation stores only a project title; it has no media or screenplay content to export. Import remains validation-gated and does not create or overwrite a project.
