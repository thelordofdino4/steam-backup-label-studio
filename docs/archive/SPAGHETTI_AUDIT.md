> [!WARNING]
> Historical / Not Authoritative. This document is preserved for implementation context only.
> Current guidance lives in [Documentation Map](../README.md); architecture-sensitive rules are authoritative in [Software Design Document](../SOFTWARE_DESIGN_DOCUMENT.md).

# Cleanup Readiness Plan

Date: 2026-06-03

Scope: professional stabilization, cleanup-readiness, and behavior-preserving
ownership cleanup for the primary checkout. The current cleanup work separates
media-mark and operating-system-mark owners, splits the dense disc text panel
into a small coordinator plus one per-element control component, and moves disc
preview size measurement plus disc template/custom-dimension state out of
`App.tsx` without changing app behavior, UI flow, saved project schema,
preview/export semantics, or runtime feature scope.

Primary checkout: `C:\Users\John Paul Keller\steam-backup-label-studio`

## Current Baseline

Required docs reviewed before this pass:

- `README.md`
- `docs/archive/CURRENT_STATUS.md`
- `docs/archive/ROADMAP.md`
- `docs/archive/MILESTONES.md`
- `docs/archive/ARCHITECTURE_GUARDRAILS.md`
- `docs/archive/REFACTOR_STATUS.md`
- `docs/PRD.md`

Repository state reviewed:

- Branch: `main`
- Primary checkout SHA: `9ad3bb91035098264530f415dcc00d10ff764338`
- `origin/main` SHA after `git fetch origin`: `9ad3bb91035098264530f415dcc00d10ff764338`
- The working tree contains in-flight cleanup edits from the current
  stabilization work. No unrelated user work was observed in the reviewed dirty
  set.
- Recent commits show active jewel-case and cleanup work, including case front
  image source reuse, jewel case front cover editor work, case insert project
  module splits, preview/drag prop grouping, artwork/branding panel splits,
  disc text state extraction, dependency-cycle cleanup, and source-folder
  organization.

Open issue context reviewed:

- Cleanup/refactor/reliability: #44, #46, #47, #48, #56.
- Active jewel case work: #126 and #136-#144, with #138 recently active.
- Disc/editor polish and future work: #124, #125, #17.

Do not create duplicate cleanup issues for #44, #46, #47, #48, or #56 unless the
new work is narrower than those trackers and is intentionally linked back.

## Validation Status

Current source-level safety net is clean:

- `npm run check:cycles` passed. The cycle checker scanned 206 `.ts` and `.tsx`
  files under `src` and found no relative import cycles.
- `npm run lint` passed.
- `npm run test` passed. Node test runner reported 222 passing tests.
- `npm run build` passed.

Build warnings to track:

- Vite/Rolldown reported `dist/assets/index-*.js` at 574.05 kB minified, above
  the 500 kB chunk warning threshold.
- Vite left `./assets/app-shell/crowbar-toggle.png` unresolved from CSS. The
  string appears in `src/styles/App.css` and should be handled in a focused CSS
  or asset-routing pass instead of opportunistically changed during feature work.

Manual runtime status:

- `npm run tauri dev` was not run, per agent instructions.
- Live editor behavior, drag behavior, upload behavior, save/load behavior,
  preview/export parity, and desktop-window behavior still require manual
  verification after any visual/editor cleanup.

## Current Cleanup Signals

### Dependency cycles

Current status: clean.

`npm run check:cycles` found no cycles. This is a major improvement over older
audit notes. Keep this as a hard guardrail for future ownership moves.

Recommended action:

- Keep `npm run check:cycles` in every cleanup validation set.
- If a cycle appears, extract neutral types/constants rather than importing
  through broad feature modules.

### Oversized files

Largest current source files by line count:

| File | Lines | Risk |
| --- | ---: | --- |
| `src/styles/App.css` | 1714 | CSS ownership, stale selectors, z-index and asset URL risk. |
| `src/app/App.tsx` | 1501 | Top-level orchestration still owns many reset/save/load/import paths. |
| `src/steam/steamLogoCandidates.ts` | 1277 | Dense parsing/filtering heuristics; behavior-sensitive despite good tests. |
| `src/layout/discElementSafeZone.ts` | 809 | Critical disc clamp/range owner knows many feature shapes. |
| `src/steam/steamMetadataCandidates.ts` | 702 | Metadata candidate parsing remains dense and behavior-sensitive. |
| `src/components/caseInsert/CaseInsertFrontPanel.tsx` | 667 | New case UI surface already has repeated image/text controls. |
| `src/project/projectPlatformMarks.ts` | 667 | Newly extracted platform-mark owner contains save/load compatibility and Steam inference-sensitive transitions. |
| `src/project/projectLogoAssets.ts` | 638 | Logo state/default/import/layout owner still has repeated per-logo-family transitions. |
| `src/interaction/useDiscPreviewPointerDrag.ts` | 586 | Repeats per-feature drag setup and clamp calls. |
| `src-tauri/src/lib.rs` | 583 | Rust commands remain concentrated in one backend file. |
| `src/layout/discTemplateLayoutDefaults.ts` | 582 | Template-aware default placement keeps growing as visual systems are added. |
| `src/components/sidebar/DiscTextControl.tsx` | 580 | Disc text per-element UI is now isolated, but still control-dense. |
| `src/layout/jewelCaseLayout.ts` | 568 | Rectangular layout logic is growing with case work. |
| `src/assets/assetManifest.ts` | 473 | Useful manifest, but a future asset-rule dumping ground risk. |
| `src/project/projectTypes.ts` | 433 | High fan-in saved/project type hub across disc and case systems. |

Notable improvement:

- `src/components/sidebar/ArtworkPanel.tsx` and
  `src/components/sidebar/BrandingPanel.tsx` are now thin composition files
  after recent splits. Their broad prop surfaces still live in
  `src/components/sidebar/artwork/types.ts` and
  `src/components/sidebar/branding/types.ts`.
- `src/project/projectCaseInsert.ts` is now an adapter/re-export surface over
  `src/caseInsert/*` and `src/project/caseInsertProjectAdapters.ts`, not the
  large mixed owner described in older audit text.
- `src/project/projectMediaMark.ts` is now media-mark-only behavior. Platform
  mark project defaults, transitions, normalization, render models, preview
  layer, and PNG drawing moved to platform-named owners.
- `src/components/sidebar/TextPanel.tsx` is now a small coordinator that keeps
  the top-level Text panel flow and delegates the repeated per-disc-text-element
  controls to `src/components/sidebar/DiscTextControl.tsx`.
- `src/hooks/useDiscPreviewSize.ts` now owns the disc preview `ResizeObserver`
  wiring that previously lived inside `src/app/App.tsx`.
- `src/hooks/useDiscTemplateState.ts` now owns selected/custom disc template
  state, derived guide overlay percentages, template reset/restore, and the
  custom-dimension geometry guardrail transition that previously lived inside
  `src/app/App.tsx`.

### Large prop and parameter surfaces

Current broad surfaces:

- `ArtworkPanelProps` in `src/components/sidebar/artwork/types.ts`: 47 top-level
  fields.
- `BrandingPanelProps` in `src/components/sidebar/branding/types.ts`: 67
  top-level fields.
- `TextPanelProps` in `src/components/sidebar/textPanelTypes.ts`: 26 top-level
  fields.
- `UseDiscPreviewPointerDragOptions` in
  `src/interaction/useDiscPreviewPointerDrag.ts`: still broad, with many nested
  feature bindings.
- `CreateProjectSnapshotParams` in `src/project/createProjectSnapshot.ts`: 36
  top-level fields.

Notable improvement:

- `DiscPreviewProps` in `src/components/preview/DiscPreview.tsx` has been
  grouped into 11 top-level objects. Continue that grouping pattern instead of
  adding new flat props.

### Duplicate and repeated code

No automated clone detector was added or run. Heuristic scans show repeated
control patterns worth cleaning only after ownership is clear:

- Range/slider triples for `scale`, `x`, and `y` recur across
  `src/components/sidebar/artwork/*`,
  `src/components/sidebar/branding/*`,
  `src/components/sidebar/DiscTextControl.tsx`,
  and `src/components/caseInsert/CaseInsertFrontPanel.tsx`.
- Selected-image status cards recur across artwork, branding, and case insert
  controls with similar markup and source/status wording.
- Reset-layout button patterns recur across background, title artwork,
  additional artwork, logo, rating, media, platform, technical, disc text, and
  case front controls.
- `CaseInsertFrontPanel.tsx` has local helpers such as `RangeField`,
  `FitSelect`, and `ImageSlotStatus`. Those are reasonable for the first case
  surface, but they should not be copied into back/spine panels without a small
  case-owned control helper.

Recommended action:

- Extract UI helpers only when they are presentation-only.
- Keep layout/clamp math, upload/import interpretation, source decisions, and
  project normalization out of shared control components.

### Dead code and stale assets

Current TypeScript dead-code safety is strong:

- `tsconfig.app.json` enables `noUnusedLocals` and `noUnusedParameters`.
- Lint and build passed, so obvious TypeScript-level dead code is not currently
  visible.

Remaining dead/stale-code risks are outside TypeScript's reach:

- `src/styles/App.css` references `./assets/app-shell/crowbar-toggle.png` as a
  string URL, causing the build-time unresolved asset warning.
- `src/styles/layoutFix.css` is imported in both `src/main.tsx` and
  `src/app/App.tsx`. This should be reviewed during #46 CSS cleanup so import
  order and override intent are explicit.
- `src/assets/scaffold/` is documented as retained scaffold/source assets and
  should not be deleted casually. Revisit only during an asset inventory.
- This audit was refreshed after the media/platform split, but generated build
  output and CSS assets remain outside TypeScript dead-code guarantees.

### Folder ownership

Current ownership is mostly clear enough to continue planning, but these areas
need discipline:

- `src/app/App.tsx` should stay orchestration. Do not add new feature-specific
  state transitions, upload/import logic, layout math, or export logic there.
- `src/caseInsert/` is the correct home for case defaults, normalization,
  transitions, image-slot helpers, text transitions, and case export settings.
- `src/project/projectCaseInsert.ts` should remain a compatibility adapter and
  re-export surface; do not grow new case behavior there.
- `src/project/projectTypes.ts` is a necessary type hub today. Avoid adding
  behavior there, and consider narrower type modules only when a concrete
  ownership move requires it.
- Media marks and operating-system marks now have separate project, render,
  preview, and export owners. Do not reintroduce platform exports through
  `src/project/projectMediaMark.ts`.
- `src/layout/discElementSafeZone.ts` should remain disc-specific. Do not reuse
  it for rectangular case layouts.
- `src/assets/assetManifest.ts` should remain a manifest for built-in assets,
  not a home for case-specific source rules or package-format policy.

### Tangled state

Most feature state has moved into hooks, but `App.tsx` still coordinates a wide
state graph:

- Workspace routing and home status.
- Disc preview measurement now lives in `src/hooks/useDiscPreviewSize.ts`.
- Disc template/custom dimensions now live in `src/hooks/useDiscTemplateState.ts`.
- Steam search/import and selected game state.
- Metadata and metadata-assistance state.
- Local Steam screenshot discovery state.
- Background, title artwork, additional artwork, logo, rating, media, platform,
  technical, disc text, banner, and case insert hook wiring.
- New project, reset, save, load, and export handlers.

Risk:

- Save/load/import/reset paths can miss a related state cluster when new case or
  disc systems are added.
- Persistent project state and transient UI/loading state still sit close
  together in the top-level component.

Recommended action:

- Continue #44 in small stages. Do not attempt a single App rewrite.
- Prefer one focused extraction per pass with all validation commands green.

### State ownership snapshot

Current state/data-flow categories after this pass:

- Persistent project state:
  - Disc template selection/custom dimensions now live in
    `src/hooks/useDiscTemplateState.ts`.
  - Feature-owned visual state mostly lives in hooks such as
    `useBackgroundArtwork`, `useSteamBannerState`, `useTitleArtwork`,
    `useAdditionalArtwork`, `useProjectLogoAssets`, `useRatingBadgeState`,
    `useMediaMarkState`, `usePlatformMarksState`, `useTechnicalMarks`, and
    `useDiscTextState`.
  - Project metadata and selected Steam game state still live in `App.tsx`
    because save/load, Steam import, metadata-bound text, rating/legal
    candidates, and case metadata all share them.
- Temporary UI state:
  - Workspace routing and home-screen status still live in `App.tsx`.
  - Toast/status state lives in `src/hooks/useStatusToasts.ts`.
  - Selected artwork, local screenshot check flags, and loading booleans still
    live near Steam/artwork orchestration in `App.tsx`.
- Derived state:
  - Disc template guide overlay percentages now live in
    `useDiscTemplateState`.
  - Background preview size/ranges/effective background image state live in
    `useBackgroundArtwork`.
  - Metadata-bound text values and resolved title state live in
    `useDiscTextState`.
- Import/search/loading state:
  - Steam search/import and local Steam screenshot orchestration still live in
    `App.tsx`; these are the next best #44 extraction once the selected game,
    metadata, artwork, and platform-mark side effects can move together.
  - Metadata assistance, web artwork discovery, and logo discovery already have
    focused hooks.
- Preview interaction state:
  - Pointer drag bindings live in `src/interaction/useDiscPreviewPointerDrag.ts`.
  - Disc preview measurement lives in `src/hooks/useDiscPreviewSize.ts`.
- Save/load/export orchestration:
  - Save/load/export handlers remain in `App.tsx` because they coordinate many
    state owners.
  - Serialization/restoration/export details remain in focused owners:
    `createProjectSnapshot`, `restoreProjectState`, `exportPreflight`, and
    `exportPng`.

### Stale docs

Fresh enough:

- `docs/PROJECT_FILE_SPEC.md` and `docs/TEMPLATE_SPEC.md` were refreshed on
  2026-06-03 and reflect current case insert groundwork.
- `docs/archive/CASE_INSERT_EDITOR_ARCHITECTURE.md` was refreshed on 2026-06-03 and
  now records the current `src/caseInsert/*` owners,
  `src/project/caseInsertProjectAdapters.ts`, and the
  `src/project/projectCaseInsert.ts` compatibility barrel.
- `docs/MANUAL_SMOKE_CHECKLISTS.md` records manual runtime smoke coverage for
  editor, artwork, branding, preview, save/load/export, and case insert flows.

Needs follow-up:

- `docs/archive/RENDER_ARCHITECTURE_AUDIT.md` was last refreshed on 2026-05-31 and may
  not fully describe the current case preview/front-cover paths.
- This plan should be kept current after the next major case editor issue closes
  or after #46/#44 cleanup changes land.

## Recommended Cleanup Order

### 1. Preserve the safety net

Goal: keep the current clean validation baseline visible.

Targets:

- `scripts/check-cycles.mjs`
- `package.json`
- CI or local validation docs if a dedicated cleanup workflow is later added.

Actions:

- Keep dependency cycles at zero.
- Run `npm run check:cycles`, `npm run lint`, `npm run test`, and
  `npm run build` after cleanup changes.
- Do not add new dependencies for cleanup analysis without an explicit reason.

Risk:

- Low. This is mostly process discipline.

### 2. Fix the current build warnings in a focused pass

Goal: remove existing warnings without changing app behavior.

Targets:

- `src/styles/App.css`
- `src/styles/layoutFix.css`
- `src/main.tsx`
- `src/app/App.tsx`
- `src/assets/app-shell/crowbar-toggle.png`
- `src/assets/assetManifest.ts` only if the asset route should move through the
  manifest instead of CSS string URLs.

Actions:

- Resolve the `crowbar-toggle.png` CSS path or route the toggle asset through an
  explicit import/manifest-backed path.
- Review why `layoutFix.css` is imported twice and make the import order
  intentional.
- Record whether the 573 kB chunk warning is acceptable for alpha or should be
  deferred until real route/code-splitting exists.

Risk:

- Medium. CSS ordering and asset URLs affect live visuals. Run build and ask for
  manual `npm run tauri dev` visual verification.

Related issue: #46.

### 3. Organize CSS without changing selectors

Goal: reduce `App.css` risk while preserving layout and visuals.

Targets:

- `src/styles/App.css`
- `src/styles/layoutFix.css`
- Optional new style files under `src/styles/`.

Actions:

- Split by ownership: app shell/home, sidebar panels, preview/layers, disc text,
  artwork/branding controls, case insert preview/editor, toasts, candidate
  picker.
- Move selectors first. Avoid changing values in the same pass.
- Keep import order explicit and documented in the importing file or stylesheet
  barrel.

Risk:

- Medium-high. CSS can create hidden layout behavior. This should be a focused
  #46 pass with manual visual checks.

Related issue: #46.

### 4. Continue App state extraction in small #44 stages

Goal: reduce `App.tsx` orchestration risk without behavior changes.

Targets:

- `src/app/App.tsx`
- Existing hooks under `src/hooks/`
- New focused hooks only where no owner exists.

Recommended order:

1. Steam search/import plus local screenshot discovery orchestration.
2. Save/load/export orchestration after the relevant state groups have owners.
3. Reset orchestration once save/load/export dependencies are clearer.

Risk:

- High if done broadly. Keep each pass small and run the full validation set.

Related issue: #44.

### 5. Protect active jewel-case feature work

Goal: avoid cleanup churn across files that are still actively expanding for
#126 and #136-#144.

Targets to avoid refactoring casually:

- `src/components/caseInsert/CaseInsertFrontPanel.tsx`
- `src/components/caseInsert/CaseInsertEditorShell.tsx`
- `src/components/preview/CaseInsertPreview.tsx`
- `src/components/preview/CaseInsertFrontPreviewLayers.tsx`
- `src/hooks/useJewelCaseFrontEditor.ts`
- `src/caseInsert/*`

Actions:

- Do not reorganize these files while a focused case issue is in progress unless
  the cleanup is required by that issue.
- When back/spine panels begin, extract small case-owned controls before copying
  `RangeField`, image-slot status, fit selection, or reset-layout patterns.
- Keep case behavior in `src/caseInsert/`, preview in case preview components,
  and project adapters in `src/project/caseInsertProjectAdapters.ts`.

Risk:

- Medium-high. Cleanup here can easily conflict with active feature work.

Related issues: #126, #136-#144, especially #138.

### 6. Reduce repeated control markup after ownership is stable

Goal: lower duplicate UI code without moving domain decisions into presentation.

Targets:

- `src/components/sidebar/artwork/*`
- `src/components/sidebar/branding/*`
- `src/components/sidebar/DiscTextControl.tsx`
- `src/components/caseInsert/CaseInsertFrontPanel.tsx`

Actions:

- Extract presentation-only range field, image status card, upload row, and
  reset-action helpers where repeated.
- Do not centralize feature-specific source labels, layout clamp math, or
  upload/import behavior in generic controls.

Risk:

- Medium. Good cleanup if scoped; risky if it turns into a hidden domain layer.

### 7. Keep the media/platform split honest

Goal: preserve the completed media/platform ownership split as nearby case and
branding work continues.

Targets:

- `src/project/projectMediaMark.ts`
- `src/project/projectPlatformMarks.ts`
- Platform imports in hooks, Steam inference, layout guards, render models,
  preview layers, export helpers, and tests.

Actions:

- Keep media-mark helpers in `projectMediaMark.ts`.
- Keep operating-system/platform helpers in `projectPlatformMarks.ts`.
- Preserve Steam platform inference and saved-project legacy normalization when
  changing platform marks.

Risk:

- Low-medium. The main risk is accidentally weakening Steam inference or legacy
  save/load coverage.

### 8. Refine disc safe-zone and drag ownership

Goal: reduce shared disc interaction risk while keeping preview/export parity.

Targets:

- `src/layout/discElementSafeZone.ts`
- `src/interaction/useDiscPreviewPointerDrag.ts`
- `src/interaction/dragGeometry.ts`
- Feature hooks for title artwork, additional artwork, logos, marks, and disc
  text.

Actions:

- Keep rectangular case layout separate from disc safe-zone helpers.
- Extract repeated per-feature drag setup only around existing `dragGeometry`
  primitives.
- Avoid changing clamp math and drag plumbing in the same pass unless tests are
  added for the affected feature.

Risk:

- High. This touches direct manipulation and must be manually verified.

### 9. Review Rust command organization

Goal: reduce backend file concentration when frontend feature churn is quiet.

Targets:

- `src-tauri/src/lib.rs`
- Potential modules listed in #47, such as file, Steam, local image, local Steam,
  and platform folder-opening commands.

Actions:

- Preserve Tauri command names and registration.
- Split by command family only if it makes the file easier to maintain.

Risk:

- Medium. Command names are frontend contracts.

Related issue: #47.

### 10. Defer schema/package decisions until case save/load pressure is clearer

Goal: keep reliability work planned without destabilizing current JSON projects.

Targets:

- `src/project/projectTypes.ts`
- `src/project/restoreProjectState.ts`
- `src/project/createProjectSnapshot.ts`
- `src/project/caseInsertProjectAdapters.ts`
- `docs/PROJECT_FILE_SPEC.md`

Actions:

- Add schema validation/migration only as focused #48 work.
- Keep `.sbls` package/container design under #56 until a concrete limitation
  appears.
- Preserve existing `0.1.0` projects.

Risk:

- High if mixed with feature work. Keep separate from active case UI/export
  implementation.

Related issues: #48, #56.

### 11. Leave `steamLogoCandidates.ts` alone unless a focused issue needs it

Goal: avoid behavior churn in parsing/filtering heuristics.

Target:

- `src/steam/steamLogoCandidates.ts`

Actions:

- If changed, split only along tested parser/classifier boundaries.
- Add tests before changing filtering rules.

Risk:

- Medium. The file is large but test-covered and behavior-sensitive.

## Intentionally Left Alone

- Source changes were limited to behavior-preserving ownership extraction for
  media marks, operating-system marks, disc preview sizing, disc template state,
  and disc text sidebar composition.
- No UI flow was changed.
- No broad refactor was started.
- No new dependency was added.
- No Tauri runtime/manual smoke was claimed.
- No stale dev-server process was stopped.
- No generated or ignored output was manually edited, though `npm run build`
  rebuilt `dist/` as part of validation.
