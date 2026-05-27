# Refactor Status

This document tracks the controlled refactor history and current architecture expectations for the disc artwork editor.

## Current Assessment

The earlier editor-foundation refactor from issue #36 extracted many large rendering and project-file responsibilities from `App.tsx`, but recent preview/export parity and interaction regressions showed that the codebase still has hidden coupling risks.

The current priority is no longer simply closing an old refactor checklist. The project needs stronger architecture safety rails before pushing to the end of indev for the disc artwork editor.

The standing rule is documented in `docs/ARCHITECTURE_GUARDRAILS.md`:

- New logic must not be crammed into existing unrelated structures.
- New responsibilities need focused `.ts` or `.tsx` modules.
- Existing features should be updated where they belong.
- If an update grows into a new feature or responsibility, extract it.
- `App.tsx` must move toward orchestration, not feature ownership.
- Preview/export parity must be protected by shared render artifacts, shared layer order, and shared coordinate systems.

## Why This Matters

Recent work on preview/export parity fixed some visible drift but also exposed regressions in safe-zone text bounds, drag behavior, manual controls, and platform/media mark behavior. That is a sign that visual rendering, interaction hit targets, state transitions, layout math, and export artifacts were still too tightly coupled or too hard to audit.

The codebase should be refactored so future work does not require circling through large files to discover where behavior lives.

## Required Refactor Direction

Before adding major new disc-editor features, continue extracting logic into focused domains:

- Disc text state and layout updates
- Rating badge state and layout updates
- Media mark state and layout updates
- Platform mark state and layout updates
- Logo asset state and layout updates
- Upload/import image handling
- Pointer drag interactions
- Safe-zone clamping and layout math
- Preview/export shared renderer artifacts
- Project persistence and normalization behavior

Each feature should have a clear home for:

- state shape and defaults
- state transitions
- layout and safe-zone clamping
- preview rendering artifact
- export rendering artifact
- pointer/drag interaction behavior
- upload/import behavior
- serialization/normalization behavior
- validation/preflight behavior

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
- Extracted sidebar panels into presentational components while keeping much state and many handlers in `App.tsx`:
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

- `npm run build` passes in recent work.
- `npm run lint` passes in recent work.
- Local app smoke tests have found important regressions that still need to be handled after boundaries are clarified.

For any visual/editor refactor, ask the user to verify:

- `npm run tauri dev`
- PNG export parity
- Save/load project behavior
- Drag behavior
- Slider/manual controls
- Upload/custom image behavior

## Active Refactor Risks

The following risks are active and should not be treated as cosmetic cleanup:

1. `App.tsx` still owns too many feature-specific state transitions and handlers.
2. Some visual systems may still have split preview/export render paths.
3. Some interaction behavior may depend on visual DOM structure rather than explicit hit targets.
4. Some layout and clamp behavior may be buried near UI code instead of domain layout modules.
5. CSS can still become hidden layout/business logic if stale renderer rules remain.
6. New feature work can reintroduce drift if it is added to whichever large file is convenient.

## Follow-Up Work

These are not optional polish if they block stable indev completion:

1. Extract focused hooks/domain modules for remaining state clusters:
   - `useDiscTemplate`
   - `useBackgroundImage`
   - `useSteamImport`
   - `useLocalSteamScreenshots`
   - `useDiscTextEditor`
   - `useLogoAssets`
   - `useRatingBadge`
   - `useMediaMark`
   - `usePlatformMarks`
2. Move remaining pure helpers out of `App.tsx`:
   - image file/data URL helpers
   - natural image size helper
   - Steam banner style/default helpers
   - project snapshot creation
3. Move layout/safe-zone clamp math into domain layout modules.
4. Move upload/import behavior into asset/domain modules.
5. Move pointer/drag interaction math into interaction modules.
6. Clean up CSS duplication and stale renderer rules.
7. Add clear project schema validation/migrations when the project format changes.
8. Review Rust `src-tauri/src/lib.rs` command organization and split command modules if it becomes a maintenance issue.

## Close Criteria for Current Architecture Stabilization

The architecture can be considered stable enough for continued alpha-boundary feature work when:

- `App.tsx` is mostly orchestration and no longer owns large feature-specific logic blocks.
- New feature responsibilities are represented by focused modules/hooks.
- Preview/export render paths are shared or explicitly documented where they cannot be shared.
- Layer order and coordinate systems are centralized.
- Interaction hit targets are explicit and do not depend accidentally on visual renderer internals.
- Build and lint pass.
- Local smoke tests confirm the disc-label workflow still works.
