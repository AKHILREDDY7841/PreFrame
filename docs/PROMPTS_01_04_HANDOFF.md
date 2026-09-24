# Prompts 01–04 status

The Prompt 00 feasibility editor is preserved separately at `prototype.html` in a built site (or `/PreFrame/prototype.html` on GitHub Pages after a future deployment). Its browser proof script targets that page; no fresh physical IME or PDF run was possible in this integration pass.

Prompt 01's responsive route shell, project dashboard, honest empty modules, type boundaries, eye-saver mode, and local sample are implemented. Current layout/routing unit tests pass. The approved Premium home variant and broad accessibility audit still need work, so its gate is not fully signed off.

Prompt 02's core, hardening, and authenticated-read migrations are applied to the hosted `PreFrame` Supabase project. The hardening migration restricts direct member/invitation mutation, adds scoped RPCs, private media policies, revision checks, quota locks, and cross-project reference guards. It still has no passing local backend authorization/concurrency test suite or generated database types. The gate is not met.

Prompt 03 now has client code for Google redirect, session restoration, sign-out, cloud projects, invitation acceptance and editor removal. Google OAuth and the Pages redirect allow list are configured and the first live sign-in reaches the authenticated home screen. There is no verified two-browser recovery or revoked-editor test. The gate is not met.

Prompt 04 now has an IndexedDB pending title-write queue, revision-checked cloud RPC design, coalescing, offline retention, retry states, and conflict preservation. It also has a versioned JSON project archive with SHA-256 checksums for structured content and uploaded media, plus import validation and preview that cannot create or overwrite a project. The archive explicitly warns that unsynced edits and unuploaded originals are excluded. These paths have not been tested against a real signed-in backend. Only the project title uses the queue; restore creation remains intentionally gated. The gate is not met.

The live GitHub Pages site contains the current authenticated build. Further changes must be deployed after their applicable gates are verified.
