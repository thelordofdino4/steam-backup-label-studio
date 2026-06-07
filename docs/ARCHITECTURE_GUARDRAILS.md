# Architecture Guardrails

These rules exist because preview/export parity and editor interaction regressions showed that too much behavior was hidden inside large, mixed-responsibility files. The disc artwork editor has reached its alpha feature boundary, and future disc polish or jewel case work must preserve that baseline instead of adding logic to unrelated structures.

Last refreshed: 2026-06-07.

This document is mandatory reading for agents and contributors before implementing features, fixes, or refactors.

## Core Rule

New logic must not be crammed into existing unrelated structures.

- Before creating new behavior or a new module, do a light search for existing owners: nearby domain modules, hooks, renderers, layout helpers, export helpers, project/schema helpers, and utilities.
- If an existing feature or module already owns that behavior, update the existing owner instead of creating a parallel implementation.
- If no suitable owner exists and the change does something genuinely new, create a focused new `.ts` or `.tsx` module for it.
- If an existing feature needs updating, update it where that feature belongs.
- If an update grows into a new feature or new responsibility, extract it into a new `.ts` or `.tsx` module.
- Presentation components may call domain helpers/selectors, but must not own domain decisions, mapping rules, layout/clamp math, upload/import rules, or state transition rules.
- Do not add new behavior to `App.tsx` simply because the state currently lives there.
- Do not add unrelated responsibilities to existing renderer, panel, export, or utility files.
- Do not let temporary fixes become permanent dumping grounds.

## Existing Owner Preflight

Before implementing behavior, spend a small amount of time checking whether the project already has an owner for that responsibility.

Use targeted searches rather than broad archaeology. Look for:

- matching domain names such as `discText`, `discTextStyles`, `discTextAvoidance`, `titleArtwork`, `additionalArtwork`, `discNumberArtwork`, `ratingBadge`, `mediaMark`, `platformMark`, `technicalMark`, `logoAsset`, `steamBanner`, `background`, `projectAssetStatus`, `metadataDiscText`, `project`, `exportPreflight`, or `export`
- existing hooks under `src/hooks/`
- existing layout helpers under `src/layout/` or geometry helpers under `src/disc/geometry.ts`
- existing preview components under `src/components/preview/`
- existing sidebar panels under `src/components/sidebar/`
- existing export helpers under `src/export/`
- existing project/schema helpers under `src/project/`
- existing utility helpers under `src/utils/`

Decision rule:

- If an owner exists, extend that owner.
- If an owner almost exists but is missing a clear boundary, extract or rename toward the right owner before expanding behavior.
- If no owner exists, create a focused module with a clear name and narrow responsibility.
- Do not create a parallel helper, renderer, or state path that duplicates an existing concept under a different name.

## Post-Cleanup Ownership Invariants

The current cleanup/refactor work created several boundaries that future tasks
must preserve.

- Relative import cycles under `src` must stay at zero. `npm run check:cycles`
  is a required guardrail after file moves, ownership cleanup, module splits,
  or import changes.
- `App.tsx` may coordinate workspaces, hooks, save/load/export orchestration,
  dialogs, and status messages, but it must not regain unrelated feature
  ownership. Do not add new layout math, upload/import interpretation,
  renderer construction, state transition rules, project normalization, or
  export drawing there.
- Disc editor modules and case insert modules must stay separate. Circular disc
  geometry, disc safe-zone logic, disc text layout, disc preview, and disc PNG
  export remain disc-owned. Rectangular case insert state, layout, preview, and
  future export/preflight behavior belong in case insert owners.
- Template modules must stay neutral. `src/templates/templateModel.ts` and
  `src/types/template.ts` may describe shared physical template concepts, but
  should not absorb disc-only or case-only editing rules.
- `src/project/projectCaseInsert.ts` is currently a compatibility barrel and
  adapter surface. New case behavior should go into `src/caseInsert/*`,
  `src/project/caseInsertProjectAdapters.ts`, or another focused case owner,
  not into the barrel.
- Large sidebar panels such as `ArtworkPanel`, `BrandingPanel`, and `TextPanel`
  should stay composition shells. Their children may render controls, but
  source decisions, upload/import rules, layout clamps, state transitions, and
  serialization must live in hooks or domain modules.
- Shared utilities should contain only neutral reusable logic. If a helper needs
  to know about Steam artwork policy, disc geometry, case regions, saved-project
  compatibility, or visual feature semantics, it belongs in that domain instead
  of `src/utils/` or another broad shared folder.

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

## Presentation Component Boundary

Presentation components should stay presentational.

Allowed in sidebar/preview components:

- rendering controls, labels, previews, and visual artifacts
- calling imported domain helpers/selectors
- forwarding user events to handlers supplied by a domain hook or orchestration owner
- applying already-computed view-model values

Not allowed in sidebar/preview components:

- feature-specific branching that decides what a value means
- state source mapping such as choosing between manual title state, metadata state, and rendered text state
- layout or safe-zone clamp math
- upload/import interpretation rules
- project serialization or normalization rules
- renderer/export parity decisions
- pointer/drag math beyond attaching supplied handlers

If a component needs one of those decisions, move the decision into the feature's domain module, a focused selector/view-model helper, or a hook, then pass the result into the component.

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

Current real-disc-art owners include, at minimum:

- Background artwork: `src/backgroundImage.ts`, `src/backgroundArtworkSource.ts`, `src/backgroundImageImport.ts`, preview/export owners, and future focused hook work.
- Title/logo artwork: `src/hooks/useTitleArtwork.ts`, `src/project/projectTitleArtwork.ts`, `src/steam/steamTitleArtworkImport.ts`, `TitleArtworkLayer`, and `drawTitleArtwork`.
- Additional artwork: `src/hooks/useAdditionalArtwork.ts`, `src/project/projectAdditionalArtwork.ts`, `AdditionalArtworkLayer`, and `drawAdditionalArtwork`.
- Developer/publisher/additional logos: `src/project/projectLogoAssets.ts`, logo discovery hooks, `LogoAssetLayer`, and `drawLogoAssets`.
- Rating badge: `src/project/projectRatingBadge.ts`, `RatingBadgeLayer`, and `drawRatingBadge`.
- Media marks: `src/project/projectMediaMark.ts`, `MediaMarkLayer`, `createMediaMarkRenderModel`, and `drawMediaMark`.
- Operating-system marks: `src/project/projectPlatformMarks.ts`, `src/steam/steamPlatformMarks.ts`, `PlatformMarksLayer`, `createPlatformMarkRenderModels`, and `drawPlatformMarks`.
- Technical marks: `src/hooks/useTechnicalMarks.ts`, `src/project/projectTechnicalMarks.ts`, `TechnicalMarksLayer`, and `drawTechnicalMarks`.
- Metadata-bound text: `src/project/metadataDiscText.ts`.
- Export preflight: `src/export/exportPreflight.ts`.
- Asset provenance/status: `src/project/projectAssetStatus.ts`.
- Layer order: `src/editor/layerOrder.ts` and `docs/DISC_EDITOR_LAYER_ORDER.md`.

Current case insert owners include, at minimum:

- Rectangular template model and validation: `src/types/template.ts` and
  `src/templates/templateModel.ts`.
- Built-in case insert template data: `src/templates/caseInsertTemplates.ts`.
- Case insert defaults, normalization, image-slot transitions, text
  transitions, front-cover transitions, image-source import, and export settings:
  `src/caseInsert/*`.
- Saved case insert project snapshot, normalization, restoration, and routing
  adapters: `src/project/caseInsertProjectAdapters.ts`,
  `src/project/projectCaseInsert.ts`, and `src/project/projectRouting.ts`.
- Jewel case front editor actions: `src/hooks/useJewelCaseFrontEditor.ts`.
- Case insert UI shell and front controls: `src/components/caseInsert/*`.
- Case insert preview and guides: `src/components/preview/CaseInsertPreview.tsx`,
  `src/components/preview/CaseInsertFrontPreviewLayers.tsx`, and
  `src/components/preview/CaseInsertGuideOverlay.tsx`.
- Case insert layer order: `src/editor/layerOrder.ts` and
  `docs/CASE_INSERT_EDITOR_LAYER_ORDER.md`.

If a future back-cover, spine, export, or preflight feature does not fit one of
these owners, create a focused case insert module instead of adding the behavior
to disc-specific modules or broad shared utilities.

## Cross-Surface Parity Migration Rule

When a case insert feature is intended to match a disc editor feature, the disc
feature is the source of truth until a deliberate divergence is documented.
Parity work is not complete when the visible panel shape looks similar. Audit
and preserve the whole feature chain before implementation is called done:

- defaults for new blank projects
- add, remove, rename, show/hide, reset, clear, and update transitions
- source picker behavior, source labels, upload/import rules, and empty states
- panel hierarchy, nested panel styling, spacing, and enabled-state visibility
- drag behavior and slider/manual positioning behavior
- preview rendering, PNG export rendering, and layer-order labels
- export preflight warnings and disabled-feature omission rules
- save/load, sparse restore, legacy normalization, and project-file labels
- tests and manual smoke checklist wording

New projects should use the shared current behavior and vocabulary. Legacy
aliases such as old screenshot or callout names may be accepted only in
normalization or restore adapters, and should normalize into the current feature
shape rather than leaking into new UI cards, layer labels, defaults, or export
warnings.

For branding and text parity work, do the source-of-truth audit before writing
new controls:

- identify the disc owner modules, hooks, renderers, export helpers, project
  helpers, and tests that define the behavior
- map every matching case insert responsibility to an existing case owner or a
  focused new case module
- record any intentional case-specific differences before implementation
- add focused tests that prove blank defaults, add behavior, disabled-state
  preservation, preview/export participation, and save/load behavior match the
  intended parity contract
- ask for manual runtime verification of nested panels, drag, upload/source
  controls, preview, export, and save/load before closing the issue

## Preview and Export Parity Rule

Preview and export must not be separate visual products.

When a visual element appears in both preview and PNG export:

- prefer one shared renderer/artifact used by both paths
- avoid independent DOM/CSS preview renderers paired with canvas-only export renderers
- do not duplicate placeholder layout logic in CSS and canvas
- keep layer order shared and explicit through `src/editor/layerOrder.ts`
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

This currently applies to background artwork, title/logo artwork, additional artwork, developer/publisher/additional logos, rating badges, media marks, operating-system marks, technical marks, and disc text.

A visual artifact can be image-backed or SVG-backed, but the interaction layer must remain intentional and testable.

## Optional Visual UI Hierarchy

Optional visual features should expose only their top-level show/enable checkbox when disabled. Dependent controls should be hidden from view, disabled visuals should not render in preview or PNG export, and disabling should preserve saved state.

Inside an enabled optional visual feature, prefer this order:

1. Show/enable checkbox.
2. Subordinate optional checkboxes.
3. Source/type/value controls.
4. Text/value inputs.
5. Upload/custom asset controls.
6. Placement/alignment presets.
7. Sliders/fine-tuning controls.
8. Reset/clear actions.

Follow this especially for title artwork, additional artwork, developer logo, publisher logo, rating badge, media mark, operating-system marks, technical marks, and future optional metadata text elements.

## Safe-Zone and Layout Rule

Safe-zone, bounds, and layout math must live in focused layout modules, not inside renderers or large UI files.

- Text bounds should be deterministic and shared between preview/export.
- Alignment must align content inside a stable box; it must not redefine the box arbitrarily.
- Movable visual elements should use shared clamp helpers where safe-zone enforcement is required.
- Export outline padding must not change content-layer coordinate math.

## CSS Rule

CSS must not override the shared rendering model by accident.

- Avoid hardcoded z-index values that conflict with `src/editor/layerOrder.ts`.
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

## Dependency Cycle Guard

Relative import cycles under `src` should remain at zero. Cycles hide ownership boundaries, make safe module moves harder, and can turn type-only convenience imports into runtime coupling during later refactors.

Run `npm run check:cycles` after ownership refactors, file moves, or import cleanup. The check scans `.ts` and `.tsx` files under `src`, resolves relative imports, reports cycle paths, and exits nonzero when any cycle is found.

When a cycle appears, prefer extracting neutral types, constants, or shared declarations into a narrower owner instead of importing through a broad feature entry point.

## Primary Checkout And Runtime Verification

User-visible fixes must be verified against the checkout and runtime the user is actually testing.

- Primary checkout: `C:\Users\John Paul Keller\steam-backup-label-studio`.
- Pushing to `origin/main` is not enough when the user tests from the primary checkout. The primary checkout must be synced to the fixed commit or reported as blocked with exact dirty/conflicting files.
- Clean side worktrees are useful for protecting WIP and proving the source builds, but they do not prove the user's running app has updated.
- If the user reports that the app still behaves incorrectly after a claimed fix, verify runtime state before making another code change:
  - run `git status --short`
  - run `git branch --show-current`
  - run `git rev-parse HEAD`
  - run `git fetch origin`
  - run `git rev-parse origin/main`
  - confirm whether the primary checkout contains the claimed fix commit
  - check whether a stale Vite, Tauri, or other dev-server process is serving old code
  - check whether ignored generated output such as `dist/` is stale
- Kill stale dev-server processes only when it is safe and clearly tied to this repository runtime.
- Rebuild generated or ignored runtime output such as `dist/` when the user is testing a built/static runtime path.
- If the primary checkout is dirty, inspect dirty files and incoming files. Safely stash/reapply non-overlapping work or report the exact safe action. If dirty files overlap incoming changes, stop and report the exact conflicting files.
- Do not claim a live UI/runtime regression is fixed solely from helper or unit tests. Final reports for user-visible fixes must distinguish source validation passed, primary checkout synced, runtime rebuilt/restarted, live/browser/Tauri/manual behavior verified, and anything left for the user.
- This rule does not override the `npm run tauri dev` restriction: agents must not run Tauri unless the user explicitly asks.

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

For documentation-only freshness work, do not claim these manual/runtime checks were performed unless they actually were. Non-interactive validation can show the source still builds; it does not prove live Tauri/editor behavior.

Manual smoke checklists for editor, artwork, branding, preview, save/load/export,
and case insert flows live in `docs/MANUAL_SMOKE_CHECKLISTS.md`. Use them when a
visual/editor change needs human verification, and record which checklist items
were actually checked.

For user-visible fixes, final reports must also include:

- `origin/main` SHA
- primary checkout SHA
- whether the primary checkout is clean or dirty
- whether the primary checkout is synced to the fix
- whether stale dev processes were found or stopped
- whether `dist/` or other generated runtime output was rebuilt
- validation commands run
- what was actually verified in the running app
- what remains for the user to verify

## Post-Indev Standard

The disc artwork editor has left indev as a feature surface, but the same standard applies to future work: core behavior must not depend on hidden coupling in large files.

Before jewel case editor work expands, the code should make it plain where each feature lives and how preview/export parity is protected.

The case insert editor boundary is recorded in `docs/CASE_INSERT_EDITOR_ARCHITECTURE.md`: jewel case is the first case insert template, not another disc template, and project type stays separate from concrete template/case variants.
