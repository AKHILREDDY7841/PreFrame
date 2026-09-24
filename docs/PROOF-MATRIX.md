# Prompt 00 proof matrix

| Requirement | Status | Evidence |
|---|---|---|
| Nine real paragraph types | Pass | `src/prototype.ts`, menu and ProseMirror schema; built at `prototype.html` |
| Shortcuts and configurable alternative | Pass | Ctrl 1-9 / Alt+Shift 1-9 control |
| Navigator and stable scene ID | Pass | `scene-7c2d` in `src/prototype.ts` |
| Anchor preserved/orphaned | Pass | `test/model.test.mjs` |
| Undo, selection, composition | Partially tested | ProseMirror history and native DOM composition are wired; physical IME composition remains a manual test |
| Mixed Telugu, RTL, East Asian input | Partially tested | Browser seed and rendered PDF include Telugu, Arabic, Japanese and Korean; physical IME composition remains a manual test |
| Selectable multilingual PDF | Pass with Arabic extraction limitation | Chromium generated a one-page PDF; `pypdf` extracted Telugu and Japanese; Arabic rendered correctly but extracts as presentation forms rather than the logical source string |
| Browser compression benchmark | Pass with corpus limitation | Supplied 249.0 KB 1536×1024 image became 147.8 KB at 1600 px/0.78 JPEG, 40.7% smaller; it estimates 41 similar images per 6 MB |

## Go/no-go

Conditional go for Prompt 01: the key input, anchor, browser, PDF and compression proofs passed. Before production implementation, repeat the compression benchmark against a real photo/storyboard corpus and choose licensed bundled fonts for a cross-platform Arabic/PDF strategy. This spike contains no backend, authentication, subscription, database, or later routes.

The original Prompt 00 browser proof remains isolated at `prototype.html`. The later app shell is a separate entry point. Historical PDF and compression evidence reflects the earlier browser run; repeat the script and physical IME checks before treating cross-platform behavior as verified.
