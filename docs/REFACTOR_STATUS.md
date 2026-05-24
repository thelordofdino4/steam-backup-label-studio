# Refactor Status

This document tracks the controlled refactor for GitHub issue #36, **Refactor disc editor foundation before more feature work**.

## Current Assessment

The emergency refactor is **ready to close** once final local validation is confirmed.

The original danger was that `App.tsx` had become the owner of too many unrelated responsibilities: editor panels, preview rendering, PNG export rendering, project file schema handling, status toasts, and general app orchestration. That is no longer the case.

The current `App.tsx` is still a large orchestration/state file, but the emergency has been resolved: large JSX regions, export rendering, project/file helpers, and status toast state have been moved into focused modules/components. Remaining cleanup such as deeper hook extraction, CSS organization, and Rust command-module splitting should be tracked as follow-up work rather than keeping issue #36 open indefinitely.

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
- Extracted status toast state and helpers into `src/hooks/useStatusToasts.ts`.
- Extracted sidebar panels into presentational components while keeping state and handlers in `App.tsx`:
  - `ProjectPanel`
  - `ExportOptionsPanel`
  - `GamePanel`
  - `TemplatePanel`
  - `ArtworkPanel`
  - `BrandingPanel`
  - `TextPanel`
  - `GuideLegendPanel`
- Extracted the preview area into focused components while keeping state, refs, and handlers in `App.tsx`:
  - `DiscPreview`
  - `PreviewToastStack`
  - `SteamBannerPreview`
  - `BackgroundLayer`
  - `DiscTextLayer`
  - `DiscGuideOverlay`
- Fixed straight copyright/legal text alignment so left/right alignment changes text alignment inside a stable box instead of moving the whole text box.
- Tuned bottom Steam banner lockup placement enough for the pre-alpha baseline.

## Current Validation Status

Recent checks reported during the refactor sequence:

- `npm run build` passes.
- `npm run lint` passes.
- Local app smoke testing has passed after the component extractions.
- Text panel behavior has been locally checked.
- Straight copyright alignment bugfix has been locally checked.
- Export behavior was locally checked after the export extraction and later spot-checked during text fixes.

Before closing issue #36, run one final local validation pass:

- `npm run build`
- `npm run lint`
- `npm run tauri dev`
- Save/load project test.
- PNG export test with and without artwork.
- Guide toggle export test.
- Steam search/import smoke test.
- Background drag/resize/reset smoke test.
- Text straight/curved controls smoke test.
- Banner top/bottom/none smoke test.

## Follow-Up Work After Issue #36

These items are real cleanup opportunities, but they no longer need to block closing the emergency refactor issue:

1. Extract focused hooks for remaining state clusters:
   - `useDiscTemplate`
   - `useBackgroundImage`
   - `useSteamImport`
   - `useLocalSteamScreenshots`
   - `useDiscTextEditor`
2. Move remaining pure helpers out of `App.tsx` where useful:
   - image file/data URL helpers
   - natural image size helper
   - Steam banner style/default helpers
   - project snapshot creation
3. Clean up CSS duplication and decide whether `layoutFix.css` can be merged into organized style files.
4. Review Rust `src-tauri/src/lib.rs` command organization and split command modules if it becomes a maintenance issue.
5. Polish temporary toast symbols/icons.
6. Add real project schema validation/migrations when the project format starts changing.

## Suggested Close Criteria for Issue #36

Issue #36 can be closed when:

- `App.tsx` is mostly orchestration/state and no longer owns large unrelated JSX/rendering blocks.
- Export rendering remains outside `App.tsx`.
- Project file helpers remain outside `App.tsx`.
- Sidebar and preview UI are componentized enough that feature work can continue safely.
- Build and lint pass.
- A local smoke test confirms the disc-label workflow still works.

As of this update, the code appears to meet those criteria pending one final local validation pass.
