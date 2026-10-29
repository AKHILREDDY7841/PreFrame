# PREFRAME device app — 2026-10-29

Installable PWA for Windows (Chrome/Edge), Android (Chrome) and iPhone/iPad (Safari, Share → Add to Home Screen). This release is not an EXE, APK or App Store binary. The installed app has its own launcher/window and caches its application files for offline use. Initial loading/sign-in requires internet; public Google signup must be enabled in the existing Supabase Auth project.

Projects, embedded images, notes, screenplay history and covers are stored in IndexedDB on the device, scoped by the signed-in Auth user ID. No app telemetry, presence, remote database queries or media uploads are made by the device app. Supabase retains authentication accounts/sessions only. Login and token refresh still require the authentication service. Previously signed-in users can reopen offline on that device. Sign-out removes the offline identity, not their local work. Local storage is not encrypted by PREFRAME; the OS/browser profile is the security boundary.

Free baseline: one project including recycle bin, screenplay with scene navigation/formatting/PDF import/printing, rich Docs & Notes with local pasted images/resizing, 50 shots, production scheduling, CSV and complete local JSON export/restore. Storyboards, Calendar, Call Sheets, Locations and collaboration were archived paid features and are absent from this release. There are no subscriptions, upgrades, price prompts or admin-only restrictions.

Projects do not sync between devices. Export a complete backup from Project settings and restore it into the project on the destination device/account. Embedded assets travel in the backup. Clearing browser/app storage, uninstalling with data removal, device loss or storage eviction can remove projects. Request persistent storage and keep external backups. Persistent storage depends on browser support and is not a substitute for backup.

Backend migration 202610290016_auth_only_local_app.sql replaces the owner-only signup trigger with an authentication-only trigger and revokes retired cloud app table/RPC access for all browser roles. It preserves existing authentication users and configuration. Do not drop Auth schemas or provider identities. Do not delete cloud media using SQL metadata deletion; use the supported Storage API if any objects exist.

Verification: production TypeScript/esbuild compile; regression suite; separate browser fixture for actual IndexedDB isolation, project cap, save/reopen, backup/restore, recycle recovery, and 50-shot limit. Test fixtures are not published. Physical Android/iOS installation must be checked on those devices; viewport emulation alone cannot prove mobile installation.

Install references: https://web.dev/learn/pwa/installation and https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/ .
