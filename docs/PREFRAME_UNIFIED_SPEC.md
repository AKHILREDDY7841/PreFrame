# PREFRAME — Unified Product Specification, Technical Architecture & Codex Development Prompts

**Version:** 2.2 · **Date:** 24 September 2026 · **Status:** Single authoritative working specification; *not evidence that software is implemented or tests have passed*.
**Owner:** Akhil · **Product:** Preframe · **Audience:** Codex, product owner, developers, designers and QA.
**Source of truth:** This ONE Markdown file supersedes the three earlier Preframe documents wherever they disagree. Reference mockups illustrate visual direction; they are not proof of implemented behavior, available features, factual project data or approved Premium entitlements.

## Read me first — decisions and precedence

1. **Confirmed:** Brand working name Preframe; single default light interface (white / near-white and teal `#43717F`), plus a separate optional eye-saver mode. No light/dark switcher or black theme. Do not promise clinical eye-strain reduction; call it an optional low-glare reading preference.
2. **Confirmed:** Public marketing landing page → Google auth → signed-in home / project library → project-specific dashboard → **dedicated full-page** individual workspaces. These are distinct surfaces; do not make screenplay, storyboard or schedule an embedded card in the home page.
3. **Confirmed:** The signed-in home has **three account presentations**, Free, Premium and owner-only Admin. Free shows one active owned project, Premium may show multiple subject to undecided caps; show the verified account tier/role as a subtle `Free`, `Premium`, or `Admin` badge beside its avatar, **never as a bottom-of-page plan strip**. Premium gets a Collaborate row immediately below project cards; **not** a fifth Tools card. Free may access project membership and shared projects within the agreed three-editor policy.
4. **Confirmed:** Approved home text only: `Good morning, {displayName}.` and `Ideas look better in focus.` This greeting may be localized; never hardcode Akhil into other users' accounts. **No motivational quotes** on sidebars, banners, image tiles or beside Upcoming Schedule. Replace the unused decorative column with purposeful, quiet visual motion or a functional next-action panel, not filler text.
5. **Confirmed:** Home Tools are Write, Visualize, Plan, **Import Script**. Upcoming Schedule is approved. A click into a film project presents its Write/Visualize/Plan dashboard; a click into a tool opens its own route and specialized workspace. Search bar is a *visual proposal*; either implement a truthful scoped search or omit the control. Recent Activity, Templates, Archive, additional global navigation and progress/overview widgets are **not approved homepage requirements**.
6. **Confirmed:** Free essentials and successfully synchronized cloud recovery remain available; Free is NOT local-only. Free: one active owned project, three editors per project INCLUDING the owner, 50 shot entries and 50 storyboard frames per project. Premium introductory and renewal prices are confirmed in §13.2; exact Premium caps, provider and remaining billing policies are OPEN. Do not render fake checkout, invented quotas or an “unlimited” claim.
7. **Confirmed:** User-supplied images only. No built-in text-to-image, AI storyboards or video hosting. The 6 MB image-media budget is an **engineering hypothesis**, NOT an approved user entitlement. Test legibility before choosing any enforced cloud-media number.
8. **Confirm by evidence:** Before public launch, validate secure project isolation, Google OAuth, storage usage, backups, import/export, synchronization, actual PDF rendering and real mobile device behavior. Neither an image mockup nor Codex reporting “done” is a pass.
9. **OPEN:** Premium provider/limits and launch timestamp, precise free invitee policy, draft-history policy, safe importer formats, media cap, export/import merge semantics and public domain/trademark availability. Do not quietly invent answers.

---

# Part 0 — Current brand, UI and interaction contract [LATEST; OVERRIDES OLDER THEME / DASHBOARD LANGUAGE]

## 0.1 Brand and visual foundation

- Working logo: approved cinematic frame-mark with `Preframe` typography beneath / alongside as appropriate. Recreate as an accessible SVG/icon where appropriate; don't treat an image-generation mockup as a production-ready vector or claim font licensing without checking.
- Brand teal: `#43717F`; primary canvas white `#FFFFFF`; recommended soft section backgrounds `#F5F7F8` and subtle neutral borders/text. A slightly lighter teal is permissible for legible small text or focus indication. Verify actual text contrast by component rather than assuming brand teal works everywhere.
- Default appearance: light, bright, minimal, editorial and cinematic. **No separately selectable dark/black UI**. Eye-saver is a single explicit toggle, preferably near the avatar in the header, using a gently warm, reduced-glare canvas and legible, user-adjustable contrast; never apply a blanket filter that corrupts storyboards or image colors. Save preference per user locally and sync if available. Respect OS reduced-motion preference.
- Typography: an elegant editorial serif may be used for the public hero and personal greeting; practical readable UI sans for controls; professional monospaced screenplay presentation with Unicode font fallbacks. Do not assume a particular proprietary typeface is licensed or capable of shaping all languages.
- Avoid StudioBinder-like sidebar/grid replication: distinctive Preframe composition, generous whitespace, a cinematic panoramic greeting, understated frame accents, and purpose-specific workspaces. Use the screenshots as **direction**, not exact build instructions; screenshot text and example metrics are non-authoritative.

## 0.2 Public landing page `/`

- Hero concept: `Before the camera rolls.` with a restrained film-frame sequence, approved Preframe logo and clear explanation of screenplay, shot and schedule tools. Responsive layout; subtle parallax/layered film frames **only when performance and reduced-motion behavior are verified**. Main navigation: Features, Pricing, About, Log in and Get started. Two CTAs: Start for free and Watch video.
- Features/Pricing/About: anchored accessible public sections (or clean dedicated public routes if justified). Free pricing content uses exact confirmed limits; Premium pricing copy uses §13.2, but purchase remains unavailable until provider, entitlements and billing policies are finalized and tested. Do not publish false prices or claims of unlimited storage/projects.
- `Get started` and `Start for free` → Google-auth onboarding, and if already authenticated → signed-in home/project library. `Log in` → Google sign-in and then home. `Watch video` → a genuine video player only when an actual demo video exists; otherwise **hide** the control until content is ready. No fake video modal or fake account registration step.
- Public marketing pages may be indexed. All user-owned projects, screenplays, schedules and private file URLs should be protected and excluded from search indexing. Provide sensible per-page title/meta description, favicon, robots/sitemap for public pages once deployed.

## 0.3 After Google login: global signed-in home `/app`

The **home is not the inside-project dashboard**. Header: Preframe mark, optional truthful project/document search, eye-saver toggle, user avatar, small `Free` or `Premium` label **beside the avatar** and account menu. On mobile use a compact menu/drawer. Left navigation: Home, Projects, Shared with me (where membership data exists), Settings. Do **not** add Templates, Archive, miscellaneous marketing tabs or empty decorative sections without a separately approved feature.

- Greeting: `Good morning, {name}.` (adapt greeting to local daypart if reliable) and `Ideas look better in focus.` With a wide quiet cinematic banner; landscape / filmmaker visuals are decorative only, must not introduce fake project metadata or quotes.
- `Your Project` (Free) / `Your Projects` (Premium): show the user's real active owned film(s), current last-updated timestamp and user-provided/optional cover; no fabricated sample projects in production. Free: one active owned project; on `New Project` with an active project, show a truthful quota explanation and non-destructive options, not a silent create. Premium: multiple actual projects; number limited by server-owned entitlements once approved. Empty project state includes `Create your first film project`.
- **Premium only home layout:** a full-width `Collaborate` action row **immediately below projects and above Tools**, linking to the selected project's membership workspace; if no project selected, ask the user to choose one. Collaboration is not a fifth Tools tile. Free can still invite up to three editors via the project membership control or Shared with me; don't hide an approved free capability merely to create an upsell.
- `Tools`: exactly four home cards in this order: Write (Screenplay & Notes); Visualize (Shot Lists & Storyboards); Plan (Schedule & Call Sheets, plus Calendar/Locations inside); Import Script. Tools require project context: if no selected project, select/create one first. Import Script opens a proper upload/preview/import flow when supported, not a dead button. Exact file formats are OPEN pending converter proof; start with formats Codex actually parses and validates, and show supported formats in UI.
- `Upcoming Schedule`: genuine upcoming entries from accessible projects with event time and project context. Link `View all` to actual calendar filtered appropriately. Show an informative empty state if there are no scheduled events. Use date/time based on project timezone. No fabricated dates, activities or people.
- Adjacent schedule area: quiet cinematic frame treatment or **useful** next-action status (e.g. next approved shoot day) with minimal motion, **no quotations**, no project-progress ring, and no fake “overview” widget. Decorative visuals may be disabled on small screens.
- Account tier is displayed only beside avatar / account menu, not duplicated in a bottom-tier banner. No bottom Free/Premium promo strip. If Premium is not launched, show a truthful informational treatment only; do not allow unauthorized premium entitlement selection.

## 0.3A Owner-only Admin identity and home [CONFIRMED; security is mandatory]

- **Exactly one designated owner Admin account** is provisioned through a protected, one-time operator-controlled Supabase setup. The owner signs in through the same Google login as everyone else; a verified Supabase Auth **user UUID** identifies the owner. The user's email, display name, avatar, URL or a frontend flag must **not** grant privileges. Never assign Admin to any newly registered account by default.
- In the signed-in header show a small distinctive `Admin` watermark/badge **beside the owner's avatar**, and show `Admin` in the account menu. Never show the owner a Free or Premium badge, and never show a bottom plan strip. Ordinary accounts retain their Free/Premium badge. The Admin home uses the same restrained Preframe layout; the owner can reach every existing feature without a subscription purchase.
- **Admin has all implemented Free and Premium features and is exempt from per-account/per-project product quotas** (owned-project count, editor seats in the owner's projects, shot/frame caps and later Premium feature gates), enforced by trusted backend authorization. Admin status does **not** lift Supabase's physical storage, bandwidth, database, or service quotas; show actual capacity warnings and do not promise infinite storage.
- Admin does **not** automatically gain read/write access to other filmmakers' private projects, media, contact details or screenplays. Access to another project still requires explicit membership or a separately designed, audited support-access workflow approved by its owner. Global operator controls such as user/plan management are **future scope**, not permission to expose private user data in the first release.
- Never render an Admin switch, purchasable Admin tier, public Admin signup link or editable Admin role field. If the designated owner loses Google-account access, recovery must be a documented manual operator procedure with identity verification, never an email-only or client-side self-recovery endpoint.

## 0.4 Inside a project: project dashboard `/app/projects/:projectId`

The selected project's dashboard is a separate view from signed-in home. Show project title, genuine recent status and the **three** groupings: Write (Screenplay; Docs & Notes), Visualize (Shot Lists; Storyboards), Plan (Production Schedule; Calendar; Call Sheets; Locations). Group cards are navigation, not in-place editors. Distinct Preframe visual rhythm versus conventional StudioBinder layout. All data and navigation are scoped to the current project ID; switching project must not leak cached project data.

## 0.5 Dedicated full-page tool routes (non-negotiable)

| Destination | Proposed route | Own purpose-built workspace |
|---|---|---|
| Screenplay | `/app/projects/:projectId/screenplay` | Traditional near-full-width paginated writing surface, scene navigator, element toolbar, optional comments margin, save status, focused mobile mode. |
| Docs & Notes | `/app/projects/:projectId/notes` | Notes/documents library and editor; simple organization and contextual links. |
| Shot Lists | `/app/projects/:projectId/shots` | Wide shot table on desktop, focused shot cards on mobile; image upload and scene filters. |
| Storyboards | `/app/projects/:projectId/storyboards` | Frame grid/cards, device-uploaded images, description, sound effects, video link; rearrangement. |
| Production Schedule | `/app/projects/:projectId/schedule` | Full scheduling table with 15 day columns, detailed daily/scene timeline, metrics; wide table may scroll **within its container**. |
| Calendar | `/app/projects/:projectId/calendar` | Full month/week/day calendar over the same schedule records. |
| Call Sheets | `/app/projects/:projectId/call-sheets` | Full call-sheet list, editor, preview and versioned PDF publishing. |
| Locations | `/app/projects/:projectId/locations` | Full location records, permissions, contacts and linked scenes/days. |
| Project collaborators | `/app/projects/:projectId/members` | Dedicated member/invite/role management, reached via relevant project controls and Premium Collaborate home row; Free membership still supported. |
| Import script | `/app/projects/:projectId/import` | Secure file selection, format indication, preview, scene mapping and explicit non-destructive confirmation. |

A small common `Back to project` / project switcher can persist in workspaces, but do not waste editor width on a permanent oversized home sidebar. Direct deep links must be authenticated/authorized and survive refresh. On mobile, each workspace has an adapted workflow, not a squeezed desktop screenshot. The Screenplay workspace in particular must be fully dedicated, including native-feeling typing and comment selection.

## 0.6 Motion system [APPROVED DIRECTION; precise choreography is proposed]

- Landing only: restrained film-frame sequence, subtle frame depth/parallax and typographic reveal. Avoid heavy video backgrounds, excessive grain and layout shifts.
- Home: cinematic banner enters gently once; project cards reveal briefly; active card gets a subtle teal frame response. Prefer opacity/transform animations of roughly 150–300 ms, and avoid animating numbers or project status unless sourced from actual updates.
- Navigation: fast, simple page changes; one consistent motion grammar, no spinning loaders where a skeleton or inline status would be clearer.
- In workspaces: only functional motion such as storyboard reorder and upload completion. **No typing, caret, selection, cursor, screenplay page or PDF layout animation.** Reduced-motion turns decorative animation off. Interaction must not wait on animation to complete.
- Performance: lazy-load decorative assets, prevent cumulative layout shift, provide static poster fallback, maintain accessible focus after route transitions.

## 0.7 Import Script [CONFIRMED FEATURE; formats remain OPEN]

- Offer `Import Script` on signed-in home and an import route under the chosen project; allow user to create/select an eligible project first.
- Clearly list only tested formats, validate file type/content/size, parse to nine screenplay semantic elements, show a meaningful preview including scene count, warn about unsupported styling and preserve original file for the user's own records where appropriate.
- Require explicit user confirmation before creating a new draft or replacing/merging content; **never** silently destroy existing screenplay, anchored comments or production links. If automatic scene mapping is ambiguous, require human selection or create a fresh draft with no unsafe production links.
- Initial format support must be established via tests. Do not claim `.fdx`, `.celtx`, PDF or DOCX support based solely on an upload widget; native/proprietary formats may need separate implementation or licensing review. No external content should execute as HTML/script on import.

## 0.8 Design references, treatment and asset handling

The owner-supplied / previously generated reference assets in this conversation, **not auto-imported into a Codex repository**, include:

- `preframe_camera_frame_logo.png` — working logo mark.
- `a_clean_cinematic_minimalist_landing_page_hero.png` — public landing direction.
- `a_wide_clean_ui_mockup_image_split_into_two_panel.png` — latest Free/Premium signed-in home **layout direction only**. Its remaining handwritten captions, sample projects, dates and tier copy are illustrative; the current text-free schedule-adjacent creative area and approved greeting take precedence.
- `preframe_screenplay_editor_light_and_dark_modes.png`, `preframe_shot_list_light_and_dark_modes.png`, `preframe_storyboard_dashboard_light_dark_modes.png`, `preframe_production_schedule_light_and_dark_modes.png`, `preframe_calendar_light_and_dark_modes.png`, `preframe_call_sheets_light_and_dark_modes.png`, `preframe_locations_light_and_dark_dashboard_views.png`, `preframe_docs_notes_light_and_dark_modes.png` — **structure references only**. Ignore the old dark-half theme; reproduce their tool information architecture with the updated Preframe light/eye-saver identity.

If Codex needs pixel-level reference, provide the selected image files separately in `docs/ui-references/`. The Markdown alone cannot embed those file bytes. Do not publish mockups containing fake names/addresses/phone numbers as real product content.

## 0.9 Website essentials and release checklist [ALL NEED TEST EVIDENCE]

These 17 checks are required: (1) no unintended page-level horizontal scrolling; (2) appropriate public meta descriptions; (3) branded favicon; (4) descriptive titles; (5) image compression and thumbnail behavior; (6) clickable support email; (7) no broken navigation/actions/links; (8) usable mobile navigation; (9) no production placeholders/fake sample content; (10) testing on actual mobile devices; (11) informative empty states; (12) functional mobile layouts, forms and writing; (13) no accidental mobile overflow; (14) clear error/sync/quota messages; (15) accurate success/save messages; (16) meaningful 404 plus forbidden/deleted project cases; (17) `tel:` links for actual contact numbers. A table's *internal* horizontal scroll is permitted and preferable to illegible compressed columns.

Preframe-specific release blockers: authorization/RLS including private image URLs, secure Google sign-in, quota enforcement under concurrency, no silent lost edits, truthful local-vs-cloud save indicator, tested restore, multilingual PDF export, correct selected-text comment anchors, complete project exports, safe script import, unchanged published call-sheet versions, accessible keyboard/focus/contrast, eye-saver and reduced motion, measured usage under a documented 100-account pilot, privacy policy/terms and practical data deletion/export workflow, and no visible Premium purchase path until business terms and payments are implemented.

---

# Part I — Product requirements and acceptance criteria

**Status:** Requirements baseline; OPEN items are not authorized product claims.
**Product name:** Preframe (working brand; trademark and domain not verified).

## 0. How Codex must use this document

1. Treat **CONFIRMED** statements as requirements. Treat **PROPOSED** as a design starting point requiring validation, and **OPEN** as unresolved; do not silently choose a business-critical answer.
2. Implement in small, testable vertical slices. Do not generate the entire product in a single pass or claim a module is finished merely because a screen exists.
3. Maintain a requirements checklist and an architectural decision record. For each slice: inspect the repository, propose the smallest coherent change, implement, run relevant automated tests, report actual results and remaining gaps.
4. No placeholders masquerading as complete features, no invented production data, no fabricated integration credentials, and no client-side-only enforcement of paid limits or access control.
5. Protect user work above all else: avoid silent overwrites, silent data loss, and accidental cross-project access.
6. If a detail is underspecified, choose a reversible, low-cost implementation where possible and record it; stop for a product decision if the choice affects pricing, user ownership, permissions, or data loss.

## 1. Vision, audience and platforms [CONFIRMED]

Build a responsive, browser-based film pre-production workspace for the owner's productions, independent filmmakers, and student crews. Desktop is the primary writing/planning workspace; mobile must support useful viewing and editing on set. The website covers development through the shooting day, not editing/post-production or AI image generation.

Inside each film project, the approved functional hierarchy is:

- **Write:** Screenplay; Docs & Notes.
- **Visualize:** Shot Lists; Storyboards.
- **Plan:** Production Schedule; Calendar; Call Sheets; Locations.

Design direction: professional traditional screenplay experience, minimal independent Preframe brand, dedicated full-page workspaces, responsive navigation, and restrained cinematic motion. Follow the updated landing, signed-in home and project shell in Part 0; never copy StudioBinder or any proprietary screen pixel-for-pixel.

### Non-goals for initial release

- No text-to-image or AI-generated storyboards/shots anywhere in the website.
- No native iOS/Android application required; responsive website only.
- No video hosting/transcoding; storyboard video reference may be an external link, subject to safe URL validation.
- No promise of real-time Google Docs-style co-editing in the initial release.
- No built-in marketplace, public film discovery, budgeting module, casting marketplace, or post-production tracking without later approval.

## 2. Domain model and integration principles [CONFIRMED]

One **Film Project** owns the screenplay, notes, shot lists, storyboards, schedule, calendar entries, call sheets, locations and collaborators. These are integrated views of consistent underlying information, not isolated documents copied between tools.

**Identity rules:** Give projects, screenplay drafts, scenes, shots, storyboard frames, schedule entries and call-sheet versions stable IDs. Human-facing scene numbers and shot order may change; references must not break simply because a scene is renumbered or rearranged. A scene can have several shots and storyboard frames. A scene may be scheduled on multiple days. One shooting day may contain many scenes and locations. One actor may play multiple characters; characters and actors are distinct entities.

**Change propagation:** Changes to scene heading/location, participating characters, props or other breakdown information must surface an impact/needs-review flag in related schedules and unpublished call sheets, rather than silently changing already published documents. The calendar and production schedule share the same scheduling records. A published call sheet is an immutable version/snapshot; revisions produce a new version.

## 3. Global UX and access [CONFIRMED except where noted]

- Responsive desktop/mobile application with project dashboard, intuitive module navigation, loading/empty/error states, keyboard navigation, and explicit save/sync feedback.
- Google account sign-in for identity. Google sign-in does **not** store projects in Gmail or Google Drive. Project recovery depends on cloud data in our backend. Google Drive backup is a possible later integration, **not** an initial requirement.
- One default light interface (white / near-white and brand teal #43717F) and a user-controlled warm, lower-glare eye-saver mode. **No separate dark/black theme or dark-mode toggle.** Avoid medical claims about eye strain prevention.
- Minimal screenplay UI: scene navigator and comments panel must be collapsible; prioritize the writing surface. Screenplay page numbers and scene numbers.
- Users must see whether edits are saved locally, syncing, synced, or failed. Never label unsynced content as cloud-backed.
- Text, buttons, focus, contrast, and touch targets should be accessible. Use Unicode-compliant input controls and appropriate font fallback.

## 4. Write → Screenplay editor [CONFIRMED]

### 4.1 Screenplay element system

Support nine first-class paragraph/element types with screenplay-specific formatting and semantics:

1. Act
2. Scene Heading
3. Action
4. Character
5. Dialogue
6. Parenthetical
7. Transition
8. Shot
9. Text (general text)

Proposed default shortcut mapping from the user's example: **Ctrl+1 through Ctrl+9**, in the order above. This is **our proposed mapping**, not a verified claim about Celtx. Browser/OS conflicts require a customizable shortcut map or alternate shortcuts; mobile uses a visible formatting menu. Dropdown and shortcut changes must transform the current screenplay paragraph, not merely change its visual CSS class. Support predictable Enter/Tab behavior between relevant types, with user-overridable formatting. Character names may offer autocomplete based on names already in the draft; this is optional for the first slice, not a finalized requirement.

### 4.2 Required writing behavior

- Professional, paginated screenplay-oriented editing view; accurate element indentation/alignment; page numbers and optional scene numbers.
- Scene navigator generated from scene headings; click to jump. Renumbering must not break linked production data.
- Undo/redo; robust cursor movement, selection, copy/paste, and composition input (IME). Auto-save with local-first immediate durability and carefully throttled cloud synchronization.
- Screenplay export to PDF with correct international text shaping and font embedding/fallback; test actual multilingual output rather than assuming browser display implies correct PDF output.
- Support all world languages as a **design goal**, including mixed scripts within one sentence and right-to-left languages; document tested languages/scripts and limitations rather than claiming universal quality without testing. At minimum, test mixed English–Telugu plus one RTL script and an East Asian script.
- No fixed English-only capitalization applied to scripts for which that is inappropriate.

### 4.3 Inline text comments

Select any word, sentence, or passage and choose **Comment**; attach a thread to precisely that text. The corresponding passage remains visibly marked, and a collapsible margin/panel displays comments. Support creating, replying, resolving, and, subject to permissions, editing/deleting comments. Comments must not appear in a normal screenplay PDF unless a separate annotated export is deliberately offered later.

**Technical invariant:** An anchor must survive reasonable edits or be explicitly marked as unresolved/orphaned. Never silently attach a comment to an unrelated sentence after deletion, insertion, or concurrent changes. Store draft ID, stable block reference and text range/anchor metadata with robust remapping or review handling.

### 4.4 Drafts and revision history [OPEN]

The user has **not** selected automatic history, named drafts, or both. Design the schema to support draft IDs and recovery, but do not present a finalized revision UI, retention policy, or unlimited history as confirmed. At minimum, protect against lost updates and enable manual project export.

## 5. Write → Docs & Notes [CONFIRMED at module level]

Create, rename, edit, and organize rich/plain-text project notes for story and production planning. Save locally and sync to the user's project where cloud access exists. Permissions follow project access. Exact document templates, attachments, comments-in-docs, nested folders and formatting controls are **OPEN**; do not invent a fully featured Google Docs clone.

## 6. Visualize → Shot Lists [CONFIRMED]

A scene-linked table with these fields from the second screenshot: **Image, Shot, Description, Shot Size, Shot Type, Movement, Est. Time**. Users can add, edit, reorder and delete individual shots; shots must link to stable scene IDs. Device-uploaded reference images only; no image generation from prompts. Maintain reliable count of shot **entries**, not count of shot-list files. Shots may exist without an image. Provide mobile-friendly card presentation of the same data when a full table would be cramped.

**Limit:** Free plan permits at most **50 active shot entries per project**, across all scenes and lists combined, not 50 separate documents. Archived entries release capacity; restoring one consumes capacity again. Enforce atomically on the server for any cloud operation, including imported project files.

## 7. Visualize → Storyboards [CONFIRMED]

A scene/shot-linked, reorderable card-based sequence from the third screenshot. Every storyboard frame includes **device-uploaded image (optional), Description, Sound Effects, Video Reference**. Video reference is a link/reference, not hosted video for initial release. Users can reorder, edit, and delete cards and associate them with a shot where applicable. No AI image generation. A frame may exist without an image.

**Limit:** Free plan permits at most **50 active storyboard frames per project**, across the full project. Capacity count is of frames, not storyboard documents. Archived frames release capacity; restoring one consumes capacity again. Server-enforced for cloud writes/imports.

### 7.1 Media strategy [PROPOSED pending real usage tests]

Compress/downsize images **on device before upload**; preserve user's full-resolution original on their device unless explicitly backed up in an exported project. Aim for around **6 MB of shared cloud image media per free project** as an initial engineering budget, **not an already approved contractual entitlement**. A project reaching 50 shots and 50 frames might require strong compression or image-less frames; display honest image-quality and quota feedback. Prefer modern broadly supported compressed formats with fallbacks; test text-heavy storyboard legibility and avoid destructive re-encoding on every edit. Use thumbnails and lazy loading. Never store raw images in PostgreSQL or claim local originals will reappear on another device.

## 8. Plan → Production Schedule [CONFIRMED]

The original Google Sheets prompt was for a **10-day** production, but the website must support arbitrary production lengths. Retain the requested **15 day-overview columns, in this exact order**:

1. Day (shoot day number)
2. Date
3. Scene Number(s)
4. Script Pages
5. Location
6. Time
7. Characters
8. Actors Required
9. Props Required
10. Costumes
11. Equipment Required
12. Priority — High / Medium / Low
13. Status — Not Started / In Progress / Completed
14. Backup Status — checkbox or equivalent verified state
15. Notes

A single day-overview row is **not** the unit of truth for individual scenes. Clicking a day opens scene-level schedule entries with scene ID/page range, setup duration, estimated shooting duration, planned start/end, location, cast/characters, props, costumes, equipment, priority, production status, continuity notes, and links to screenplay/shot list/storyboard. Day aggregates must derive from these records where possible, with editable day-specific notes and overrides where sensible. Explicitly model breaks and company moves as timeline events, not fake screenplay scenes.

### 8.1 Schedule status and completion

- Priority values: High, Medium, Low.
- Day status: Not Started, In Progress, Completed; scene/shooting-entry completion tracked separately.
- Footage backup verification is independent of scene/day shooting completion. Record backup destination and verification metadata if provided; do not infer a backup from a checked box alone if an actual verification workflow is available.
- A scene may be partially completed, postponed, unscheduled, rescheduled, or require reshoots. Do not mark it completed solely because the day's status is Completed.
- Warn about unavailable actors, overlapping actor calls, double-booked locations/equipment, impossible travel/setup gaps, and continuity issues when sufficient data exists. State when a conflict could not be evaluated due to missing data.

### 8.2 Dashboard and on-set UX

Dashboard displays: Total Shoot Days, Completed Days, Remaining Days, Total Scenes Planned, Total Scenes Completed, and a progress indicator driven by completed shoot days. Define unique scene-count semantics (scenes scheduled over multiple days count once in total planned; completed only on actual scene completion). Show upcoming day and flagged conflicts as useful extras.

Table should be mobile-friendly, printable/exportable, clearly styled with sticky/frozen headers on desktop, alternate row treatment, and status colors supplemented with labels. The Google Sheets row colors were Completed green, In Progress yellow, Not Started red; preserve recognizability but ensure accessibility. Support sorting/filtering without corrupting the persisted shooting order.

## 9. Plan → Calendar [CONFIRMED]

Month, week, and day views over **the same schedule records**. Show shoot days and useful schedule events (actor calls, locations, scene blocks, breaks, company moves); avoid maintaining a separate calendar copy. Rescheduling must check dependent commitments and mark affected call sheets as requiring review. Use project/location timezone explicitly; do not infer all productions run in one timezone. Date-only shoot days and timezone-aware timestamped events must be handled distinctly.

## 10. Plan → Locations [CONFIRMED at module level]

Per-project location records containing name, address/access instructions, contact and permission details, available dates/times, interior/exterior characteristics, travel/parking details, and safety/contingency notes where applicable. Link schedule entries and call sheets to location IDs, not duplicated free-text addresses. Visibility of personal contact details is permission-restricted. Map services, geocoding, weather API and automatically sourced hospital data are **not confirmed**; do not build dependencies on paid APIs or invent emergency information.

## 11. Plan → Call Sheets [CONFIRMED]

Generate an editable daily call sheet draft from the approved shooting schedule, adding necessary call-sheet-only fields:

- Project/production name; shoot date/day; general crew call and estimated wrap.
- Scene order and planned scene times; locations and address/access instructions.
- Individual cast calls, makeup/rehearsal requirements where specified; crew and department calls/contacts.
- Meal breaks, moves, parking/travel, important notes and special requirements.
- Weather/daylight information only if sourced and clearly dated; otherwise allow manual entry.
- Emergency contacts and nearest hospital only when verified/provided. Never fabricate.

Support preview, editing, printable/PDF export, publish/version, and clear status such as Draft / Published / Superseded. Published versions remain stable even if the schedule changes; affected versions receive an out-of-date warning and a new revision can be generated. Sharing mechanism for initial release (downloaded PDF, share link, email service, etc.) is **OPEN**; downloadable PDF is the minimum confirmed method.

## 12. Accounts, roles and collaboration [CONFIRMED / OPEN distinctions]

- Google sign-in, project ownership, and up to **three authorized editors per Free project, counting the owner** [CONFIRMED interpretation for build; verify wording in billing UI].
- Cloud-backed project recovery across devices is required; this supersedes the earlier exploratory idea of making Free entirely local-only. Free receives baseline cloud persistence; Premium may later add higher quotas or enhanced collaboration. Do not describe Free as local-only in product copy.
- Each project has an owner and membership records. Only authorized users may read/write project resources. Invite acceptance/identity handling must be secure; unaccepted invitations should not expose project data.
- Initial collaboration need not be character-by-character realtime. Use revision tokens/optimistic concurrency and user-visible conflict resolution; never last-write-wins silently for screenplays. Two editors may make changes on different devices; offline changes must be reconciled safely.
- Exact editor/viewer roles, owner transfer, guest access, limits on pending invites, and enhanced Premium realtime features are **OPEN**. Implement minimum owner/editor permission separation now, and make permissions extensible.

## 12.1 Owner-only Admin access [CONFIRMED]

Admin is an **account-wide privileged role**, separate from ordinary project roles (`owner`, `editor`) and commercial entitlements (`free`, `premium`). Provision exactly one owner UUID by a reviewed server-side/operator-only process after that owner signs in and the `auth.users.id` is verified. Implement immutable or privileged-only role assignment, forbid public/admin self-service writes, and test the negative case for every other authenticated account. All feature/limit bypass decisions must occur in trusted SQL/RPC or backend authorization, never by checking a badge or mutable client state. Enforce project privacy independently; `admin` enables the owner's own project creation and access to all features but is **not a blanket RLS bypass over every user's films**. Exemptions do not increase hosted-service quota limits. The Admin badge belongs beside the header avatar and in account settings; only the owner sees it.

## 13. Free and Premium product rules

### 13.1 Confirmed Free entitlement

- All filmmaking modules available: Write, Visualize, Plan. No feature-based paywall for the essential toolkit.
- **One active film project per Free account**; enforce through ownership policy and establish what happens when an account belongs to multiple projects. See OPEN decisions below.
- Maximum **three editors per Free project**, including owner.
- Maximum **50 active shots** and **50 active storyboard frames** per Free project.
- Google sign-in and cloud project recovery; automatic backend synchronization for basic editing.

### 13.1A Owner Admin entitlement [CONFIRMED]

The one designated owner has every implemented feature and no Free/Premium **application-level** project, editor, shot or storyboard caps in the owner's projects; the account is not billed as Premium to unlock features. Backend-enforced privacy and actual infrastructure capacity still apply. User and subscription administration is a separate future operator capability, not an automatic ability to view other filmmakers' private content.

### 13.2 Premium direction and prices [PRICES CONFIRMED; other terms OPEN]

Premium should allow more projects, more collaborators and higher shot/frame/storage allowances. Its signed-in home shows multiple projects and a dedicated Collaborate row directly below project cards, not a fifth tool card. Exact Premium caps, media quotas, provider, trial, concurrent-editing privileges and cancellation/expiry policy are **not finalized**. Do not advertise “unlimited” without documented limits/cost controls. Payment collection requires a server-verified provider integration, webhooks/idempotency, and an entitlement table, not client-side flags.

All prices below are in Indian rupees (INR), charged per subscription. The first-period price is introductory and must never be presented as the recurring rate.

| Plan | Introductory charge | Subsequent renewal |
| --- | ---: | ---: |
| Free | ₹0 | ₹0 |
| Premium Monthly, for a new Premium subscriber | ₹149 for the first month | ₹199/month |
| Premium Annual, during the first 30 days after official public launch | ₹999 for the subscriber's first year | ₹1,499/year |
| Premium Annual, after that launch window | ₹1,199 for the subscriber's first year | ₹1,499/year |

The official public-launch timestamp is an operator-controlled server configuration, currently **unset**. September 29, 2026 is a tentative owner target, not an approved launch timestamp. The launch-period offer is eligible only when checkout starts within the first 30 × 24 hours from the confirmed timestamp; the 30-day window must never start from a deploy, user signup, or client clock. Until the timestamp is set, use the standard ₹1,199 introductory annual price if annual checkout is later enabled. The introductory first period is for a **new Premium subscriber**: grant at most one introductory period per account across the Premium plans, and never reset eligibility by cancellation, re-subscription or switching plans. Existing annual subscribers renew at ₹1,499/year after their first billing year unless a later owner-approved promotion explicitly changes their terms. Apply the same first-month-only rule to Premium Monthly. Record the offered initial amount, currency, renewal amount, period, eligibility and effective promotion in an immutable server-side checkout record before sending the user to the provider. Honor the quoted offer only for a documented short checkout validity interval, and reject an expired offer for a fresh quote; exact duration remains an implementation setting. The provider's recurring mandate/subscription terms must match that record, and signed, idempotent provider events must be the source of paid entitlement. Client-supplied price, tier or Admin flags have no authority.

The Pricing page must display **Free — ₹0** and both Premium periods with introductory and renewal amounts clearly paired: **Premium Monthly — ₹149 first month; then ₹199/month**; **Premium Annual during launch — ₹999 first year; then ₹1,499/year**; **Premium Annual after launch — ₹1,199 first year; then ₹1,499/year**. Label the launch offer as available only during the configured window; outside that window show it as expired or explanatory, not an available checkout option. Before purchase, the checkout UI must plainly state the actual first charge, renewal amount, billing interval, and recurring billing terms. No pre-checked or concealed recurring consent. Pricing display is informational until the remaining billing decisions and provider integration pass tests.

### 13.3 Subscription downgrade [READ/EXPORT RETENTION CONFIRMED; allocation OPEN]

Do not delete content on downgrade or failed payment. Preserve read/export access to existing projects and pause writes above Free limits until usage is reduced or Premium is restored. Specify deterministic handling of which project stays active and which collaborators retain edit access **before enabling paid subscriptions**. The read/export retention and no-deletion rule are owner-approved; project and collaborator allocation remains unresolved.

## 14. Storage, offline use and data safety

### 14.1 Supabase initial deployment [CONFIRMED target; capacity is an assumption]

Target Supabase **Free** for development and approximately **100 initial registered users**. One backend project can serve multiple film projects; segregate data logically by project. Free quota availability can change. Verify current quota/pricing in the Supabase dashboard at implementation time. Do not promise that 100 users are guaranteed to fit regardless of usage; monitor file storage, database size, egress, auth activity and realtime connections.

### 14.2 Storage separation [PROPOSED]

- PostgreSQL: users/profiles, memberships, screenplay structured content, note content, comments/anchors, shot/frame metadata, schedules, locations, call sheets, quotas, billing entitlements.
- Supabase Storage: compressed uploaded shot/storyboard images, in private buckets with signed/authorized access.
- Device: fast editing cache and unsynced operation queue, optional local originals, manually exported portable backups.
- Browser-generated PDFs where technically feasible to avoid paying for server rendering; verify multilingual PDF fidelity before release.
- No raw binary media in database, no hosted videos for launch, no repeated full-document writes per keystroke, no eager downloads of all project images.

**Engineering budget:** Explore ~6 MB compressed media per free project as an initial target, while retaining ample service headroom. Quotas must be enforced transactionally; show user usage and graceful error messages. Do not imply 6 MB is enough for 200 high-detail images at arbitrary resolutions. Compression quality and minimum legibility must be tested using actual storyboards.

### 14.3 Local autosave, sync and recovery

Save locally as soon as practical, sync incremental changes/transactions after throttling, retry with backoff after network failures, preserve unsynced work, and show unambiguous status. Where an offline browser cannot reliably persist data, warn rather than claiming durable backup. On another device, signed-in users retrieve **cloud-synced** work only; device-only originals/unsynced edits will not magically transfer.

Provide full-project export/import with versioned schema and included uploaded media as a portable package. Import validates limits, file paths/types, ownership and IDs. Ensure a recoverable backup/export route independently of the operational database. Supabase Free should not be assumed to provide managed automated backups; decide how the operator will regularly back up and test restores before real shoots depend on the service.

### 14.4 Free-tier operations

- Monitor usage and set warnings at conservative thresholds (for example 60/80/90% of available storage and bandwidth).
- Use a reserved headroom budget for new accounts, database overhead, and emergency recovery. No unconditional claim of $0 total running costs: domain, frontend hosting, email delivery, backup storage, payment provider and overages may cost extra.
- Verify how project inactivity/pausing affects availability, and do not make launch reliability claims based solely on a hobby/free quota.

## 15. Proposed backend data model (schema design, not final SQL)

All project-owned tables carry `project_id`, appropriate timestamps and creator/update metadata; use UUID-like stable IDs and foreign keys. Minimize duplicated free-text data; store snapshots where historical immutability requires them.

| Entity/table | Important fields / relations |
|---|---|
| `profiles` | user ID referencing auth identity, display name, preferences; owner-only Admin status must come from a protected server-owned identity/role record, never an editable profile field |
| `projects` | owner ID, title, status, timezone, timestamps |
| `project_members` | project ID, user ID, role, membership status, invite metadata |
| `project_entitlements` | active plan, normalized limits and server-verified billing metadata |
| `screenplay_drafts` | project ID, title/version, content version, created/updated |
| `screenplay_blocks` or structured draft document | stable block IDs, element type, text/marks, ordered position, version |
| `screenplay_comments` and `comment_replies` | draft/block anchors, range/context, author, state, replies |
| `documents` | project ID, note title, content/version |
| `scenes` | stable scene ID, draft linkage, display number, heading, ordering, status |
| `characters` / `actors` / `scene_cast` | distinct story roles and people; availability where supplied |
| `locations` | location ID, name, permission/access/logistics, sensitive contacts |
| `shots` | scene ID, ordered shot number, size/type/movement, estimate, media ID |
| `storyboard_frames` | scene ID, optional shot ID, order, description, SFX, video URL, media ID |
| `media_assets` | project ID, private storage key, mime, dimensions, byte size, owner |
| `shoot_days` | project ID, day sequence, local date, status, notes, backup state |
| `schedule_entries` | day ID, scene ID nullable for non-scene events, time, durations, location, status |
| `schedule_resources` | entry-to-actor/prop/costume/equipment assignments, availability as needed |
| `call_sheets` / `call_sheet_versions` | day ID, draft/current status, published immutable snapshot, revision |
| `audit_events` / `sync_revisions` | critical changes, document version, actor, conflict metadata |

Do not assume these are the precise final table names. Where document storage is complex, choose a mature editor-compatible JSON schema and server-side versioning rather than fragile arbitrary HTML blobs. Index project IDs, scene IDs, date/order, and membership relationships. Avoid N+1 queries and unbounded document history.

### Owner-only Admin provisioning and test requirements

- Maintain a protected singleton owner UUID (for example a restricted `platform_owner` table or server-controlled setting) referencing `auth.users.id`; the database operator inserts it only after verifying the intended owner has signed in. Prevent a second active Admin and forbid `authenticated`/`anon` INSERT, UPDATE and DELETE on the owner mapping. No username/email matching as the authorization source. Handle service credentials only in secure operator tools.
- Expose an authenticated read-only `is_current_user_admin()` capability or equally safe entitlement endpoint for UI display. Server-side quota operations independently verify `auth.uid()` against that singleton and bypass **only application limits** for the owner's projects. Never accept `is_admin` or `plan` from the client.
- **Do not** write an RLS policy that grants the platform owner access to all users' private projects or buckets. Owner's own projects still use membership/project-scoped access; any future support access needs explicit authorization and audit logging.
- Test one approved Admin UUID, a different Google account, forged JWT/client flags, attempted role/entitlement mutation, direct REST and concurrent quota writes; show the owner badge only for the approved UUID. Document a manual, verified owner-account recovery/rekey process and a safe revocation procedure.

### Row-level security / auth invariants

- Enable RLS on every user-owned project table and restrict Storage paths/buckets by validated project membership.
- All write actions validate membership/role and resource quotas server-side. A user cannot change their own role, plan, project ID, media path or owner ID by editing a request payload.
- Do not expose service-role keys, payment secrets or privileged storage credentials to the client.
- Protect against cross-project ID enumeration, unauthorized URL sharing, malicious imports, and untrusted rich text/XSS. Validate upload MIME/content, size and safe file names.
- Ensure invitation and membership counts enforce limits atomically even for concurrent requests.

## 16. Suggested technical architecture [PROPOSED, not yet approved]

- TypeScript-based responsive frontend (framework chosen after repo inspection), mature editor framework capable of custom screenplay block schema, transaction-aware selections, input-method support, and comment anchors.
- Supabase Auth with Google provider; PostgreSQL + RLS; Supabase Storage private buckets. Narrow server-side functions or transactional SQL/RPC for quota/membership operations.
- IndexedDB or comparable browser persistence for local edit queue and caching; versioned export format for durable user backups.
- Design document sync as a separate layer; do not mix writing UI components directly with database calls. Use stable revisions and conflict-safe patches or per-block operations; test concurrent edits explicitly.
- Image processing in browser (orientation, resizing, encoding and size measurement). Verify thumbnail quality and uploads on Safari/mobile as well as Chromium.
- Use secure, idempotent backend billing integration only when pricing/provider are approved.

Avoid prematurely selecting a specific editor library, database representation or deployment host without a prototype that proves multilingual typing, comments, screenplay pagination and PDF output. These are the highest-risk technical constraints.

## 17. Delivery sequence and milestone acceptance

**Phase 0 — Proofs of feasibility:** Prototype screenplay element switching, English/Telugu mixed text, one RTL passage, text-anchored comments after edits, and faithful PDF output. Separately test mobile local persistence and image upload compression/legibility. Record real data sizes. Stop and revise architecture if these fail.

**Phase 1 — Secure project foundation:** Google sign-in; project creation; one-free-project validation; member invites and RLS; responsive project dashboard; basic backups and save status. Acceptance: user A cannot read/write user B's unshared project; re-login on another device restores synced project.

**Phase 2 — Write:** Screenplay block types/shortcuts, scene navigator, numbering/pagination, comments, Docs & Notes, PDF export; offline/local autosave, conflict handling. Acceptance: mixed-script typing and export work; comment anchors remain correct or explicitly orphaned following edits; two-device conflict cannot silently erase text.

**Phase 3 — Visualize:** Scene-linked shot-list table and storyboard cards; mobile layout, uploads, image compression, media quotas; no AI generation. Acceptance: exactly 50 active shots and 50 frames on free; 51st cloud insert rejected even via direct API/concurrent request; cross-device images visible when actually cloud-uploaded.

**Phase 4 — Plan:** Scene-level schedules, day overview 15 columns, production dashboard, calendar, locations, cast/resources, conflict indicators. Acceptance: one scene can span two days without double-counting planned scenes; calendar changes the same schedule record; status and backup state remain independent.

**Phase 5 — Call sheets / integrations:** Generate editable daily sheets and immutable published versions; PDF; dependency impact detection. Acceptance: schedule changes do not silently mutate a published PDF/snapshot; new version explicitly generated; no fictional weather/hospital details.

**Phase 6 — Hardening and pilot:** Test with real short-film projects and roughly 100-user load assumptions, including concurrent editors; monitor actual storage/egress/database usage; verify independent backups and restore; keyboard/mobile/accessibility/security tests. Publish limitations honestly. Premium/payments are a subsequent milestone until commercial terms are decided.

For every phase, Codex must supply: changed-file summary, schema migrations, tests executed and output, manual verification steps, known gaps, deployment/rollback notes, and whether Free-tier cost assumptions still hold.

## 18. Release-blocking test matrix

1. Auth/RLS: no unauthorized project access, including images and exports; invitations do not expose content prematurely.
2. Quotas: project/editor/shot/frame and media limits cannot be bypassed by simultaneous tabs, imports, direct API calls or manipulated browser state.
3. Persistence: refresh, sign-out/sign-in, device switch, offline/reconnect and browser storage clearing produce clearly documented recovery behavior; no false “Synced” state.
4. Concurrency: two editors touching same block, different blocks, and comments; no silent data loss or incorrect comment anchor.
5. Multilingual: English+Telugu within one paragraph, RTL text, East Asian text, IME composition, cursor/selection, printed PDF.
6. Schedule: duplicate scenes across days, company moves and breaks, actor conflict, timezone boundaries, calendar reschedule, call-sheet staleness.
7. Media: EXIF orientation, large upload rejection, decompression-bomb/invalid file handling, private access, thumbnails, mobile memory, import/export integrity.
8. User safety: project export complete, import lossless, backup restored on a clean environment, safe downgrade/read-only behavior once approved.
9. Performance: measure typing latency, save backlog, image egress and database size with representative projects; compare to live Supabase Free allowances.

## 19. Outstanding owner decisions — do not silently finalize

1. **Premium billing provider, precise project/editor/shot/frame/storage entitlements**, trial and cancellation rules; prices and periods are confirmed in §13.2.
2. Whether free users may **join multiple projects** while owning only one, and whether three-person limit counts pending invites or just active members.
3. Exact permissions: owner/editor/viewer, who can edit/publish call sheets, remove collaborators, and see cast contact details.
4. Screenplay draft/revision history model and retention policy.
5. Whether **6 MB compressed shared media per free project** is acceptable as a displayed limit after real-image testing; alternatives include lower frame resolution or optional user-controlled external storage.
6. Whether real-time co-editing is a Premium benefit or a later feature for everyone; current minimum is safe cross-device syncing, not simultaneous cursor-level editing.
7. Project import/export container format, import merge vs replace rules, and operator backup frequency/storage target.
8. Detailed Docs formatting, external video URL provider rules, and full call-sheet sharing method. Brand colors, working logo, home-layout direction and eye-saver-only policy are now confirmed.
9. Final editor library and production hosting provider after feasibility prototypes; React + TypeScript + Vite and Vercel are proposed, not proven deploys.

## 20. Immediate Codex handoff prompt

> Read this unified file fully. Do not build the whole website yet. First inspect the existing repository (if any), summarize confirmed requirements versus open decisions, identify the highest-risk technical unknowns, and propose a phased architecture and schema. Then implement only Phase 0 proof-of-feasibility: a screenplay editing prototype covering the nine element types, mixed English/Telugu text, one RTL case, anchored comments surviving edits, and a multilingual PDF export test. Provide test results, tradeoffs and a concrete Phase 1 plan. Do not invent Premium pricing, treat a screenshot as a license to copy branded UI, or claim Supabase Free can unconditionally serve 100 users. Seek approval before irreversible schema, billing or data-retention decisions.

---

**Source of requirements:** The owner's decisions, the three original production UI references, and the latest Preframe landing/dashboard reference images in this conversation. No external product's exact shortcut map, UI ownership, library compatibility, or live pricing is asserted as a verified fact in this document.

---

# Part II — Technical architecture and operations

**Status:** Proposed engineering blueprint, not implemented. Part I and Part 0 of this same file govern product and UI requirements. **Product name:** Preframe.

## 1. Architectural decision and constraints

Build one responsive TypeScript web app, backed by one Supabase project, with IndexedDB local write-ahead persistence and a deliberate, versioned synchronization layer. Ship feature modules as vertical slices, not independent mini-apps. Target roughly 100 initial registered accounts on Supabase Free **subject to real usage**, not a guarantee of capacity or uptime.

**Confirmed requirements:** Exactly one operator-provisioned owner-only Admin with all feature entitlements and application-level quota exemptions, but no blanket access to other users' private projects; Write (screenplay + docs), Visualize (shot lists + storyboards), Plan (schedule + calendar + locations + call sheets); Google sign-in; one active Free project per account; three editors per Free project including owner; 50 active shots and 50 active storyboard frames per Free project; cloud recovery of successfully synced work for Free users; responsive desktop/mobile; nine screenplay element types; mixed-language + RTL design goal; anchored comments; image uploads only, no AI image generation.

**Not decided:** Premium limits/provider and remaining billing policies, exact draft-history retention, whether a Free user can join multiple projects, precise role permissions, final editor library, final PDF engine, final frontend host. Premium prices and periods are confirmed in §13.2. Do not implement arbitrary policies as settled product decisions.

### Logical architecture

```text
Browser: responsive TypeScript app
  ├─ Module UI: Write / Visualize / Plan
  ├─ Domain layer: projects, scenes, assets, schedules, permissions
  ├─ Local repository: IndexedDB documents + pending operations + media cache
  ├─ Sync engine: revision-check, replay, retry, explicit conflicts
  └─ Export workers: PDF and complete portable project package
          │ user JWT / authorized requests
          ▼
Supabase project
  ├─ Auth + Google OAuth
  ├─ Postgres: relational records, structured screenplay, revisions, entitlements
  ├─ RLS + restrictive grants on every exposed project table
  ├─ Storage: private, compressed images only
  └─ narrow transactional RPC/functions: membership, quota and versioned writes
```

**No general-purpose custom API server is required for the first slice**, though hosted frontend delivery, backend database/Auth/Storage and some privileged transactions still exist. Avoid suggesting Google sign-in alone stores user projects.

## 2. Proposed technology selections and proof gates

| Layer | Proposed choice | Rationale / validation |
|---|---|---|
| Web | React + TypeScript + Vite | Static hosting, mobile-responsive app, straightforward client Supabase SDK. Inspect existing repo first; do not rewrite a functioning app merely to adopt these. |
| UI | Accessible, minimal component system with responsive CSS | Collapsible panels, keyboard access, default light and eye-saver-only themes; do not clone proprietary UI pixel-for-pixel. |
| Rich text | ProseMirror-based editor (evaluate Tiptap as an adapter) | Custom screenplay nodes, selections, transformations, anchor mapping. **Prototype before committing; inspect licensing and extension availability.** |
| Local persistence | IndexedDB via a thin versioned repository abstraction | Persist editing state and unsynced queue; test browser eviction, quota errors and mobile behavior. |
| Backend | Supabase Auth / Postgres / Storage | Shared identity/data and project recovery without maintaining dedicated infrastructure. |
| Authorization | Postgres RLS + grants + private Storage policies | All project data is private; client guards are only UX. |
| Backend mutations | Transactional Postgres functions/RPC for quota-sensitive operations | Count and insert under locks, refuse concurrent 51st entry or fourth member. Verify function execution grants and SECURITY DEFINER safety. |
| PDF | Dedicated export adapter, evaluated in Phase 0 | Mixed Telugu/English/RTL shaping, pagination and font licensing must be demonstrated; no blanket claim browser PDF is correct. |
| Tests | Unit + DB policy/integration + browser end-to-end | Editor invariants, access boundaries, quotas, mobile/IME and PDFs. |

**Phase 0 stop/go:** Type English + Telugu within one dialogue; test Arabic/Hebrew RTL and an East Asian IME; transform all nine screenplay blocks by menu/shortcuts; attach a comment to selected text and edit preceding text; paginate and export a legible, selectable PDF. If any fails, change the editor/export approach before building the backend around it. Verify shortcut conflicts with the browser/OS; keep alternate menu commands.

## 3. Repository layout (suggested, adapt to actual repo)

```text
src/
  app/               routing, authentication gates, shell, themes
  modules/
    screenplay/      editor schema, commands, navigator, comments, PDF adapter
    notes/           project documents
    shots/           scene-linked shot table
    storyboards/     scene/shot-linked storyboard cards
    production/      shoot days, schedule entries, calendar projections
    locations/       location records
    callsheets/      drafts, publication, PDF
  domain/            typed entities, validation, policy-neutral business logic
  data/
    local/           IndexedDB schema, queue, media cache, migrations
    remote/          Supabase repositories, typed queries/RPC clients
    sync/            revisions, retries, conflict resolution, state machine
  shared/            UI, utilities, errors, export/import
supabase/
  migrations/        reviewed SQL, tables, indexes, grants, RLS, functions
  tests/             positive and negative RLS/quota tests
  seed/              synthetic sample project only
 tests/              domain/unit and end-to-end tests
 docs/               ADRs, data dictionary, runbooks, acceptance evidence
```

Do not let UI components write directly to Supabase. UI → domain command → local transaction → sync service → authorized server mutation.

## 4. Canonical data model

All project-owned records carry `project_id`, stable UUID identifiers, audit timestamps, and appropriately scoped foreign keys. A human-facing scene number or shot order is **not** an identity key. Use composite unique constraints or composite foreign keys where necessary to prevent linking a scene or image from a different project. Archive/soft-delete semantics must be explicitly specified and consistently excluded from active quota counts.

| Table / model | Key fields and relationships |
|---|---|
| `profiles` | `user_id` references `auth.users`, display preferences; not authoritative for Admin role. |
| `platform_owner` (proposed) | Singleton verified `auth.users.id`; restricted operator-only insert/update/delete and read-only verified identity check. |
| `projects` | `id`, `owner_id`, `title`, `timezone`, `state`, `created_at`. |
| `project_members` | unique `(project_id,user_id)`, `role`, accepted status; invitation token hashes stored separately if needed. |
| `project_entitlements` | normalized plan, effective limits, billing state; server-managed only. |
| `screenplay_drafts` | `id`, `project_id`, label, revision, active; history retention open. |
| `screenplay_blocks` | `id`, `draft_id`, `project_id`, `element_type`, structured content, order key, revision. Preserve stable IDs. |
| `scenes` | `id`, `project_id`, source draft/heading block IDs, display number, order, extracted heading fields. |
| `screenplay_comments` / `comment_replies` | draft/block ID, selection anchors, context/quote, author, status, replies; orphan status. |
| `documents` | project-scoped docs/notes and revision. |
| `characters`, `actors`, `scene_cast` | distinct story characters and performers; actor availability where entered. |
| `locations` | name, contact/access, permits, availability, logistical/safety notes. |
| `media_assets` | uploader, private bucket/path, type, measured byte count, dimensions, asset state. |
| `shots` | `id`, `project_id`, `scene_id`, order, description, size/type/movement, duration, optional `media_asset_id`. |
| `storyboard_frames` | `id`, `project_id`, `scene_id`, optional `shot_id`, order, description, SFX, validated external video URL, optional media. |
| `shoot_days` | shoot date, sequence, status, independent backup status, notes. |
| `schedule_entries` | `day_id`, optional `scene_id`, type (scene/break/move/etc.), start/end, location, status. One scene can have several entries/days. |
| `schedule_resources` | entry-to-actor/prop/costume/equipment assignments; normalize resource types as needed. |
| `call_sheets`, `call_sheet_versions` | draft data, approved day ID, publication state, **immutable published JSON snapshot** and number, stale flag. |
| `document_revisions`, `audit_events`, `sync_operations` | optimistic concurrency tokens, idempotency key, actor/time, bounded recovery audit. |

**Scene count:** count distinct planned/completed scene IDs, not raw schedule-entry rows. **Shoot day completed:** explicit day status, not automatically inferred from a single scene. **Backup status:** independent of shooting completion. **Calendar:** projection of shoot_days + schedule_entries, not its own duplicate source of truth.

### Screenplay document model

Structured blocks with `type ∈ {act, scene_heading, action, character, dialogue, parenthetical, transition, shot, text}` and rich text runs. Keep scene identity separate from heading text; reconcile scene extraction in the same authorized mutation as the screenplay change or mark downstream data `needs_review` until reconciliation completes. Treat scene deletion/renumbering as controlled operations, never cascade-delete an entire production plan without explicit user action.

Comment anchor representation: `draft_id`, `block_id`, editor-native range/bookmark, quoted selection and adjacent context, anchor revision; map through transactions and mark ambiguous/deleted anchors **orphaned**, never auto-reattach to unrelated text. A note in the margin remains separate from PDF screenplay content.

## 5. Key workflows and invariants

### A. Creating a project

1. Google OAuth authenticates and establishes `auth.uid()`.
2. Transactional `create_project` checks the account's Free entitlement and permitted project ownership/participation rule (participation policy still OPEN), then creates the project and owner membership atomically.
3. UI creates the local project cache, navigates to dashboard, and shows confirmed cloud sync only after server acknowledgement.

### B. Editing a screenplay

1. Editor transaction updates in-memory state and commits a recoverable local snapshot/operation to IndexedDB.
2. Mark UI **Saved locally · Sync pending**, not Synced.
3. Debounced sync sends an idempotent patch or versioned block transaction with `expected_revision` and client operation ID.
4. Server checks membership/role and `expected_revision`; commits data, scene reconciliation and revision atomically, or returns conflict.
5. Acknowledgement advances local cursor and shows **Synced**. Network failure retains queue, retries with backoff and visibly warns on prolonged failures.
6. If two editors touch the same changed block, **do not overwrite**; provide comparison/manual reconciliation. Independent block changes may merge if the versioning proof supports it. No character-level co-editing promise in v1.

### C. Uploading an image

1. Validate file type and actual decoded dimensions in the browser; honor EXIF rotation; constrain pixel dimensions; encode a legible compressed image with measured bytes.
2. Reserve/check project media bytes in a server-side transaction, then upload into a private per-project object key; confirm actual object bytes before finalizing an active `media_assets` row.
3. On failure release reservation/garbage-collect orphan objects; prohibit client-declared byte counts from being authoritative. Use expiring authorized image URLs or equivalent authenticated access.
4. Download only visible thumbnails/selected full-size image; cache conservatively. Local originals are not cloud-recoverable unless intentionally included in a complete user export.

**Media cost tradeoff:** initial candidate is 6 MB shared compressed media per Free project, **not an approved public promise**. At 200 images this averages only ~30 KB/image, which may be illegible. Test representative storyboard frames and revise quota/quality assumptions before launch; do not silently degrade critical drawings.

### D. Scheduling / call sheet publication

1. Each `schedule_entry` points to stable `scene_id` and `shoot_day_id`; resource bookings detect actor/location/equipment conflicts and moves.
2. Day table and calendar read/write the **same records**. A scene can span multiple days and retain independent entry statuses.
3. Schedule changes create affected-document review flags. Call-sheet draft can be regenerated or manually edited.
4. Publishing makes a new immutable `call_sheet_versions.snapshot`; later schedule changes mark it stale without mutating or silently replacing the published version.
5. Export the published version to PDF with verified user-entered emergency/location details. Never invent weather, hospital or verified contact data.

## 5A. One-person Admin trust boundary

Treat the owner UUID as a separately protected platform identity, **not** `project_members.role = admin`, a user-selected subscription, a hardcoded email, or mutable browser storage. Only a controlled operator action may assign/rotate the single Admin identity. The browser can request its badge state, but protected database functions independently verify `auth.uid()` for every exempted quota or feature check. Grant no blanket project/media access to unrelated user content. Document how to revoke or recover the one Admin account securely; test that another Google user cannot claim the role through sign-up, account profile changes, guessed IDs, imports or API calls. Platform capacity limits still apply to Admin uploads and usage.

## 6. Authorization and abuse resistance

- RLS enabled and grants minimized on every exposed user/project table. Only project members may read relevant rows; only permitted owner/editors write. Audit **Storage `storage.objects` policies** for private media. Test as unauthenticated user, owner, collaborator, other project member and removed collaborator.
- No service-role keys, payment secrets, privileged database connections or OAuth client secrets in frontend bundles. Publishable client keys are not access control; RLS is.
- Membership invitation acceptance checks authenticated recipient identity; do not expose project content to unaccepted invites. Atomically enforce owner-inclusive three-editor limit (including simultaneous invitations/accepts).
- Atomic server enforcement: one Free active owned project, <=50 active shots, <=50 active frames, agreed media bytes, and project membership limit. Direct REST, two tabs, batch import, and raced requests must not bypass these limits.
- Prefer minimal, audited `SECURITY DEFINER` functions with fixed `search_path`, revoked broad execute grants, explicit `auth.uid()` checks and `project_id` validation. Do not trust client-supplied plan, role, revision or media size.
- Validate file signatures/MIME and dimensions; sanitize imported rich text and restrict outbound URLs; prevent stored XSS, cross-project reference injection, ZIP slip, decompression bombs and unbounded import.
- Contact information and invitation tokens are sensitive within a film crew: scope read access according to approved roles. Maintain delete/export account procedures before public launch.

## 7. Free-tier budget and operations

**Supabase published Free allowances at architecture drafting:** 500 MB database, 1 GB Storage, 5 GB uncached egress + 5 GB cached egress, 50,000 MAU. The service can pause Free projects after a week of inactivity; automatic database backups are not included. Confirm live dashboard limits at implementation/deployment. Sources: https://supabase.com/pricing and https://supabase.com/docs/guides/storage/serving/bandwidth .

| Capacity control | Proposed operating rule |
|---|---|
| Account count | Pilot at ~100 registered users; test realistic simultaneous sessions separately. |
| File storage | Compress browser-side, deduplicate where safely possible, avoid duplicate original+thumbnail by default; allocate <=~600 MB to all active media initially and reserve headroom. |
| DB space | Keep screenplays structured and revision history bounded, indexes purposeful, audit retention limited; track DB size weekly. |
| Egress | Lazy-load image cards, reasonable client caching, pagination and filtered reads; measure uncached vs cached separately. |
| Sync traffic | Debounce/coalesce edits, send patches/changed blocks, avoid entire-document update per keystroke and uncontrolled Realtime subscriptions. |
| Video | Link-only in initial release; no hosted video bytes. |
| Backups | Regular independent encrypted DB + media backups off the active project, and **tested restores**. Free Supabase is not a substitute. Operator backup cost may be nonzero. |
| Alerts | Warn operator at 60%, 80%, 90% of each quota; prevent unexpected uploads before exhaustion while retaining read/export access. |

**Never guarantee permanent $0 operations or 100 simultaneous active editors.** Supabase subscription may be $0 in the pilot, while host, domain, backups and future billing/email services may incur cost. Do not use activity pings to claim an SLA or bypass inactivity semantics; respond operationally to pauses.

## 8. Project export/import and restore

A portable, versioned package (candidate `.zip` containing `manifest.json`, screenplay blocks/notes/production JSON, and media files), created from a consistent synced snapshot plus explicitly identified local unsynced changes. Include per-file checksums, schema version, stable record IDs and no credentials. Clearly label what is **not** included (e.g. full-resolution device originals absent from cloud). Import in preview/dry-run mode; verify manifest, checksums, path safety, membership, target ownership, quotas and cross-references. Initial behavior: import as a **new project** only after confirming how the one-Free-project limit applies; never silently merge over an existing film or replace another collaborator's work. Record migration/rollback instructions for every schema change.

## 9. Release stages and measurable gates

| Stage | Deliverable | Cannot advance until |
|---|---|---|
| 0: feasibility | Screenplay + comments + multilingual PDF + 2-device mock sync + image compression benchmark | IME, anchors and PDF proven with tests; 6 MB media assumption tested. |
| 1: foundation | Google login, projects, RLS, ownership, invitations, local save, full export | Cross-project access denied; relogin restores synced work; failed sync visibly indicated. |
| 2: Write | Nine elements, navigator, numbered pages/scenes, comments, docs, PDF | Keyboard/RTL/IME tests pass; two-editor conflicts don't erase content. |
| 3: Visualize | Shots and frames with private media uploads | 51st shot/frame denied by DB even under concurrent attempts; private files inaccessible externally. |
| 4: Plan | Day overview, detailed schedule, calendar, locations | Shared records, correct distinct scene counts, date/timezone and resource-conflict tests. |
| 5: Call sheets | Editable drafts, immutable published snapshots, PDF | Changes flag stale published sheet; no fabricated emergency info. |
| 6: pilot | 100-account realistic usage, export/restore drills, operational dashboard | Storage/egress headroom, independent backups, security/accessibility tests and documented limits. |

Owner-only Admin provisioning, trusted entitlement checks and exclusive-role security tests belong in the foundation/auth phases, not in the later Premium billing phase. Premium billing is a separate later stage. Prices are specified in §13.2; do not activate checkout before entitlements, billing provider and downgrade policy are settled and verified.

## 10. Codex operating contract

At the start of **each** task, read Parts 0, I and II of this unified file, inspect current repository/migrations, and state the precise vertical slice. Before editing: list affected models/files, data migration and test plan. Implement the smallest coherent slice. After editing: run relevant unit, DB/RLS and browser tests; report commands and real results, changed files, quota effects, open decisions, and rollback instructions. Do not self-certify mobile/RTL/PDF functionality without executing appropriate tests. Do not invent cloud credentials or production test results.

### First Codex prompt (copy/paste)

> Read this unified document completely. Inspect the current repository before selecting frameworks or creating files. Implement **only Phase 0** as a disposable, testable proof of feasibility: nine screenplay paragraph types with a formatting menu and configurable keyboard shortcuts; mixed English/Telugu dialogue and RTL/IME smoke tests; a selection-anchored comment that survives preceding edits or becomes explicitly orphaned; page numbering and a multilingual PDF export spike; browser image-resize experiment with measured visual quality/bytes. Explain editor and PDF library licensing/limitations. Add runnable tests and report their exact results. Do not create billing, pretend live Supabase is configured, or generate the whole product. End with a concrete architecture decision record and Phase 1 migration plan.

## 11. Authoritative reference material (verify versions when implementing)

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage authorization: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase published Free quotas: https://supabase.com/pricing
- Supabase egress accounting: https://supabase.com/docs/guides/storage/serving/bandwidth

**Architecture status:** Proposed stack and schema, not a claim that the website exists or that all open product decisions are resolved.

---

# Part III — Sequential Codex development prompts

**Version:** 1.0 · **Use with:** this unified document · **Status:** Implementation sequence, not completed work.

## Instructions for Akhil — use this one unified file

1. Place **this single Markdown file** at `docs/PREFRAME_UNIFIED_SPEC.md`, and provide any image reference assets separately under `docs/ui-references/`. Commit the specification before starting. Use the same Codex workspace/repository throughout.
2. Run **one numbered prompt at a time**. Inspect Codex's changes and the actual test results. Do not advance because it says “done” without evidence.
3. Provide a development/test Supabase project and Google OAuth settings when the relevant phase needs them; never paste service-role keys into frontend code or commit secrets. If credentials are absent, Codex must prepare configuration and stop at a clearly identified live-integration gate, not invent a successful connection.
4. Treat **CONFIRMED** requirements as binding, **PROPOSED** choices as candidates to validate, and **OPEN** commercial/product decisions as unresolved. In particular, Free **does have cloud recovery** of synchronized project data; it is not local-only. Premium prices are decided in §13.2; provider, limits and remaining billing terms are unresolved.
5. Run Phase 0 first. If the screenplay editor or multilingual PDF approach fails its proof tests, adjust it before starting the database work.

### Shared preamble — paste at the beginning of every prompt

> Read `docs/PREFRAME_UNIFIED_SPEC.md` completely, including their CONFIRMED/PROPOSED/OPEN labels. Inspect the repository, previous phase's handoff, and existing tests before changing files. Do not overwrite working code or introduce parallel/disconnected stores. First give a short implementation plan listing affected files, schema changes, security impact, and acceptance tests. Implement **only the phase specified below**, in the smallest coherent vertical slice. Protect user work: no silent overwrites, deleted data, false “synced” indicators, bypassable quotas, or fabricated production data. Execute relevant automated tests; explicitly distinguish automated verification, manual checks, and untested behavior. End with a handoff containing changed files, commands and real results, outstanding issues/decisions, next-phase prerequisites, and rollback/migration guidance. Do not claim feature completion if only the UI exists.

---

## Prompt 00 — Repository audit and feasibility spike

> **Scope:** Phase 0 only. Inspect any existing app and document the actual stack and constraints. If starting from an empty repo, create the minimum runnable TypeScript prototype without a production backend. Prove a screenplay editing library (evaluate ProseMirror/Tiptap and licenses): nine real paragraph types Act, Scene Heading, Action, Character, Dialogue, Parenthetical, Transition, Shot, Text; menu transforms and configurable Ctrl+1–9 or nonconflicting alternatives; scene navigator; stable block IDs; normal cursor, selection, undo and composition. Implement a selected-text comment anchor and demonstrate that inserting text before the selection preserves its target or explicitly marks it unresolved. Test mixed English–Telugu in one dialogue, RTL Arabic or Hebrew, and East Asian IME. Create a browser/PDF export proof with correct page layout, selectable multilingual text and a documented font strategy; test the actual exported file. Benchmark browser resizing/compression on representative device-uploaded shot/storyboard reference images, measuring bytes and legibility under the **candidate** 6 MB/project allowance. Do not claim universal language coverage from a few samples. Supply a proof matrix (pass/fail/untested), license and PDF tradeoffs, architecture decision records, and a go/no-go recommendation. **Do not** build subscription, database or the full website. **Pass gate:** key input, anchor and exported-PDF proofs pass, or clearly stop and propose an alternative.

## Prompt 01 — App foundation and project domain

> **Scope:** Establish maintainable app skeleton only after Phase 0 go/no-go. Use the proven stack; do not replace an established repository needlessly. Create the four distinct route layers defined in Part 0: public landing, authentication, signed-in project library/home, and project-specific full-page workspaces. Build the approved Free/Premium home variants and the same-layout owner-only Admin avatar badge (no new admin dashboard) with no fabricated billing or sample counts, and a disabled/hidden demo CTA until a real video exists. Create responsive routing and a minimal dashboard with Write (Screenplay, Docs & Notes), Visualize (Shot Lists, Storyboards), Plan (Production Schedule, Calendar, Call Sheets, Locations). Implement default light theme and a single optional warm eye-saver mode (no dark-theme toggle), accessible navigation, empty/error/loading states and a desktop/mobile shell. Define typed domain models with UUIDs for project, draft, block, scene, shot, storyboard frame, shoot day, schedule entry, location and call-sheet version. Make scene ID immutable and independent of display number. Introduce repository interfaces for data access without in-component Supabase calls; include a synthetic example film clearly labeled sample data. Integrate the Preframe logo, teal #43717F, default white interface, eye-saver control, and reduced-motion support. Use the approved greeting; no unsolicited quotes, progress/overview widget, bottom plan banner, Templates or Archive. Include the approved Import Script entry point, initially showing an honest unsupported-format state until import is implemented. Global search must be truly functional for supported scopes or hidden. No fake functional buttons. Unit-test routing, identity invariants, layout and basic accessibility. **Gate:** app runs locally and can navigate every module's honest empty state; no feature is mislabeled implemented.

## Prompt 02 — Supabase schema and authorization

> **Scope:** Create reviewed SQL migrations and generated TypeScript types for the shared domain, not full UI. Implement auth-linked profiles, a restricted singleton owner/Admin identity mapping, projects, membership/invitation model, entitlements, screenplay drafts/blocks/scenes/comments, docs, character/actor relationships, locations, media metadata, shots, storyboard frames, shoot days/schedule events, call-sheet draft/version snapshots and audit/revision fields as justified by the architecture. Use stable IDs, project-scoped foreign keys and indexes. Enable and test RLS/grants on **every exposed project-owned table**; private Storage bucket policies must not permit cross-project downloads. Model minimum owner/editor roles, with unaccepted invites unable to read projects. Add transactional RPCs or other server-enforced operations for 1 Free active **owned** project, maximum 3 accepted editors including owner, 50 active shots, and 50 active frames. Explicitly document the unresolved policy for Free accounts invited to other projects; do not silently impose an arbitrary membership cap. Verify concurrency races (fourth editor and 51st item), direct REST attempts, and cross-project forged foreign keys. Harden privileged functions (fixed search_path, restricted EXECUTE, authenticated identity). Provision exactly one verified owner UUID via documented operator-only setup; protect the mapping against ordinary users and distinguish application-limit bypass from private-project access. Test forged Admin flags, second-account role takeover and private-project isolation. Include migration rollback and seed/fixture scripts. **Gate:** automated positive and negative authorization/quota tests actually pass against a local test backend; no service-role secret is bundled.

## Prompt 03 — Google login, project recovery, invitations

> **Scope:** Connect app to a real development Supabase project using environment variables, Google OAuth redirect flow, session restoration, sign-out, and project-scoped data access. Implement create/list/open project and safe invite/accept/remove editor flows enforced by Prompt 02 policies. Show the `Admin` badge only when the server verifies the designated owner UUID; all other accounts show their proper Free/Premium tier. Do not allow anyone to request Admin through Google signup or a client-side field. Free has **cloud persistence and cross-device recovery for successfully synced work**, even though Premium is a later commercial tier. Show meaningful auth and permission errors. Limit Free to 1 active owned project and 3 accepted editors **including owner**. Allow explicit privacy-safe invited-user workflows without exposing project data to nonmembers. Test login/logout and two-device project recovery; test unauthorized project access and revocation. If Google OAuth has not been configured by the owner, prepare setup steps and stop at a clearly reported integration gate. **Gate:** the same synced project can be recovered on a second browser and a removed editor is denied access.

## Prompt 04 — Local-first persistence, versioned sync and backups

> **Scope:** Implement IndexedDB durable local writes and a pending-operation queue behind the shared repository, with explicit `Saved locally`, `Syncing`, `Synced`, `Sync failed`, and `Conflict` statuses. Cloud writes need server-checked revisions; throttle/coalesce updates rather than writing a screenplay on every keypress. Preserve unsynced edits across reload/offline/reconnect; retries use bounded exponential backoff. Two editors modifying the same block must receive a recoverable conflict, never silent last-write-wins. Provide a versioned complete-project export with a manifest, structured content, media, checksums and an explicit warning for any excluded local originals/unsynced edits. Implement safe validation and preview for import; do not bypass the one-active-project quota, overwrite the original, or silently merge disparate project versions. If import policy is still undecided, implement export and import validation only, gated before final creation. Test airplane/offline mode, database write failures, two-editor conflicts, reload, corrupted archives, quota failures and restore in a **separate** test account/project. **Gate:** no lost edits under these tests; cloud recovery and local-only state are labeled accurately.

## Prompt 05 — Production screenplay editor

> **Scope:** Promote the Phase 0 editor into the actual project-bound Write module. Implement professional screenplay page layout with nine semantic elements, dropdown/keyboard transformations, predictable Enter/Tab behavior, page and scene numbers, navigator, collapsible comments margin, default light styling and optional eye-saver mode, mobile formatting controls, undo/redo, and local-first sync. Anchor selected-text comment threads to stable block IDs and mapped ranges; support replies/resolution and visibly flag orphaned anchors. Comments are excluded from normal PDF. Stable scene IDs must not change when headings move/renumber; propagate review flags rather than silently rewriting downstream planning. Provide tested multilingual PDF export with a documented script/font coverage list (including mixed Telugu–English, RTL and East Asian IME). Do not claim identical pagination to proprietary editors without evidence. Draft-history UX/retention is **OPEN**: support minimally safe draft identifiers/revisions, but don't invent unlimited automatic history. Test keyboard conflicts, selection mapping, concurrent edits, mobile, IME, Unicode, and actual PDF output. **Gate:** screenplay survives reload/second-device recovery and retains links/comments after renumbering. Import Script must have a scoped implementation plan and supported-format list; implement vetted import only after safe format mapping, file size/validation, author choice of new draft vs new project, and non-destructive preview are proven. Do not pretend to support proprietary formats not actually parsed.

## Prompt 06 — Docs & Notes

> **Scope:** Implement project-bound create/rename/edit/organize/delete-or-archive notes with local save, cloud sync, permission enforcement and basic accessible formatting. Keep the interface minimal; do not expand into an unrequested Google Docs clone. Apply the same conflict/sync status semantics as screenplay work. Avoid unapproved attachments, nested folder taxonomy, or a rich template marketplace. Test unauthorized read/write, offline edits, two-device recovery and export inclusion. **Gate:** a note created on one device reliably reappears for another authorized editor.

## Prompt 07 — Shot lists and storyboard frames

> **Scope:** Build scene-linked shot tables using the screenshot-required fields in this order: Image, Shot, Description, Shot Size, Shot Type, Movement, Est. Time. Implement add/edit/reorder/delete, responsive mobile cards and linkage by stable `scene_id`. Build scene/optional-shot-linked storyboard cards with uploaded image, description, sound effects, external video-reference URL, ordering and editable metadata. **No AI-generated images or text-to-image anywhere.** Uploads must come from the device. Compress and validate images client-side, store in private Supabase Storage, maintain actual measured byte quotas and prevent malicious file types, orphan objects and cross-project media access. The 6 MB media budget is an unapproved **candidate**; report Phase 0 quality results and stop for a decision if it cannot preserve legibility. A free project is limited to 50 **active shot entries total** and 50 **active storyboard frames total** across all scenes, checked atomically server-side (including concurrent creation, import and direct API). Test inaccessible media for nonmembers, storage exhaustion, upload interruption and 51st shot/frame. **Gate:** both views are functional and quotas cannot be bypassed from another browser.

## Prompt 08 — Locations and cast/production resources

> **Scope:** Implement project-owned location records: name, address and access, permission/availability, contacts, interior/exterior, parking/travel and safety/contingency notes. Add minimally sufficient characters, performers/actors, actor availability and production resources/props/costumes/equipment to support real scene scheduling. Keep story characters distinct from performers. Avoid inventing location addresses, hospitals, weather, geocoding, paid APIs or private crew contact details. Scope personal contacts to appropriate authorized project roles. Link resources to stable scene/project IDs, not only free-text labels. Test forbidden cross-project links, permissions and availability overlaps. **Gate:** location/cast information can be reused in schedules and call sheets without duplicating inconsistent copies.

## Prompt 09 — Production schedule and calendar

> **Scope:** Implement the canonical shoot-day and scene-level scheduling model; a scene can occur on multiple days and a day can include many scenes/locations. Expose a dedicated full-page schedule workspace with a genuine Upcoming Schedule preview on the signed-in home, reading the same data. The day table must show **exactly these 15 columns in order**: Day, Date, Scene Number(s), Script Pages, Location, Time, Characters, Actors Required, Props Required, Costumes, Equipment Required, Priority, Status, Backup Status, Notes. Include priority High/Medium/Low; status Not Started/In Progress/Completed; independent backup verification status; sorting/filtering without reordering stored shoot chronology, print/export and mobile detail layout. Add scene-level start/end, setup/shoot durations, time-zone handling, breaks, company moves, scene completion/partial/postponed/reshoot states, resources and continuity notes. Dashboard shows total/completed/remaining days, distinct planned/completed scenes and accurate completed-day progress. Month/week/day calendar must read/write the **same** schedule records, not a copied calendar dataset. Flag conflicts (actor/location/equipment/time/travel) when data permits; label unknowns rather than asserting no conflict. On changes mark impacted **unpublished** call-sheet drafts for review and published versions stale, without modifying published snapshots. Test two-day scenes, collisions, midnight/timezone edges, counting, mobile and concurrent rescheduling. **Gate:** editing a calendar event updates the day schedule and vice versa with no divergence.

## Prompt 10 — Call sheets and safe publication

> **Scope:** Generate editable draft call sheets from an approved shoot-day schedule, with production name/date, general call and wrap, scene order, actual location details/access, cast/crew calls, makeup, meals, parking, moves, notes and manually provided/verified emergency details. Never fabricate weather, daylight, hospital or emergency contacts. Preview, print and export to tested PDF. Publishing creates an **immutable versioned snapshot**; later edits to underlying schedule/locations flag that published version stale and allow a new revision, but never silently rewrite or retract a distributed sheet. Downloadable PDF is the required initial sharing method; emailing/in-app share links are open decisions. Test snapshot immutability, role restrictions, accurate timezones, missing critical fields and mobile preview. **Gate:** a previously published PDF remains reproducible after a schedule change.

## Prompt 11 — Free limits, Premium-ready entitlements and operator metrics

> **Scope:** Complete server-enforced free-entitlement pathways across all modules, plus owner-only Admin exemptions to application quotas checked independently on the backend: one active owned project, three accepted editors counting owner, 50 shots, 50 frames; all essential Write/Visualize/Plan tools and cloud recovery remain free. Add visible usage meters and graceful quota error handling. Implement an extensible **server-controlled entitlement schema**, using only the confirmed Premium prices in §13.2 and without inventing project/member/media caps, billing provider or cancellation behavior. Premium homepage may render for authorized seeded/test entitlements only; do not sell or promise it yet. No fake checkout. Collect privacy-conscious aggregate operator metrics for database size, Storage bytes, bandwidth/egress and failed syncs; make quota thresholds configurable (e.g. 60/80/90%) and produce a manual operator runbook. Test that the verified owner can use all implemented features and exceed app-level limits on their own projects, while another account cannot spoof Admin; test direct API quota bypasses, concurrent writes and downgrade/data-retention **design only** until commercial rules are approved. **Gate:** Free capacity and cost exposure are measured and an unapproved Premium tier is not for sale.

## Prompt 12 — 100-user pilot, security and release gates

> **Scope:** Audit and harden the integrated product instead of adding new features. Verify all 17 standard website checklist items in Part 0, every dedicated workspace, both home variants and mobile behavior. Run repeatable realistic load tests for roughly 100 registered accounts with an explicitly documented smaller/larger concurrency assumption; measure DB, storage, egress and response times. Prove real cross-project isolation (including Admin not automatically viewing others' projects), exclusive owner UUID role assignment, authenticated private images, no leaked secrets, safe archive import, XSS protections, browser/IME accessibility, mobile responsiveness, reliable multilingual PDF and protected failed-sync work. Create **independent, encrypted, tested-restorable** database/media backups outside the live Supabase project; document real operational costs and restore steps. Verify current Free quotas in the live dashboard rather than hardcoding a future guarantee. Document production environment setup, migrations, rollback, monitoring, incident response, privacy/export/deletion, and unfinished OPEN decisions. Use actual evidence for every pass/fail; do not claim 100 users fit if tests or headroom do not support it. **Gate:** publish a release checklist and a truthful go/no-go report; no public launch if backups/security/data-loss tests fail.

---

## Optional later prompt — Premium billing (PRICES SET; remaining gates OPEN)

**Do not enable a paid checkout until the owner explicitly finalizes** billing provider, Premium project/editor/shot/frame/media limits, whether Free invitees can belong to more than one project, cancellation/grace period and deterministic downgrade handling. Use the confirmed INR prices, first-period eligibility and renewal disclosures in §13.2. Implement server-verified checkout/webhooks with idempotency, safe entitlements, receipts, access control and downgrade tests. Never put payment-provider secrets in the client. Any operating cost quoted before measuring actual uploads/egress is a planning estimate, not a guaranteed $0 launch.

## Reusable review prompt — run after each implementation phase

> Audit ONLY the phase just implemented against Parts 0, I and II of this unified specification and the phase's acceptance gate. List each requirement as Pass / Fail / Untested with exact file references, test names and observed output. Independently test one successful path, one failure path, an unauthorized-user path, and a second-device/offline path when relevant. Inspect whether the implementation bypasses server-side limits or loses data under concurrent edits. Fix confirmed defects within this phase, rerun tests and report remaining risks. Do not expand scope or claim manual/browser tests ran if they did not.

## Owner decision register (not for Codex to guess)

- Premium payment provider, entitlements and cancellation/downgrade mechanics; prices are confirmed in §13.2. The owner-only Admin role and avatar badge are confirmed, not an open commercial tier.
- Policy for a free account invited to multiple projects; owner transfer/guest/view-only permissions.
- Automatic vs named screenplay drafts and retention.
- Actual cloud media allowance and representative storyboard quality after benchmarking.
- Initial frontend host/domain and recurring independent backup location/cost.
- Call-sheet distribution beyond downloadable PDFs.

**Order of operations:** 00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12. If a phase fails its gate, fix it before proceeding. The roadmap is not a claim that any code has been implemented.

---

# Part IV — Owner decisions, change control and handoff

## Still requiring an owner decision (do not infer from mockups)

- Premium payment provider; definitive project/editor/shot/frame/storage caps and cancellation/downgrade behavior. Monthly/annual prices are confirmed in §13.2. A Premium visual variant is a prototype, not a functioning paid plan until server-side entitlement and billing tests pass.
- Whether a Free user who owns one project may additionally join many other people's projects; precise limits on pending invites and viewer-only members.
- Automatic draft history versus named screenplay drafts and retention; which screenplay import formats are accepted and how imported scenes map to existing stable scene IDs.
- Actual per-project cloud-media allowance after benchmarking 100+100 images for real storyboard legibility; host/domain availability and independent backup provider/budget.
- Sharing workflow for call sheets beyond download; any advanced simultaneous editor collaboration and its paid/free allocation.

## Working protocol for Codex and Akhil

1. Put **this file** at `docs/PREFRAME_UNIFIED_SPEC.md`; optional images under `docs/ui-references/`. Codex must read all parts, inspect the actual repository, and note discrepancies before editing.
2. Start **only Prompt 00** from Part III. Demand concrete tests and a manual verification guide. Do not continue because code compiles alone.
3. Akhil tests the actual result, records Pass/Fail/Not tested, requests fixes and approves the phase. Then run Prompt 01, and so on through 12. A phase is complete only after its gate passes; preserve finished work.
4. For every phase deliver: changed files, migration details, test commands/results, screenshots or reproducible browser steps, accessibility/mobile/manual tests not performed, data-loss/security risks, rollback, Supabase Free quota implications and remaining OPEN decisions.
5. Before release, run the 17-point audit plus Preframe-specific gates from Part 0. Never present images, illustrations, sample projects or anticipated hosting URLs as deployed products.

### Copy/paste first instruction to Codex

```text
This repository is for PREFRAME. Read docs/PREFRAME_UNIFIED_SPEC.md IN FULL; it replaces all older product, architecture, and prompt documents. Treat Part 0 as the latest UI/brand and navigation contract, Part I as product requirements, Part II as proposed architecture, and Part III as sequential implementation prompts. OPEN items are not decisions. Inspect the existing repository and implement ONLY Prompt 00. Test actual multilingual typing, text anchoring, PDF output and image compression, then give me proof, manual test steps, and unresolved questions. Do not proceed to Prompt 01 or deploy without my approval. Do not implement dark mode or any fake Premium pricing, quota, content, demo video or feature button.
```
