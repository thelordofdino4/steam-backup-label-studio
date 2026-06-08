# Case Insert Editor Architecture

Last refreshed: 2026-06-08.

Issue context: #126 and active jewel case follow-up issue #149.

This note records the architecture decision for the jewel case editor foundation. It is intentionally small and should stay close to the first implementation pass. The goal is to keep the working disc-label editor stable while adding a separate case insert editor surface.

## Accepted Direction

Steam Backup Label Studio has separate editor environments that share lower-level systems.

- The Disc Editor owns circular disc-label projects.
- The Case Insert Editor owns rectangular case insert projects.
- Jewel case is the first supported case insert template inside the Case Insert Editor.
- Jewel case is not another disc template in the Disc Editor.
- DVD/Amaray and Blu-ray belong in the Case Insert Editor later, but they should remain unavailable until they have usable template, preview, save/load, and export support.

## Model Boundaries

The app should keep these concepts separate:

- Workspace: the current app surface, such as `home`, `disc`, or `caseInsert`.
- Project type: the saved project family, such as `disc` or `caseInsert`.
- Template or case variant: the concrete physical layout used inside a project type.

Examples:

- A disc project can choose a disc template such as `standardPrintableDisc` or `custom`.
- A case insert project can choose a case insert template such as `jewelCase`.
- Future DVD/Amaray or Blu-ray case variants should be case insert templates, not new disc templates.

The runtime workspace is allowed to be `home`, but `home` is not a project type. Saved projects should eventually route by their project type once #131 adds the case project schema and normalization.

## Shared Systems

Case insert work should reuse existing systems when the existing system owns the behavior:

- Steam/manual metadata and metadata candidates.
- Steam artwork, screenshots, local screenshots, web candidates, and uploaded image import paths.
- Asset provenance/status and future package-format decisions.
- Rating badges, media marks, platform marks, technical marks, and logo helpers where they are region-agnostic.
- Toast/status feedback.
- Save/load plumbing and normalization patterns.
- Export helper patterns, canvas-safe image loading, and preflight patterns.

Shared does not mean the disc editor owns case behavior. Shared systems should remain lower-level helpers or be extracted into focused modules when case work exposes a broader responsibility.

The current shared/editor-specific ownership map lives in
`docs/EDITOR_UNIFICATION_FINAL_AUDIT.md`. Use that audit before creating a new
case insert helper that might duplicate an existing shared editor contract.

Shared utilities must stay neutral. A helper can live in shared template,
asset-import, image-file, or project-status code only when it does not encode
disc-only or case-only policy. If the helper needs to know which case region,
disc layer, Steam source, saved-project compatibility path, or visual feature it
belongs to, keep it in the owning domain.

## Editor-Owned Systems

Case insert behavior should live in focused case modules instead of disc-specific owners:

- Case project state and defaults.
- Rectangular template geometry.
- Front, back, and spine region layout.
- Case-specific artwork fitting and safe-zone rules.
- Case preview rendering.
- Case export rendering.
- Case-specific export preflight warnings.
- Case sidebar panels and workflow tabs.

Disc-specific circular geometry, disc text layout, disc export drawing, and disc preview behavior should remain disc-owned.

## Current Implementation Snapshot

The current code has moved beyond the earliest foundation notes. Future work
should preserve these owners instead of adding parallel case behavior elsewhere.

- Workspace routing still happens in `src/app/App.tsx`, but `App.tsx` should
  remain orchestration only.
- Shared physical template concepts live in `src/types/template.ts` and
  `src/templates/templateModel.ts`.
- Built-in rectangular case insert template data lives in
  `src/templates/caseInsertTemplates.ts`.
- Jewel case defaults, normalization, image-slot transitions, text transitions,
  surface transitions, source import helpers, and case export settings live
  under `src/caseInsert/`.
- Saved case insert project snapshot, normalization, restoration, and routing
  live in `src/project/caseInsertProjectAdapters.ts` and
  `src/project/projectRouting.ts`.
- `src/project/projectCaseInsert.ts` is currently a compatibility barrel and
  adapter export surface for existing imports. Do not add new case state,
  transition, layout, import, or export behavior there.
- Jewel case surface action hooks live under `src/hooks/`, including the cover,
  tray, and spine editor hooks.
- Case insert UI composition and surface controls live in
  `src/components/caseInsert/`.
- Case insert preview layers and guides live in
  `src/components/preview/CaseInsertPreview.tsx`,
  `src/components/preview/CaseInsertTemplatePreviewLayers.tsx`,
  `src/components/preview/CaseInsertSpinePreviewLayer.tsx`, and
  `src/components/preview/CaseInsertGuideOverlay.tsx`.
- Case insert preview/export layer order lives beside the disc policy in
  `src/editor/layerOrder.ts` and is documented in
  `docs/CASE_INSERT_EDITOR_LAYER_ORDER.md`.
- Rectangular layout helpers live under `src/layout/`, including jewel case and
  case insert preview layout helpers. Do not reuse disc safe-zone or circular
  geometry modules for rectangular case math.

Large case panels should follow the same composition-shell rule as the disc
sidebar. `CaseInsertEditorShell` may assemble panels and pass actions; detailed
source decisions, image import behavior, layout transitions, save/load
normalization, and future export/preflight rules belong in focused case modules
or hooks.

## Implementation Guardrails

- Keep `App.tsx` as orchestration for workspace routing and top-level wiring.
- Do not add jewel-case state, layout math, renderer logic, upload/import rules, or export drawing to `App.tsx`.
- Do not hide or destabilize the disc editor while the case editor is incomplete.
- Keep `New Case Insert` as the user-facing entry label.
- Blank project entry should remain direct and lightweight.
- Guided Start remains future workflow; it can be represented as planned, but it should not become a required path for case or disc creation.
- Preview/export parity must be explicit from the first real case preview/export pass.

## Next Implementation Path

The home/workspace entry point, rectangular template model, physical jewel case
template, case project schema/normalization, cover/tray/spine editing paths,
case PNG export, and case-specific preflight now have implementation in the
current worktree. Continue the active jewel case sequence without destabilizing
the disc editor:

1. Finish structured tray/spine layouts in focused case modules (#149).
2. Preserve shared artwork, branding, text, source, drag, save/load, preflight,
   and export contracts documented in `docs/EDITOR_UNIFICATION_FINAL_AUDIT.md`.
3. Run an honest case insert alpha validation and manual smoke pass only when
   the implemented case flows can be exercised.
