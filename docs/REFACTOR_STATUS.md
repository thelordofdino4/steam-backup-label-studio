# Refactor Status

Last refreshed: 2026-05-31.

This document tracks controlled refactor history and current architecture expectations for the disc artwork editor.

## Current Assessment

The earlier editor-foundation refactor from issue #36 extracted many large rendering and project-file responsibilities from `App.tsx`. The later emergency rendering/parity work (#82-#85) is also closed. Do not describe those issues as active blockers.

The standing rule remains documented in `docs/ARCHITECTURE_GUARDRAILS.md`:

- New logic must not be crammed into existing unrelated structures.
- New responsibilities need focused `.ts` or `.tsx` modules.
- Existing features should be updated where they belong.
- If an update grows into a new feature or responsibility, extract it.
- `App.tsx` must keep moving toward orchestration, not feature ownership.
- Preview/export parity must be protected by shared render artifacts where feasible, shared layer order, and shared coordinate systems.

## Why This Matters

The disc editor now has many real-disc-art systems: background artwork, title artwork, additional artwork, Steam banner branding, logo marks, rating badges, media marks, operating-system marks, technical marks, disc-number artwork, disc text, export preflight, save/load, and project asset provenance. These systems are useful launchpad infrastructure.

Because they are now broad enough to be real product surface, future work should improve ownership boundaries instead of patching symptoms into large orchestration files.

## Completed Refactor / Architecture Work

- Deduplicated disc text type declarations by importing shared types from `src/discText/index.ts`.
- Added shared byte/base64 and image-file helpers.
- Extracted saved-project schema/type definitions into `src/project/projectTypes.ts`.
- Added `src/project/normalizeProject.ts` and `src/project/restoreProjectState.ts` as project restoration/normalization owners.
- Added frontend Tauri file wrappers in `src/tauri/fileSystem.ts`.
- Extracted PNG export rendering into `src/export/` modules.
- Moved canvas/image helpers into `src/export/canvasImage.ts`.
- Added focused export renderers for Steam banner, title artwork, additional artwork, logo assets, rating badges, media marks, technical marks, disc text, and guides.
- Centralized visual layer order in `src/editor/layerOrder.ts`.
- Extracted status toast state and helpers into `src/hooks/useStatusToasts.ts`.
- Extracted sidebar panels into presentational components.
- Extracted the preview area into focused preview components.
- Added focused hooks for title artwork, additional artwork, technical marks, web artwork discovery, logo candidate discovery, and metadata assistance.
- Added project/domain modules for title artwork, additional artwork, logo assets, rating badge, media/platform marks, technical marks, metadata-bound text, asset status/provenance, and project snapshots.
- Moved safe-zone clamp/range helpers into `src/layout/discElementSafeZone.ts`.
- Added occupied-region helpers for text visual avoidance.
- Added export preflight in `src/export/exportPreflight.ts`.

## Current Validation Status

Recent source-level work has had passing `npm run build` and `npm run lint` runs, but those historical notes are not a substitute for current validation.

For this documentation freshness pass, do not claim native/Tauri manual smoke. Agents should not run `npm run tauri dev` unless the user explicitly asks.

For any visual/editor refactor, ask the user to verify:

- `npm run tauri dev`
- PNG export parity
- Save/load project behavior
- Drag behavior
- Slider/manual controls
- Upload/custom image behavior

## Active Refactor Risks

The following risks remain worth attention:

1. `App.tsx` still owns more orchestration and feature wiring than ideal.
2. Some feature-specific state transitions still need focused hooks.
3. Preview/export renderers are better aligned than before, but some layers still have separate preview and canvas implementations that must stay synchronized.
4. CSS can still become hidden layout/business logic if stale renderer rules remain.
5. Project schema validation and migrations remain limited (#48).
6. Built-in asset routing is centralized, but future assets still need to follow the manifest and folder hierarchy.

## Follow-Up Work

Continue extracting focused hooks/domain modules where doing so supports alpha work:

- Disc template state and custom dimension transitions.
- Background image state and upload behavior.
- Steam search/import and local Steam screenshot behavior.
- Steam banner state/upload/layout transitions.
- Remaining logo/rating/media/platform state transitions where still owned by `App.tsx`.
- Disc text editor state transitions and pointer behavior.
- Shared upload/import behavior.
- Pointer drag interactions.
- Project schema validation/migrations (#48).
- CSS organization (#46).
- Rust command organization only if it becomes a maintenance issue (#47).

## Close Criteria For Architecture Stabilization

The architecture can be considered stable enough for continued alpha-boundary feature work when:

- `App.tsx` is mostly orchestration and no longer owns large feature-specific logic blocks.
- New feature responsibilities are represented by focused modules/hooks.
- Preview/export render paths are shared or explicitly documented where they cannot be shared.
- Layer order and coordinate systems are centralized.
- Interaction hit targets are explicit and do not depend accidentally on visual renderer internals.
- Build and lint pass.
- Manual smoke confirms the disc-label workflow still works.
