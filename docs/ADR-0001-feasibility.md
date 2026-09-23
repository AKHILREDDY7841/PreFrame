# ADR 0001: Prompt 00 editor and export feasibility

## Decision

Use ProseMirror (MIT license) for the feasibility spike. It has typed document nodes, transaction mappings, undo/history, DOM composition handling and a permissive license. Tiptap is also MIT, but is a wrapper around ProseMirror and would add an abstraction before this prototype proves the lower-level behaviors.

Nine block node types store a persistent `id` attribute. Comments store that stable block reference, ProseMirror document positions and the selected quote. Each document transaction remaps anchor positions and refreshes the mapped block reference. If the mapped range no longer contains the original quote, the UI calls it orphaned rather than attaching it to different text.

## PDF trade-off

The prototype uses Chromium print CSS and Chromium's PDF engine. It creates selectable text and uses Windows font fallback for Telugu, Arabic, Japanese and Korean. This is browser-dependent, is not a claim of universal script coverage, and does not promise parity with proprietary screenplay pagination. A production implementation must package and license explicit web/PDF fonts before cross-platform release.

## 6 MB benchmark policy

The compression control makes a local JPEG candidate at a 1600 px maximum edge and 0.78 quality. Its result is evidence only; the 6 MB amount remains an unapproved engineering hypothesis. The available test image is a text-heavy supplied UI reference, so a photo/storyboard corpus is still required before choosing a real allowance.
