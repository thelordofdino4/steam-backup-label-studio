# Codebase Spaghetti Audit

Date: 2026-06-03

Scope: planning-only audit after the conservative cleanup pass. No runtime behavior changes were made.

Issue context reviewed: #44, #46, #47, #48, #56, #124, #125, #126, #135-#144, #17.

## 1. Highest-risk spaghetti areas

### `src/app/App.tsx`

Risk: highest.

Current signals:

- 2,120 lines.
- 58 internal imports.
- Owns workspace routing, template/custom dimension state, Steam search/import, metadata candidate application, local screenshot discovery, save/load/export orchestration, disc text updates, and reset flows.
- Still has many state setters that must stay in sync during new project, Steam import, load project, and export paths.

Why risky:

- A future case-editor or project-file change can accidentally miss one of the manual set-state paths.
- Persistent project state and temporary UI/search/loading state are adjacent, which makes it harder to tell what must be serialized.
- `handleSaveProject`, `handleLoadProject`, and `handleExportPng` require wide knowledge of nearly every feature.

Do not rewrite this file wholesale. Prefer extracting one focused hook or action group at a time.

### `src/components/sidebar/ArtworkPanel.tsx`

Risk: high.

Current signals:

- 1,372 lines.
- `ArtworkPanelProps` has 47 top-level fields.
- Contains background controls, web candidates, imported Steam artwork, local screenshot controls, title artwork controls, additional artwork controls, formatting helpers, picker item construction, and repeated slider/input patterns.

Why risky:

- It is nominally presentational, but it owns enough view-model construction that behavior can hide in UI code.
- Adding case artwork slots or shared asset-library behavior here would make the panel a second asset-management owner.

### `src/components/sidebar/BrandingPanel.tsx`

Risk: high.

Current signals:

- 1,036 lines.
- `BrandingPanelProps` has 67 top-level fields.
- Contains Steam banner controls, logo candidate controls, rating badge controls, media mark controls, platform mark controls, technical mark controls, formatting helpers, and local UI memory (`lastPlacement`, `rememberedValues`).

Why risky:

- Branding contains several distinct feature families that are likely to be reused or adapted for case regions.
- Panel-local remembered state for platform/technical mark restoration is behavior-adjacent; it is easy to lose or duplicate when splitting panels.

### `src/components/preview/DiscPreview.tsx` and `src/interaction/useDiscPreviewPointerDrag.ts`

Risk: high.

Current signals:

- `DiscPreviewProps` has 61 top-level fields.
- `useDiscPreviewPointerDrag` is 686 lines and its options object has 23 fields.
- The drag hook repeats the same pattern for background, disc text, logos, title artwork, additional artwork, rating badges, media marks, platform marks, and technical marks.

Why risky:

- Adding another movable visual system means touching a wide hook and a wide preview prop surface.
- Preview, interaction, layout clamping, and feature-specific project transitions are close enough that a small drag fix can affect unrelated layers.

### `src/project/projectCaseInsert.ts`

Risk: high for the next phase.

Current signals:

- 1,228 lines.
- Mixes case insert defaults, normalization, image slot transitions, text block/list transitions, export settings, snapshot creation, blank project creation, and restore logic.

Why risky:

- Jewel case issues #135-#144 will likely expand this file quickly if it is not split first.
- Case insert behavior currently lives under `src/project/`, but much of it is case-editor domain behavior rather than project-file-only behavior.

### `src/project/projectMediaMark.ts`

Risk: medium-high.

Current signals:

- 964 lines.
- Owns media mark options/state and platform mark options/state, including legacy normalization and Steam inference state handling.
- 18 inbound imports.

Why risky:

- Media marks and platform marks are separate user-visible feature families.
- Future case adaptation may need region-specific mark behavior and can accidentally expand this combined module further.

### `src/layout/discElementSafeZone.ts`

Risk: medium-high.

Current signals:

- 906 lines.
- 17 inbound imports.
- Handles slider ranges and clamps for text, logos, title artwork, additional artwork, rating badges, media marks, platform marks, and technical marks.
- Imports `measureDiscTextWithBrowserCanvas` from `src/discText/svgLayer.ts`, which pulls layout toward rendering.

Why risky:

- It is a critical shared safety owner, but it knows many project feature shapes.
- Reusing this for case regions would be the wrong direction; case safety should stay rectangular/case-owned.

### `src/styles/App.css`

Risk: medium-high.

Current signals:

- 1,933 lines.
- Contains app shell, sidebar panels, case preview, disc preview, toast, text controls, image candidate picker, branding controls, and layer selectors.
- Has many absolute positioning, pointer-events, and hardcoded z-index selectors.

Why risky:

- CSS can override the shared layer-order model or preview/export assumptions without TypeScript catching it.
- Issue #46 is still open and should remain a focused CSS organization task.

### `src/steam/steamLogoCandidates.ts`

Risk: medium.

Current signals:

- 1,477 lines.
- Contains scraping/parsing/filtering heuristics for Steam and official-site logo candidates.
- Test coverage is strong, but the file is still dense.

Why risky:

- Regex and HTML extraction changes can easily broaden or narrow candidate results unexpectedly.
- This should be split only around tested classifier/parser boundaries, not style preference.

## 2. Ownership problems

- `src/discText/index.ts` mixes shared disc text types/constants with default layout creation by importing `src/layout/discTemplateLayoutDefaults.ts`. This contributes to circular dependencies and makes the disc text module less neutral.
- `src/project/projectTypes.ts` is a high-fan-in type hub with 83 inbound imports. It contains disc feature shapes, case insert shapes, saved project shapes, and asset provenance types. This is understandable today, but future case work will make it harder to change safely.
- `src/project/projectCaseInsert.ts` contains case-editor domain state transitions, not only project-file normalization/snapshot behavior. Future case-specific logic should move toward `src/caseInsert/` or another case-owned folder while keeping save/load adapters in `src/project/`.
- `src/project/projectMediaMark.ts` combines media marks and platform marks. These are related but not identical feature owners.
- `src/layout/discElementSafeZone.ts` imports many project feature types and render-related text measurement. It should remain disc-owned; do not generalize it for case layouts.
- `src/components/sidebar/*Panel.tsx` files contain formatting and picker view-model helpers. Some of these helpers are neutral UI helpers, but feature-specific source/restore decisions should stay in project/domain modules or hooks.
- `src/assets/assetManifest.ts` is currently a useful manifest, not a junk drawer. It will become one if case-specific asset rules, source labels, or replacement behavior are added there without a narrower asset-domain owner.

## 3. State-management problems

- `App.tsx` mixes persistent state (`projectMetadata`, visual feature state, disc text state, case insert state) with transient state (`activeWorkspace`, `homeStatusMessage`, search queries/loading flags, artwork loading flags, selected artwork UI state, screenshot discovery/loading state).
- Project save/load currently depends on wide parameter collection in `createProjectSnapshot` and many manual setter calls in `handleLoadProject`. This is functional but fragile.
- Disc text has multiple related sources of truth: `discTextValues`, `discTextValueSources`, `discTextTitleValue`, `projectMetadata`, and `selectedSteamGame`. The metadata-bound helpers are good, but the state still lives across App handlers and panel inputs.
- Steam import updates multiple systems at once: selected game, manual title, metadata, artwork, title artwork, platform marks, disc text values, and metadata candidate auto-apply. That behavior should stay grouped behind a focused import orchestration hook before more import features are added.
- `BrandingPanel.tsx` owns UI memory for restoring the last Steam banner placement and remembered platform/technical mark selections. That may be acceptable temporary UI state, but it should be documented or moved to a small hook before panel splitting.
- Case insert state is currently one `projectJewelCase` object in `App.tsx`, while shared metadata and selected game state live separately. Future case save/load and editor tabs will need a clearer case editor state owner.

## 4. Dependency problems

A read-only relative import graph scan found these cycles:

- `src/discText/index.ts` -> `src/layout/discTemplateLayoutDefaults.ts` -> `src/disc/geometry.ts` -> `src/discText/index.ts`
- `src/discText/index.ts` -> `src/layout/discTemplateLayoutDefaults.ts` -> `src/disc/geometry.ts` -> `src/discText/styles.ts` -> `src/discText/index.ts`
- `src/discText/index.ts` -> `src/layout/discTemplateLayoutDefaults.ts` -> `src/discText/index.ts`
- `src/discText/index.ts` -> `src/layout/discTemplateLayoutDefaults.ts` -> `src/project/projectTypes.ts` -> `src/discText/index.ts`
- `src/project/projectTypes.ts` -> `src/project/metadataDiscText.ts` -> `src/project/projectTypes.ts`

Notes:

- Some edges are type-only and the app still builds, so this is not an emergency runtime bug.
- The cycles are still harmful because they hide ownership and make future moves riskier.
- The safest fix is likely type/constants extraction, not module merging.

Other dependency signals:

- `components -> project`: 36 relative imports.
- `layout -> project`: 30 relative imports.
- `export -> project`: 26 relative imports.
- `layout -> discText`: 21 relative imports.
- `App.tsx`: 58 internal imports.

These are not all wrong. They show where ownership boundaries need to stay explicit.

## 5. Complexity problems

Oversized files and prop surfaces:

- `src/app/App.tsx`: 2,120 lines.
- `src/steam/steamLogoCandidates.ts`: 1,477 lines.
- `src/components/sidebar/ArtworkPanel.tsx`: 1,372 lines, 47 props.
- `src/project/projectCaseInsert.ts`: 1,228 lines.
- `src/components/sidebar/BrandingPanel.tsx`: 1,036 lines, 67 props.
- `src/project/projectMediaMark.ts`: 964 lines.
- `src/layout/discElementSafeZone.ts`: 906 lines.
- `src/components/sidebar/TextPanel.tsx`: 681 lines, 25 props.
- `src/components/preview/DiscPreview.tsx`: 61 props.
- `src/interaction/useDiscPreviewPointerDrag.ts`: 23 option fields.
- `src/project/createProjectSnapshot.ts`: 34 parameter fields.

Specific complexity clusters:

- `App.tsx` handlers around disc text updates, metadata candidate auto-apply, Steam import, save/load, and export are each understandable alone but risky together.
- `BrandingPanel.tsx` repeats similar slider/source/upload/reset UI for rating, media, platform, and technical marks.
- `ArtworkPanel.tsx` repeats picker/source/slider patterns for background, title artwork, and additional artwork.
- `discElementSafeZone.ts` mixes slider-range calculation and clamp behavior for many feature families.
- `useDiscPreviewPointerDrag.ts` repeats feature-specific drag setup and handler creation.
- `projectCaseInsert.ts` is already large before the case editor is fully implemented.

## 6. Optimization opportunities

### Safe quick wins

- Break the disc text/project type cycles by extracting type-only definitions and constants. Preserve public exports from current modules to keep imports stable.
- Memoize or extract DiscPreview derived view-model creation where practical, especially `createDiscTextOccupiedRegions` in `src/components/preview/DiscPreview.tsx`.
- Extract repeated numeric slider/input handlers from `ArtworkPanel.tsx` and `BrandingPanel.tsx` into small panel-local helpers or focused controls. Keep this presentation-only.
- Split CSS by ownership while preserving import order: app shell, sidebar panels, preview/layers, disc text controls, candidate picker, case preview.
- Add a small dependency-cycle check script or documented audit command once the known cycles are fixed.

### Needs deeper refactor

- App-level state grouping. Do not change all state at once; start with one feature hook.
- Project snapshot/load parameter reduction. This should follow state ownership cleanup, not precede it.
- Shared preview/export render models for layers that still have separate DOM and canvas logic.
- Case insert module split. Do this before implementing the next large case editor issues.
- Project schema validation and migrations (#48). This is important but should remain a planned project-file task.

## 7. Recommended follow-up tasks

Priority 1: Break current circular imports safely.

- Extract disc text types and stable constants from `src/discText/index.ts` into `src/discText/types.ts` and/or `src/discText/constants.ts`.
- Update `src/layout/discTemplateLayoutDefaults.ts`, `src/disc/geometry.ts`, `src/discText/styles.ts`, `src/project/projectTypes.ts`, and `src/project/metadataDiscText.ts` to import from the neutral files where possible.
- Keep re-exports from `src/discText/index.ts` to avoid a broad import churn.
- Run `npm run lint`, `npm run test`, and `npm run build`.

Priority 2: Extract disc text App handlers into a focused hook.

- Target only `App.tsx` disc text state and handlers around `discTextSettings`, `discTextValues`, `discTextValueSources`, `discTextTitleValue`, `discTextLayout`, `discTextStyles`, and disc-number artwork.
- Keep current state shape and props unchanged initially.
- Do not change text behavior or UI.
- Run existing disc text, layout, project restore, lint, and build checks.

Priority 3: Split `BrandingPanel.tsx` by feature sections.

- Move `SteamBannerControls`, logo controls, rating controls, media/platform controls, and technical controls into sibling files under `src/components/sidebar/branding/`.
- Keep `BrandingPanel.tsx` as composition only.
- Preserve prop names during the first split.
- Do not move domain behavior into UI files.

Priority 4: Split `ArtworkPanel.tsx` by feature sections.

- Move background artwork controls, imported artwork sections, title artwork controls, and additional artwork controls into sibling files under `src/components/sidebar/artwork/`.
- Keep helper extraction local unless a helper is clearly neutral and reused.
- Preserve current props and event flow in the first pass.

Priority 5: Reduce `DiscPreview` and pointer-drag prop surfaces.

- Create small grouped prop objects for preview feature families: background, artwork, logos, marks, text, and pointer handlers.
- Alternatively split the drag hook into per-feature hooks that share a small drag math helper.
- Keep preview/export layer order unchanged.

Priority 6: Split case insert project ownership before expanding case UI.

- Move case insert defaults, normalization, transitions, and snapshot/restore adapters into separate case-owned modules.
- Keep project-file adapter exports stable through `src/project/projectCaseInsert.ts` during the migration.
- This should happen before broad work on #135-#144.

Priority 7: Split media marks from platform marks.

- Extract platform mark options, defaults, transitions, and normalization into `src/project/projectPlatformMarks.ts`.
- Keep compatibility re-exports from `projectMediaMark.ts` for one commit if needed.
- Add focused tests if any imports move.

Priority 8: Organize CSS under #46.

- Split `src/styles/App.css` into feature-owned CSS files with explicit import order from `src/main.tsx` or a stylesheet barrel.
- Start with low-risk groups: app shell/sidebar, preview/layers, disc text controls, case preview, candidate picker.
- Do not change selectors and values in the same pass as moving them.

Priority 9: Project snapshot/load state grouping.

- After feature hooks exist, introduce a small project-state adapter that builds save/export/restore inputs from grouped state.
- This should reduce the 34-field `CreateProjectSnapshotParams` surface without changing the saved schema.

Priority 10: Keep `steamLogoCandidates.ts` stable unless a focused issue requires it.

- If modified, split only tested parser/classifier sections.
- Add tests before changing candidate filtering rules.

## Intentionally left alone

- No code changes were made during this audit.
- No UI redesign was attempted.
- No App.tsx behavior was extracted in this pass because the request was for audit/planning, not implementation.
- The disc and case/template modules were kept separate.
- `steamLogoCandidates.ts` was not split despite its size because it is test-covered and changes there are behavior-sensitive.
- CSS was not reorganized because selector ordering and z-index interactions need their own focused #46 pass.
