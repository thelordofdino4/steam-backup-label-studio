# Architecture Guardrails

These rules exist because preview/export parity and editor interaction regressions showed that too much behavior was hidden inside large, mixed-responsibility files. The disc artwork editor cannot reach the end of indev if new work keeps adding logic to unrelated structures.

This document is mandatory reading for agents and contributors before implementing features, fixes, or refactors.

## Core Rule

New logic must not be crammed into existing unrelated structures.

- If a change does something new, create a focused new `.ts` or `.tsx` module for it.
- If an existing feature needs updating, update it where that feature belongs.
- If an update grows into a new feature or new responsibility, extract it into a new `.ts` or `.tsx` module.
- Do not add new behavior to `App.tsx` simply because the state currently lives there.
- Do not add unrelated responsibilities to existing renderer, panel, export, or utility files.
- Do not let temporary fixes become permanent dumping grounds.

## App.tsx Boundary

`App.tsx` should move toward orchestration only.

Allowed in `App.tsx`:

- top-level composition
- wiring focused hooks/modules together
- passing state and handlers to presentational components
- app-level status/toast coordination where no narrower owner exists

Not allowed as new work in `App.tsx`:

- large feature-specific state transition blocks
- renderer construction logic
- export drawing logic
- upload/import implementation details
- pointer/drag math
- layout/safe-zone clamp math
- feature-specific business rules
- serialization/migration logic

If a new handler needs more than trivial orchestration, create a focused hook or domain module and call it from `App.tsx`.

## Domain Ownership

Each feature should have an obvious home for its major responsibilities.

For every feature, it should be clear where these live:

- state shape and defaults
- state transitions
- layout and safe-zone clamping
- preview rendering artifact
- export rendering artifact
- pointer/drag interaction behavior
- upload/import behavior
- serialization/normalization behavior
- validation/preflight behavior

If those responsibilities are spread through unrelated files, refactor before expanding the feature.

## Preview and Export Parity Rule

Preview and export must not be separate visual products.

When a visual element appears in both preview and PNG export:

- prefer one shared renderer/artifact used by both paths
- avoid independent DOM/CSS preview renderers paired with canvas-only export renderers
- do not duplicate placeholder layout logic in CSS and canvas
- keep layer order shared and explicit
- keep coordinate systems shared and documented
- avoid preview-only CSS effects that export cannot reproduce
- avoid export-only raster/canvas effects that preview cannot reproduce

If a feature needs an editor-only hit target, keep it separate from the visual artifact and document that separation.

## Interaction Safety Rule

Visual parity refactors must not silently break editor controls.

For every movable/editable visual element, preserve or deliberately recreate:

- direct preview dragging
- slider/manual positioning
- upload/custom image controls where applicable
- reset/clear controls
- save/load behavior
- preview/export parity

A visual artifact can be image-backed or SVG-backed, but the interaction layer must remain intentional and testable.

## Safe-Zone and Layout Rule

Safe-zone, bounds, and layout math must live in focused layout modules, not inside renderers or large UI files.

- Text bounds should be deterministic and shared between preview/export.
- Alignment must align content inside a stable box; it must not redefine the box arbitrarily.
- Movable visual elements should use shared clamp helpers where safe-zone enforcement is required.
- Export outline padding must not change content-layer coordinate math.

## CSS Rule

CSS must not override the shared rendering model by accident.

- Avoid hardcoded z-index values that conflict with `src/layerOrder.ts`.
- Do not leave stale CSS selectors from older renderers after a refactor.
- Do not use CSS as hidden business logic for layout, bounds, or feature state.
- If CSS is part of a shared visual artifact, make sure export can use the same effective styling.

## Refactor-First Rule

When a regression exposes hidden coupling, do not immediately patch the symptom if the structure is unclear.

First:

1. Identify the ownership boundary that failed.
2. Extract misplaced logic into a focused module or hook.
3. Make visual rendering, state updates, layout math, and interaction surfaces explicit.
4. Then fix the regression inside the correct owner.

## Validation Expectations

After code changes:

- Run `npm run lint`.
- Run `npm run build`.
- Ask the user to verify `npm run tauri dev` for interactive UI, drag, upload, preview/export parity, and desktop-window checks.

For visual/editor changes, validation should include:

- preview behavior
- exported PNG behavior
- save/load behavior when state is affected
- direct drag behavior where applicable
- slider/manual controls where applicable
- upload/custom image behavior where applicable

## End-of-Indev Standard

The disc artwork editor cannot leave indev while core behavior depends on hidden coupling in large files.

Before alpha-boundary work continues, the code should make it plain where each feature lives and how preview/export parity is protected.