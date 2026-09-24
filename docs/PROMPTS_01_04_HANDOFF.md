# Prompts 01–04 status

The Prompt 00 feasibility editor is preserved separately at `prototype.html` in a built site (or `/PreFrame/prototype.html` on GitHub Pages after a future deployment). Its browser proof script targets that page; no fresh physical IME or PDF run was possible in this integration pass.

Prompt 01's responsive route shell, project dashboard, honest empty modules, type boundaries, eye-saver mode, and local sample are implemented. Current layout/routing unit tests pass. The approved Premium home variant and broad accessibility audit still need work, so its gate is not fully signed off.

Prompt 02's core, hardening, and authenticated-read migrations are applied to the hosted `PreFrame` Supabase project. Local migrations 004–006 fix Admin quota scope and cross-table reference triggers and revise the owner-approved Free shot/frame limits to 50/50; these are **not yet hosted**. The local SQL, concurrent-write, and direct REST authorization suites pass, and TypeScript types are generated from the migrated database. The Prompt 02 local gate is met; hosted parity and post-migration smoke testing remain deployment work.

Prompt 03 now has client code for Google redirect, session restoration, sign-out, cloud projects, invitation acceptance and editor removal. Google OAuth and the Pages redirect allow list are configured. A second Google account accepted a live invitation to the synced project; the owner removed that editor and the former editor then received the verified "Project unavailable" denial. The Prompt 03 gate is met.

Prompt 04 now has an IndexedDB pending title-write queue, revision-checked cloud RPC design, coalescing, offline retention, retry states, and conflict preservation. It also has a versioned JSON project archive with SHA-256 checksums for structured content and uploaded media, plus import validation and preview that cannot create or overwrite a project. The archive explicitly warns that unsynced edits and unuploaded originals are excluded. These paths have not been tested against a real signed-in backend. Only the project title uses the queue; restore creation remains intentionally gated. The gate is not met.

The live GitHub Pages site contains the current authenticated build. Further changes must be deployed after their applicable gates are verified.
