# PreFrame functionality and readability pass — 2 October 2026

## Loading failures and their causes

- Storyboards, Calendar, Call Sheets and Locations were rendered for entitled accounts but excluded from workspace initialization. All supported tools now initialize, subject to the existing entitlement gate.
- Admin preview displayed loading metrics despite having no authenticated user. It now shows Unavailable with an explicit local-preview explanation.
- Preview navigation lost the selected Premium/Admin plan when the URL no longer contained the home parameter. The preview plan now persists within the browser session; cloud permissions still come from authenticated identity.
- Recycle bin preview unnecessarily queried cloud data. It now displays a local-preview empty state.
- Unbounded HTTP/auth/tool waits, blocked IndexedDB upgrades, failed invitations and realtime refresh errors lacked complete recovery handling. HTTP waits are bounded at 25 seconds, tool record loads at 20 seconds; failures leave loading, show readable errors and provide Retry where data is loaded.
- Schedule and activity queries previously delayed or failed the entire homepage. They now load independently after projects/home render, each with its own loading, success/empty and retryable error state. Nonessential expired-project housekeeping no longer delays the project list.
- Late route responses and same-route workspace remounts could replace newer content. Render generation checks, captured DOM identity and disconnected-node guards now ignore stale UI responses.
- Item creation errors are caught, and failed collaborator refreshes leave the existing editor intact with a readable status.

## Real data and unavailable integrations

- Active projects: repository query for accessible, nonarchived projects (local sample data in preview).
- Collaborator seats: unlimited admin entitlement, not a fabricated count of current members.
- Storage used: protected admin_workspace_metrics RPC sums metadata sizes in the project-media storage bucket.
- Registered users: protected RPC counts application profiles, not a claim about all Supabase Auth accounts.
- Active users: authenticated sessions send a visible-tab heartbeat every minute. The existing protected RPC counts distinct users seen within ten minutes. It is independent from metrics fetching and is not limited to admins.
- Metrics refresh automatically every minute and have a manual Refresh metrics action. Errors show Unavailable; preview never displays fabricated values.
- Remaining storage capacity/percentage is unavailable because the current protected backend does not expose the Supabase plan quota. No management credential or service-role key was added to the browser.
- Live anonymous RPC verification returned HTTP 401, permission denied. Private successful values require a signed-in admin session and were not verified in this preview session.
- Invite codes require the existing server RPCs and authentication. Preview explicitly disables invite/join submission. Premium checkout remains an existing coming-soon integration; pricing remains ₹49/month and ₹499/year.

## Back navigation

- Shared app-navigation.ts provides Back markup, safe fallback selection and same-origin application-history validation.
- Back is present on Projects, shared projects, Settings, Recycle bin, Collaboration, Import, project overview and all eight project tools, plus nested error/Premium-gate surfaces.
- Internal route changes use native pushState with the previous internal application URL. Back normally uses browser history; direct-entry fallback is tool → project overview → Projects → Home. External, authentication and unknown routes are excluded. Native browser Back remains supported through popstate.
- Tool headers use a three-column grid: Back left, Tools centered, project overview right. Old absolute top/right/translate positioning was removed from this row. Bespoke duplicate Back links were removed.

## Typography and responsive layout

| Role | Previous common size | New scale |
| --- | --- | --- |
| Main interface body / inputs / navigation | 12–14px | 16px |
| Controls / labels / supporting copy | 10–13px | 14px |
| Metadata | 9–11px | 13px |
| Internal page titles | 17–19px on tools | 30px desktop / 24px mobile |
| Section headings | 12–16px in some tools | 20–24px by role |

Shared rem tokens live in styles.css. Existing interface rules were normalized to those tokens, including table, calendar, Home, forms and surrounding editor controls. The screenplay's 12pt Courier content and Docs & Notes document content were not globally enlarged. Screenplay sheets remain 816×1056 CSS pixels. Document text keeps its existing font.

Mobile controls wrap as full buttons rather than narrow squeezed columns. Collection cover images now fill their cards. Collaboration choices stack. Tools closes through its close button or Escape, returns focus to Tools, and its hidden navigation is inert. Menu header controls fit inside the shared flex row. Admin metric fallback text fits its grid. The Free hero quote has readable contrast. The Premium badge no longer truncates a long preview label.

The Home dashboard now stacks at 1100px using one shared breakpoint for both the main grid and its schedule/activity columns. Removed the conflicting legacy breakpoint that split a narrow right column into two cards. This fixes overlap at intermediate desktop widths.

A standard-width screenplay retains its internal horizontal document scroll on narrow screens; it is not reformatted into a narrow screenplay sheet.

## Verification

- Build + TypeScript: pass.
- Automated tests: 33 pass, 0 fail. Five new tests cover safe internal Back history, direct-entry fallbacks, successful/rejected/hung requests and caller cancellation.
- Source whitespace check: pass.
- Lint: no lint script is configured in this repository.
- Visual inspection: Home in Free/Premium/Admin preview; Projects, shared projects, Settings, Recycle bin, Collaboration, project overview, Import; Screenplay, Docs & Notes, Shot Lists, Storyboards, Production Schedule, Calendar, Call Sheets and Locations.
- Responsive checks: Admin Home and all eight tools at 1920×1080, 1600×900, 1440×900, 1366×768 and 1280×720; mobile tools/collections at 390×844. All 40 desktop tool checks settled and showed Back with no page-level horizontal overflow. Wide production tables retain their own scroll areas.
- Interaction checks: storyboard creation, location creation/edit/reload persistence, call-sheet creation, actual previous-page Back, Tools open/close/Escape/focus return. Preview browser error/warning log was empty at inspection.
- No production test records, invitations, payments or account mutations were created during QA.

## Changed files

src/app.ts, src/app-navigation.ts, src/request-state.ts, src/cloud.ts, src/home-content.ts, src/studio-shell.ts, src/tool-ui.ts, src/tool-data.ts, src/local-repository.ts, src/collaboration-page.ts, styles.css, studio.css, test/navigation-loading.test.mjs and this report.

## Remaining limits

Private admin metric values, authenticated collaboration and server-side permission combinations need an authenticated session to validate end to end. Storage quota and subscription checkout remain unavailable integrations and are explicitly represented as such. The visual/functionality checks above do not constitute a guarantee that every possible production state is error-free.
