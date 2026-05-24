# Refactor Status

This document tracks the controlled refactor for GitHub issue #36, **Refactor disc editor foundation before more feature work**.

## Current Assessment

The emergency refactor is **well past the danger point but not fully complete**.

The highest-risk work has already been completed and smoke-tested locally: project file helpers, shared types/utilities, PNG export extraction, clean lint baseline, and the first sidebar panel extractions. The app still launches locally and the current disc-label workflow appears intact.

A fair status estimate is **about 75-85% complete for the emergency issue**.

The issue should not be closed until the remaining large `App.tsx` UI regions are either extracted or explicitly deferred with a clear reason.

## Completed Refactor Work

- Deduplicated disc text type declarations by importing shared types from `src/discText.ts` instead of redefining them in `App.tsx`.
- Added a shared `bytesToBase64` utility and removed duplicate byte-to-base64 conversion logic from Steam and local artwork modules.
- Extracted saved-project schema/type definitions into `src/project/projectTypes.ts`.
- Added `src/project/normalizeProject.ts` as the landing point for project JSON normalization and future migrations.
- Added frontend Tauri file wrappers in `src/tauri/fileSystem.ts` for project reads, project writes, and binary file writes.
- Extracted PNG export rendering from `App.tsx` into `src/export/` modules.
- Moved canvas/image helpers into `src/export/canvasImage.ts`.
- Moved Steam banner export rendering into `src/export/drawSteamBanner.ts`.
- Moved disc text export rendering into `src/export/drawDiscText.ts`.
- Moved export guide and outline rendering into `src/export/drawExportGuides.ts`.
- Replaced impure toast ID generation with a stable ref-backed incrementing ID so lint now has a clean baseline.
- Extracted these sidebar panels into presentational components while keeping state and handlers in `App.tsx`:
  - `ProjectPanel`
  - `ExportOptionsPanel`
  - `TemplatePanel`
  - `GuideLegendPanel`

## Current Validation Status

Recent checks reported during the refactor sequence:

- `npm run build` passes.
- `npm run lint` passes.
- Local app smoke test passes after pulling main.
- Export behavior was locally checked after the export extraction and nothing obvious broke.

## Remaining Work Before Closing Issue #36

These items should be completed before calling the emergency refactor finished:

1. Extract the remaining sidebar panels from `App.tsx`:
   - `GamePanel`
   - `ArtworkPanel`
   - `BrandingPanel`
   - `TextPanel`
2. Extract the live preview area into focused components:
   - `DiscPreview`
   - `BackgroundLayer`
   - `SteamBannerPreview`
   - `DiscTextLayer`
   - `DiscGuideOverlay`
   - `PreviewToastStack`
3. Review whether the remaining `App.tsx` state/handlers should stay in `App.tsx` or move into focused hooks.
4. Clean up CSS duplication and decide whether `layoutFix.css` can be merged into organized style files.
5. Review Rust `src-tauri/src/lib.rs` command organization and either split command modules or explicitly defer that work to a separate backend cleanup issue.
6. Run final validation:
   - `npm run build`
   - `npm run lint`
   - local `npm run tauri dev` smoke test
   - save/load project test
   - PNG export test with and without artwork
   - guide toggle export test

## Recommended Next Work Order

1. Extract `GamePanel` and `BrandingPanel` next. These are lower risk than the text and artwork panels.
2. Extract `ArtworkPanel` after that, preserving all local/Steam artwork behavior.
3. Extract `TextPanel` last among sidebar panels because it has the densest prop surface.
4. Extract the preview area into components after the sidebar is complete.
5. Only then consider hooks for background, disc text, Steam import, local screenshots, and template state.
6. Do CSS cleanup after component boundaries are stable.
7. Treat the Rust module split as either the final issue-#36 task or a follow-up cleanup, depending on how large it becomes.

## Suggested Close Criteria for Issue #36

Issue #36 can be closed when:

- `App.tsx` is mostly orchestration/state and no longer owns large unrelated JSX/rendering blocks.
- Export rendering remains outside `App.tsx`.
- Project file helpers remain outside `App.tsx`.
- Sidebar and preview UI are componentized enough that feature work can continue safely.
- Build and lint pass.
- A local smoke test confirms the disc-label workflow still works.

If the Rust command split or full CSS reorganization is intentionally deferred, create follow-up issues before closing #36 so the remaining cleanup is tracked instead of forgotten.
