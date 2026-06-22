# Repository Architecture Inventory
> Status: Conditional as-built repository inventory.
> Purpose: File ownership and implementation map for finding existing owners.
> Read when: Before refactors, ownership changes, or architecture-sensitive edits.
> Authoritative source: Current source for exact facts; SDD for architecture contracts.
> Last reviewed against commit: `8393cb9a8d89f56e80af62df01cc32fb0a63015a`.


This inventory records how Steam Backup Label Studio is implemented in the repository at the time of review. It is evidence gathering for a future Software Design Document, not a roadmap.

## Basis

- Branch: `main`
- HEAD commit at original inventory draft: `94fa3cf2c9936aa281d2da017f189e91b491edfc`
- WYSIWYG text sections were refreshed after PR `#186` was merged into `main`
  at `40fd7e4ca44648a4fa0061696bc1aa4583ff8d45`.
- Working tree note: the checkout had pre-existing working-tree noise before this file was created. Some source paths appeared in `git status` even when `git diff` showed no content changes for those files. Status-only/no-diff paths are not treated as meaningful dirty source changes in this inventory; only paths with actual content diffs should be treated as uncommitted source changes.
- This file is based on repository files and live issue review. Unknowns are marked as unknown.
- No runtime, browser, or Tauri manual verification was performed during this
  inventory refresh. Runtime observations for WYSIWYG text come from the PR
  `#186` merge report.

## Open Issue Context

Open GitHub issues were reviewed during this task. Related open issues include:

- `#44` Extract remaining editor state into focused hooks.
- `#46` Organize CSS after component extraction.
- `#48` Add project schema validation and migration support.
- `#125` Disc marks: add historical technology mark catalog and missing mark families.
- `#126` Jewel case editor: define case-front, case-back, and spine alpha finish line.
- `#149` Case inserts: replace auto-stacked imported content with structured tray and spine layouts.
- `#172` Preview editing: add selection, snapping, and keyboard nudging.
- `#174`, `#175`, `#176` Preview inspector/context-menu/sidebar workflow improvements.
- `#178`, `#181`, `#184` Text-system improvements around fonts, copy fitting, and add-only preview editing.

## Package Scripts and Validation

Purpose: define local development, build, lint, test, and Tauri commands.

Key files:

- `package.json`
- `vite.config.ts`
- `scripts/check-cycles.mjs`
- `eslint.config.js`
- `tsconfig*.json`

Implemented scripts:

- `npm run dev`: starts Vite.
- `npm run build`: runs `tsc -b && vite build`.
- `npm run check:cycles`: runs `node scripts/check-cycles.mjs`.
- `npm run lint`: runs `eslint .`.
- `npm run test`: runs Node's built-in test runner with `--experimental-strip-types` over an explicit list of `.test.ts` files.
- `npm run preview`: starts `vite preview`.
- `npm run tauri`: invokes the Tauri CLI.

Validation model:

- Tests are explicit file arguments in `package.json`; newly added tests must be added there to run under `npm run test`.
- `scripts/check-cycles.mjs` scans relative imports in `src/**/*.ts(x)` and fails on import cycles.
- No docs-only validation command is defined.

Risks:

- The explicit test list can miss newly created tests if package metadata is not updated.
- Cycle detection is separate from `npm run test` and `npm run lint`.

## Tauri, Vite, and React Entry Points

Purpose: launch the React app in Vite and package it through Tauri.

Key files:

- `index.html`
- `src/main.tsx`
- `src/app/App.tsx`
- `vite.config.ts`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/*.rs`

Source-of-truth state:

- React app state is owned in `src/app/App.tsx` plus feature hooks imported by `App`.
- Native state is not persisted in Rust; Rust commands perform filesystem, HTTP, and platform integration work on request.

Render path:

- `index.html` exposes `#root`.
- `src/main.tsx` imports global CSS and renders `<App />` under React `StrictMode`.
- `src/app/App.tsx` routes between home, disc editor, and case insert editor UI.

Native command path:

- `src-tauri/src/main.rs` calls `app_lib::run()`.
- `src-tauri/src/lib.rs` registers file, Steam, local Steam, local image, folder opening, and official-site logo discovery commands.
- Command owners are split into `commands/files.rs`, `commands/steam.rs`, `commands/local_steam.rs`, `commands/local_images.rs`, `commands/official_site.rs`, and `platform/open_folder.rs`.

Risks:

- Tauri command behavior was not runtime-verified here.
- `src-tauri/tauri.conf.json` runs Vite before dev and build, so stale frontend build/runtime state must be checked separately during user-visible fixes.

## App-Level State Ownership

Purpose: orchestrate workspace selection, editor feature hooks, save/load, Steam import, export, and panel/preview wiring.

Key files:

- `src/app/App.tsx`
- `src/editor/editorTypes.ts`
- `src/hooks/useStatusToasts.ts`
- `src/hooks/useDiscTemplateState.ts`
- `src/hooks/useBackgroundArtwork.ts`
- `src/hooks/useDiscTextState.ts`
- `src/hooks/useProjectLogoAssets.ts`
- `src/hooks/useRatingBadgeState.ts`
- `src/hooks/useMediaMarkState.ts`
- `src/hooks/usePlatformMarksState.ts`
- `src/hooks/useTechnicalMarks.ts`
- `src/hooks/useTitleArtwork.ts`
- `src/hooks/useAdditionalArtwork.ts`
- `src/hooks/useCaseInsertTemplateEditor.ts`
- `src/hooks/useJewelCaseSpineEditor.ts`
- `src/hooks/useCaseInsertBrandingMarkSync.ts`

Source-of-truth state:

- `App.tsx` owns workspace state, selected game, project metadata, selected case insert pane, selected text target, export guide settings, project jewel case state, local screenshot state, and many cross-feature callbacks.
- Focused hooks own feature-specific state slices for disc template, Steam banner, background artwork, disc text, title artwork, additional artwork, logos, rating badge, media mark, platform marks, technical marks, case insert template editing, spine editing, and case insert branding sync.

Render path:

- Home workspace renders `HomeScreen`.
- Disc workspace renders sidebar panels and `DiscPreview`.
- Case insert workspace renders `CaseInsertEditorShell`.

Edit/interaction path:

- Sidebar controls call callbacks from `App.tsx` and feature hooks.
- Preview drag callbacks are composed through `useDiscPreviewPointerDrag` and `useCaseInsertPreviewPointerDrag`.
- Steam import callbacks in `App.tsx` call Steam/native helpers and then update disc or case-insert state slices.

Save/load path:

- `App.tsx` calls disc and case insert project snapshot/restore helpers, then Tauri file commands.

Export path:

- `App.tsx` calls disc or case-insert preflight helpers, confirms warnings, runs PNG export helpers, and writes bytes through Tauri.

Tests:

- Coverage is mostly in focused domain/helper tests, not full `App.tsx` integration tests.

Risks:

- `src/app/App.tsx` is still large, around 2067 lines in this checkout, and remains a cross-feature orchestration point.
- Open issue `#44` tracks further state extraction.

## Project Save/Load Model

Purpose: persist editor projects as JSON and restore them into current editor state.

Key files:

- `src/project/projectTypes.ts`
- `src/project/projectSchema.ts`
- `src/project/createProjectSnapshot.ts`
- `src/project/restoreProjectState.ts`
- `src/project/caseInsertProjectAdapters.ts`
- `src/project/projectRouting.ts`
- `src/project/savedProjectNormalization.ts`
- `src/project/projectCaseInsert.ts`
- `src/diagnostics/projectParityHarness.ts`
- `src-tauri/src/commands/files.rs`
- `docs/PROJECT_FILE_SPEC.md`

Source-of-truth state:

- `SavedProjectBase`, `SavedDiscProject`, `SavedCaseInsertProject`, `ProjectMetadata`, and case-insert project types live in `src/project/projectTypes.ts`.
- `CURRENT_PROJECT_SCHEMA_VERSION` is `0.1.0` in `src/project/projectSchema.ts`.
- `PROJECT_SCHEMA_MIGRATIONS` is currently empty.

Render path:

- Saved data is restored into hook/App state, then rendered by the normal preview components.

Edit/interaction path:

- Edits update runtime state first. Snapshots are produced only when saving.

Save/load path:

- Disc save uses `createProjectSnapshot`.
- Disc load uses `parseSavedProjectContents`, `resolveSavedProjectRouteFromContents`, and `restoreProjectStateFromContents`.
- Case-insert save/load uses `createCaseInsertProjectSnapshot` and `restoreCaseInsertProjectStateFromContents`.
- Tauri `write_project_file` and `read_project_file` perform filesystem I/O.

Serialization:

- Current files are plain `.sbls.json` JSON projects.
- Imported image data is stored as data URLs where supported.
- Durable local source file paths are avoided through asset provenance helpers.
- Future package-style `.sbls` behavior is not implemented in the current files reviewed.

Tests:

- `src/project/projectSchema.test.ts`
- `src/project/projectRouting.test.ts`
- `src/project/restoreProjectState.test.ts`
- `src/project/savedProjectNormalization.test.ts`
- `src/project/projectCaseInsert.test.ts`
- `src/diagnostics/projectParityHarness.test.ts`
- Feature-specific project tests for title artwork, additional artwork, logos, media marks, rating badges, technical marks, visual asset import, and metadata-bound disc text.

Risks:

- Schema validation is shallow compared with the number of nested editor states.
- Migration support exists structurally but has no migrations.
- Open issue `#48` tracks schema validation and migration support.

## Templates and Workspace Types

Purpose: define editor workspaces and print template geometry.

Key files:

- `src/editor/editorTypes.ts`
- `src/types/template.ts`
- `src/templates/discTemplates.ts`
- `src/templates/caseInsertTemplates.ts`
- `src/templates/templateModel.ts`
- `src/layout/*`

Source-of-truth state:

- `EditorWorkspace` supports `home`, `disc`, and `caseInsert`.
- `EditorProjectType` supports `disc` and `caseInsert`.
- Disc templates include standard printable, sticky label, LightScribe, and custom geometry support.
- The available case insert template is `jewelCase`; DVD Amaray and Blu-ray are represented as unavailable template options.

Render path:

- Disc geometry flows through disc template layout and safe-zone helpers.
- Jewel case geometry flows through case-insert template and jewel-case layout helpers.
- Neutral slider/range clamping, step rounding, finite fallback helpers, and range value precision live in `src/layout/layoutRangeMath.ts`; disc and case modules still interpret those numbers in their own geometry.

Edit/export path:

- Template changes update runtime state and drive preview/export dimensions and safe-zone clamps.

Tests:

- `src/templates/templateModel.test.ts`
- `src/templates/caseInsertTemplates.test.ts`
- `src/layout/discTemplateGeometryGuardrail.test.ts`
- `src/layout/discTemplateLayoutDefaults.test.ts`
- `src/layout/jewelCaseLayout.test.ts`
- `src/layout/caseInsertElementSafeZone.test.ts`
- `src/layout/caseInsertPreviewLayout.test.ts`
- `src/layout/layoutRangeMath.test.ts`

Risks:

- Disc and case insert editors use separate geometry paths; parity depends on shared neutral helpers and tests without merging circular and rectangular geometry.

## Disc Editor Modules

Purpose: build printable disc labels with background art, Steam banner branding, images, text, logos, badges, marks, guides, and PNG export.

Key files:

- `src/app/App.tsx`
- `src/components/preview/DiscPreview.tsx`
- `src/components/preview/DiscTextLayer.tsx`
- `src/components/preview/BackgroundLayer.tsx`
- `src/components/preview/SteamBannerPreview.tsx`
- `src/components/preview/TitleArtworkLayer.tsx`
- `src/components/preview/AdditionalArtworkLayer.tsx`
- `src/components/preview/LogoAssetLayer.tsx`
- `src/components/preview/RatingBadgeLayer.tsx`
- `src/components/preview/MediaMarkLayer.tsx`
- `src/components/preview/PlatformMarksLayer.tsx`
- `src/components/preview/TechnicalMarksLayer.tsx`
- `src/components/sidebar/*Panel.tsx`
- `src/editor/layerOrder.ts`
- `src/export/exportPng.ts`
- `src/export/exportPreflight.ts`
- `src/export/discDesignCheck.ts`

Source-of-truth state:

- Runtime state is split between `App.tsx` and disc feature hooks.
- Persisted state is `SavedDiscProject` in `src/project/projectTypes.ts`.

Render path:

- `DiscPreview` composes preview layers using `DISC_EDITOR_PREVIEW_LAYER_ORDER`.
- Disc text preview resolves metadata-bound values before rendering.
- Design warnings and guide legend panels are rendered inside the preview shell.

Edit/interaction path:

- Sidebar panels update feature-hook state.
- Preview dragging flows through `useDiscPreviewPointerDrag`.
- Inline straight disc text editing uses `DiscInlineTextEditorLayer` and shared `InlinePreviewTextEditor`.

Save/load path:

- Save: `createProjectSnapshot`.
- Load: `restoreProjectStateFromContents`.

Export path:

- Preflight: `buildExportPreflightSummary` and `buildDiscExportWarnings`.
- Design check: `buildDiscDesignCheckSummary`.
- PNG: `exportDiscLabelPngBytes`, with canvas drawing helpers for each visual layer and optional guide drawing.

Tests:

- Disc text tests under `src/discText/*.test.ts`.
- Disc export/preflight/design tests under `src/export/*disc*.test.ts` and `src/export/exportPreflight.test.ts`.
- Layout tests for disc safe zones, occupied regions, and template geometry.
- Feature tests for background artwork, title artwork, logos, rating badge, media marks, platform marks, technical marks, and image imports.

Risks:

- Preview and canvas export paths are separate implementations coordinated by layer order and tests.
- Text layout has several browser-measurement and SVG/canvas paths.
- Runtime drag and visual parity still require manual verification.

## Case Insert Editor Modules

Purpose: build jewel case cover, tray, and spine artwork/text/branding layouts with PNG export.

Key files:

- `src/components/caseInsert/CaseInsertEditorShell.tsx`
- `src/components/caseInsert/CaseInsertTemplateControls.tsx`
- `src/components/caseInsert/CaseInsertSpineControls.tsx`
- `src/components/preview/CaseInsertPreview.tsx`
- `src/components/preview/CaseInsertTemplatePreviewLayers.tsx`
- `src/components/preview/CaseInsertSpinePreviewLayer.tsx`
- `src/components/preview/CaseInsertSteamBannerPreviewLayer.tsx`
- `src/components/preview/CaseInsertGuideOverlay.tsx`
- `src/hooks/useCaseInsertTemplateEditor.ts`
- `src/hooks/useJewelCaseSpineEditor.ts`
- `src/hooks/useCaseInsertBrandingMarkSync.ts`
- `src/caseInsert/*.ts`
- `src/layout/jewelCase*.ts`
- `src/layout/caseInsert*.ts`
- `src/export/exportCaseInsertPng.ts`
- `src/export/caseInsertExportPreflight.ts`
- `src/export/caseInsertDesignCheck.ts`
- `docs/CASE_INSERT_EDITOR_LAYER_ORDER.md`
- Historical planning context, if needed: `docs/archive/CASE_INSERT_EDITOR_ARCHITECTURE.md`

Source-of-truth state:

- `ProjectJewelCaseState` and related types live in `src/project/projectTypes.ts`.
- Defaults and normalization live in `src/caseInsert/defaults.ts` and `src/caseInsert/normalization.ts`.
- Cover/tray surface transitions live in `src/caseInsert/templateSurfaceTransitions.ts`.
- Spine transitions live in `src/caseInsert/jewelCaseTransitions.ts`.

Render path:

- `CaseInsertPreview` renders active cover/tray/spine pane content.
- `CaseInsertTemplatePreviewLayers` renders template background, artwork, branding, marks, and text.
- `CaseInsertSpinePreviewLayer` renders left and right spine content.
- Layer order is defined in `src/editor/layerOrder.ts`.

Edit/interaction path:

- `CaseInsertEditorShell` wires project, export, game, artwork, branding, text, and guide controls.
- `useCaseInsertTemplateEditor` owns cover/tray actions.
- `useJewelCaseSpineEditor` owns spine actions.
- `useCaseInsertBrandingMarkSync` maps shared/global branding sources into case-insert slots.
- Preview dragging flows through `useCaseInsertPreviewPointerDrag`.

Save/load path:

- Save: `createCaseInsertProjectSnapshot`.
- Load: `restoreCaseInsertProjectStateFromContents`.
- Normalization fills sparse or legacy-shaped case insert state.

Export path:

- Preflight: `buildCaseInsertExportPreflightSummary` and `buildCaseInsertExportWarnings`.
- Design check: `buildCaseInsertDesignCheckSummary`.
- PNG: `exportCaseInsertPngBytes`, which draws surface base, backgrounds, artwork, Steam banner, slot groups, text, spine content, and export guides.

Tests:

- `src/caseInsert/*.test.ts`
- `src/export/caseInsertDesignCheck.test.ts`
- `src/export/caseInsertExportPreflight.test.ts`
- `src/export/drawCaseInsertSteamBanner.test.ts`
- `src/layout/caseInsertPreviewLayout.test.ts`
- `src/layout/caseInsertTextVisualLayout.test.ts`
- `src/layout/jewelCaseBackLayout.test.ts`
- `src/layout/jewelCaseLayout.test.ts`
- `src/layout/jewelCaseSteamBannerLayout.test.ts`

Risks:

- `useCaseInsertTemplateEditor.ts`, `useJewelCaseSpineEditor.ts`, and `useCaseInsertBrandingMarkSync.ts` are each over 1300 lines in this checkout.
- `exportCaseInsertPng.ts` is around 963 lines and mirrors many preview/layout concerns.
- Open issues `#126` and `#149` indicate case insert parity and structured layout work is still active.

## Text Systems

Purpose: manage disc text, case insert text, metadata-bound values, inline preview editing, readability, and canvas/SVG export.

Key files:

- `src/discText/index.ts`
- `src/discText/renderLayout.ts`
- `src/discText/svgLayer.ts`
- `src/discText/curvedTextLayout.ts`
- `src/discText/styles.ts`
- `src/discText/discNumberArtwork.ts`
- `src/discText/sidebarControlPolicy.ts`
- `src/hooks/useDiscTextState.ts`
- `src/project/metadataDiscText.ts`
- `src/components/preview/DiscTextLayer.tsx`
- `src/components/preview/DiscInlineTextEditorLayer.tsx`
- `src/components/preview/discInlineTextEditorControls.ts`
- `src/components/preview/InlinePreviewTextEditor.tsx`
- `src/components/preview/inlinePreviewTextEditorContract.ts`
- `src/components/preview/caseInsertInlineTextEditorControls.ts`
- `src/caseInsert/textTransitions.ts`
- `src/caseInsert/sidebarControlPolicy.ts`
- `src/caseInsert/textLayout.ts`
- `src/caseInsert/textSizing.ts`
- `src/caseInsert/textStyles.ts`
- `src/caseInsert/textRenderStyles.ts`
- `src/caseInsert/textReadability.ts`
- `src/caseInsert/textContent.ts`
- `src/caseInsert/previewTextSelection.ts`
- `src/caseInsert/previewTextEditing.ts`
- `src/text/contextualTextControlViewModel.ts`
- `src/text/htmlText.ts`
- `src/text/richTextRunStyle.ts`
- `docs/TEXT_EDITOR_CONTRACT.md`

Source-of-truth state:

- Disc text runtime state is owned by `useDiscTextState`.
- Disc persisted text data lives in `SavedDiscProject.discText`.
- Case insert text block/list state lives inside `ProjectJewelCaseState`.
- Case insert rectangular text sizing is stored as typographic points on
  text layout state. Legacy scale-only saved projects are normalized into point
  sizes by `src/caseInsert/textSizing.ts`; image scale semantics remain
  separate.
- Straight and curved disc text sizing is stored as `fontSizePt` on disc text
  layout state and resolved by `src/discText/pointSize.ts`. Legacy disc
  scale-only layouts are normalized into apparent-equivalent point sizes while
  disc `scale` remains available for remaining geometry responsibilities.
- Metadata binding rules for disc text live in `src/project/metadataDiscText.ts`.

Render path:

- Disc text renders through `DiscTextLayer`, SVG text helpers, and an inline
  adapter for selected straight text. The SVG/final preview renderer remains
  the visible glyph source during straight-disc editing.
- Disc text render helpers convert point sizes through the selected disc
  template export DPI before producing SVG/tspan or SVG/textPath geometry, so
  preview and PNG export share the same resolved font-size model.
- Case insert text renders through template/spine preview layers and computed visual layout helpers.
- Case insert layout helpers convert `fontSizePt` to canonical export pixels
  using the template export DPI before preview/export scaling. Wrap width is
  only a maximum wrapping width; rendered ink bounds plus paint slack drive
  visual bounds and safe-zone clamping.
- Case insert rich-text run style interpretation is shared in
  `src/text/richTextRunStyle.ts`; DOM preview span creation, layout
  measurement, and canvas drawing remain adapter-owned.
- Selection-scoped font-size formatting is stored as `fontSizePt` on shared
  rich-text runs. Case insert and straight-disc adapters resolve those point
  runs through their existing point-to-render-unit helpers; legacy `fontSizePx`
  runs remain readable but new command-generated HTML uses `font-size:Npt`.
- Case insert inline editing uses the shared editor in adapter mode for cover,
  tray, left spine, and right spine text, keeping the existing template/spine
  preview renderers visible during editing.

Edit/interaction path:

- Sidebar text controls update text state and styles.
- Straight disc text can be edited inline through `InlinePreviewTextEditor`
  adapter mode.
- `src/components/preview/inlinePreviewTextEditorContract.ts` owns the shared
  preview-mounted adapter contract, normalized edit-session shape, capability
  flags, conformance assertions, and curved-text SVG/textPath guardrail. The
  case insert, straight-disc, and curved-disc adapters continue to own geometry,
  layout, state setters, renderer ownership, pointer movement, and commit/delete
  behavior.
- Contextual text-control labels, preset option construction, Custom-option
  behavior, and target capability declarations live in
  `src/text/contextualTextControlViewModel.ts`; case insert and straight-disc
  adapters still own state setters, ranges, units, geometry semantics, renderer
  paths, and commit behavior.
- The contextual-control host is a stable top-right app-shell ribbon in the
  preview header, documented in `docs/TEXT_EDITOR_CONTRACT.md` and the SDD.
  The header keeps a bounded Live Preview label column on the left and an
  attached ribbon column on the right. The ribbon is flush to the preview
  app-shell column's top and right edges, and it uses the available right-hand
  header width up to the label boundary instead of leaving dead top/right
  gutter space. Migrated case and disc text surfaces register their active
  controls through
  `src/components/preview/ContextualTextRibbonBridge.tsx` and consume the
  existing contextual registry and adapters through that host. The production
  ribbon renders native toolbar groups and must not reuse old
  `.inline-preview-text-control-grid` or portal-slot full-menu presentation.
  Its controls scroll internally when necessary instead of wrapping downward and
  moving the editable surface; the ribbon must not take ownership of text
  rendering, layout, save/load, export, source resolution, or surface-specific
  geometry.
- The ribbon host also owns the app-shell reservation that the toast container
  must respect while the ribbon is active. The toast offset should consume a
  shared app-shell ribbon height/offset signal or CSS variable; it must not be
  computed by text targets, disc geometry, case preview geometry, or surface
  adapters.
- Preview components continue to own caret, selection, outlines, direct typing
  adapters, edge-grab movement, Move fallback, and Delete affordances. The
  ribbon owns tab/control presentation only.
- The legacy floating-menu placement responsibilities have been removed:
  selected-text-anchored menu positioning, collision scoring, center/side
  docking, emergency detached placement, portal-only containment, and
  responsive-shell feedback paths that existed only for floating contextual
  controls.
- Disc sidebar demotion uses `src/discText/sidebarControlPolicy.ts` to consult
  contextual target capabilities instead of maintaining a separate
  migrated-control list in the sidebar component. Straight text and curved
  copyright/legal text keep editing controls in contextual adapters, while the
  sidebar retains setup/source/type controls.
- Cover/tray single text-block, text-list, and spine text sidebar demotion uses
  `src/caseInsert/sidebarControlPolicy.ts` to consult the same rectangular
  case-insert text target capabilities instead of duplicating registry policy
  in template or spine sidebar components; spine orientation remains a
  sidebar-owned structural control.
- Curved disc text remains SVG/textPath based. Its contextual adapter exposes
  curved-safe controls and safe inline HTML source through the contextual
  infrastructure, but it is not routed through a visible rectangular on-canvas
  editor. Ribbon presentation must preserve the SVG/textPath renderer and
  change only control presentation.
- Case insert preview text selection/editing helpers support adapter-based
  preview editing; broad case insert runtime behavior was not independently
  manually verified during this inventory refresh.

Save/load path:

- Disc text settings, values, value sources, layout, styles, and disc-number artwork are saved in disc project JSON.
- Case insert text blocks/lists are saved as part of case insert project state.

Export path:

- Disc text export uses `drawDiscTextElements`.
- Case insert text export is drawn from computed text layouts in `exportCaseInsertPng.ts`.

Tests:

- `src/discText/*.test.ts`
- `src/components/preview/discInlineTextEditorControls.test.ts`
- `src/components/preview/inlinePreviewTextEditor*.test.ts`
- `src/text/contextualTextControlViewModel.test.ts`
- `src/text/richTextRunStyle.test.ts`
- `src/diagnostics/textEditorContract.test.ts`
- `src/caseInsert/textReadability.test.ts`
- `src/layout/caseInsertTextVisualLayout.test.ts`
- `src/project/metadataDiscText.test.ts`

Risks:

- `docs/TEXT_EDITOR_CONTRACT.md` and `textEditorContract.test.ts` show the text editor contract is actively guarded by diagnostics.
- Browser caret measurement, wrapped text layout, metadata-bound values, and export parity are fragile areas.
- The legacy floating contextual menu code has been removed; new text-control
  work should target the app-shell ribbon and local preview affordance helpers.
- Open issues `#178`, `#181`, and `#184` track text-system expansion and redesign.

## Image and Artwork Systems

Purpose: import, normalize, place, frame, render, save, and export background artwork, title artwork, additional artwork, screenshots, and image slots.

Key files:

- `src/hooks/useBackgroundArtwork.ts`
- `src/hooks/useTitleArtwork.ts`
- `src/hooks/useAdditionalArtwork.ts`
- `src/image/backgroundImage.ts`
- `src/image/backgroundImageImport.ts`
- `src/image/imageContentBounds.ts`
- `src/image/imageContentShape.ts`
- `src/project/projectTitleArtwork.ts`
- `src/project/projectAdditionalArtwork.ts`
- `src/project/projectVisualAssetImport.ts`
- `src/render/imageRenderArtifact.ts`
- `src/render/artworkFrame.ts`
- `src/components/preview/ContentBoundedImage.tsx`
- `src/components/preview/ArtworkFrameOverlay.tsx`
- `src/export/drawTitleArtwork.ts`
- `src/export/drawAdditionalArtwork.ts`
- `src/export/drawArtworkFrame.ts`
- `src/caseInsert/imageSlotTransitions.ts`

Source-of-truth state:

- Disc background, title, and additional artwork each have focused hook/domain state.
- Case insert image slots are nested in `ProjectJewelCaseState` and updated through case insert transition helpers.
- Asset provenance and source labels are centralized in `src/project/projectAssetStatus.ts`.

Render path:

- Preview components render content-bounded image layers and optional frames.
- Case insert preview renders image slots through template and spine layers.

Edit/interaction path:

- Upload, Steam artwork, local Steam screenshots, web artwork, reset, clear, fit, layout, and frame controls call hook or transition helpers.
- Dragging updates percent or pixel layout depending on the element.

Save/load path:

- Image data URLs, image sizes, provenance, layout, scale, offsets, and frames are serialized in project state where relevant.

Export path:

- Canvas export uses `drawImageContent` and specific layer draw helpers.
- Case insert export draws template and spine image slots through `exportCaseInsertPng.ts`.

Tests:

- `src/image/*.test.ts`
- `src/render/imageRenderArtifact.test.ts`
- `src/render/artworkFrame.test.ts`
- `src/editor/imageAssetTransitions.test.ts`
- `src/editor/repeatedArtwork.test.ts`
- `src/caseInsert/titleArtwork.test.ts`
- `src/steam/steamArtworkAssets.test.ts`
- `src/steam/steamTitleArtworkImport.test.ts`

Risks:

- Preview CSS/object-fit behavior and canvas `drawImageContent` behavior must remain aligned.
- Image content-bound detection can affect apparent placement and export crop.

## Visual Elements, Marks, Logos, and Ratings

Purpose: manage Steam banner, developer/publisher/additional logos, rating badges, media marks, platform marks, technical marks, and built-in asset routing.

Key files:

- `src/assets/assetManifest.ts`
- `src/branding/steamBanner.ts`
- `src/branding/steamBannerDefaults.ts`
- `src/branding/steamBannerLayout.ts`
- `src/hooks/useSteamBannerState.ts`
- `src/hooks/useProjectLogoAssets.ts`
- `src/hooks/useRatingBadgeState.ts`
- `src/hooks/useMediaMarkState.ts`
- `src/hooks/usePlatformMarksState.ts`
- `src/hooks/useTechnicalMarks.ts`
- `src/project/projectLogoAssets.ts`
- `src/project/projectRatingBadge.ts`
- `src/project/projectMediaMark.ts`
- `src/project/projectPlatformMarks.ts`
- `src/project/projectTechnicalMarks.ts`
- `src/components/editor/OptionalFeatureSection.tsx`
- `src/components/editor/optionalFeatureSectionModel.ts`
- `src/render/mediaMarkRenderModel.ts`
- `src/render/platformMarkRenderModel.ts`
- `src/render/technicalMarkRenderModel.ts`
- `src/caseInsert/brandingLogoSlots.ts`
- `src/caseInsert/brandingMarkSlots.ts`
- `src/caseInsert/brandingVisibility.ts`
- `src/caseInsert/brandingSlotSources.ts`
- `src/caseInsert/brandingMarkPlacement.ts`

Source-of-truth state:

- Disc visual elements use focused hooks and project modules.
- Case insert branding slots are part of `ProjectJewelCaseState`.
- Built-in assets and dimensions are routed through `assetManifest.ts`.

Render path:

- Disc preview has dedicated layers for Steam banner, logo assets, rating badge, media mark, platform marks, and technical marks.
- Case insert preview maps branding slots into template/spine preview layers.

Edit/interaction path:

- Sidebar branding controls mutate feature state.
- Case insert branding sync maps shared mark/logo sources into case insert slots.
- Optional feature visibility uses shared optional-feature helpers where applicable.
- `OptionalFeatureSection` provides only the neutral sidebar show/enable shell and dependent-control hiding; feature-specific controls keep ownership of values, handlers, source choices, reset/clear behavior, preview/export inclusion, and persistence.
- Current `OptionalFeatureSection` callers include Steam banner controls, rating badge controls, media marks, case insert game-logo/title artwork, disc game title/logo artwork, disc primary developer/publisher logos, case insert primary developer/publisher logo slots, additional-artwork global gates, and additional-artwork frame gates. Background artwork, platform marks, technical marks, repeated visual element cards, and text sections remain outside this shared shell in the current inventory.

Save/load path:

- Disc project JSON saves each visual element slice.
- Case insert project JSON saves per-surface and per-spine logo/mark slots.

Export path:

- Disc export uses dedicated draw helpers.
- Case insert export draws logo and mark slot groups from case insert slot state.

Tests:

- `src/assets/assetManifest.test.ts`
- `src/branding/steamBannerDefaults.test.ts`
- `src/editor/logoAsset.test.ts`
- `src/editor/markImageSource.test.ts`
- `src/editor/optionalVisualFeature.test.ts`
- `src/editor/optionalVisualShellAdoption.test.ts`
- `src/project/projectLogoAssets.test.ts`
- `src/project/projectRatingBadge.test.ts`
- `src/project/projectMediaMark.test.ts`
- `src/project/projectTechnicalMarks.test.ts`
- `src/render/platformMarkRenderModel.test.ts`
- `src/render/technicalMarkRenderModel.test.ts`
- `src/caseInsert/brandingLogoSlots.test.ts`
- `src/caseInsert/brandingVisibility.test.ts`

Risks:

- Optional visual features must preserve disabled state and not render/export when disabled.
- Optional feature shell reuse must remain UI/policy-only and must not force disc/case visuals into a single feature state model.
- Open issue `#125` tracks missing/historical mark families.
- Case insert global-source sync has a large dedicated hook and is a parity risk.

## Drag, Resize, Selection, and Preview Interactions

Purpose: support preview element hovering, selection, dragging, inline text editing, and placement updates.

Key files:

- `src/interaction/dragGeometry.ts`
- `src/interaction/usePointerDrag.ts`
- `src/interaction/usePointerDragAdapters.ts`
- `src/interaction/useDiscPreviewPointerDrag.ts`
- `src/interaction/useCaseInsertPreviewPointerDrag.ts`
- `src/components/preview/PreviewViewport.tsx`
- `src/components/preview/previewViewportModel.ts`
- `src/editor/previewEditableRegistry.ts`
- `src/editor/previewElementOverlay.ts`
- `src/components/preview/PreviewElementOverlay.tsx`
- `src/components/preview/InlinePreviewTextEditor.tsx`
- `src/components/preview/DiscInlineTextEditorLayer.tsx`
- `src/caseInsert/previewTextSelection.ts`
- `src/caseInsert/previewTextEditing.ts`

Source-of-truth state:

- Drag operations update the owning feature state through callbacks supplied by `App.tsx` and editor hooks.
- Preview viewport zoom/pan state is local to `PreviewViewport`. It is editor
  UI state only; it is not saved to project JSON and does not affect export
  coordinates.
- Overlay hover/selection UI state is local to `PreviewElementOverlay`.
- Preview-editable element identity, DOM attribute names, stable target keys, and inline text target keys are owned by `src/editor/previewEditableRegistry.ts`; `src/editor/previewElementOverlay.ts` keeps overlay lookup and rectangle measurement.

Render path:

- Editable preview elements expose registry-defined data attributes.
- `PreviewViewport` wraps both disc and case insert design surfaces. It owns
  Ctrl+wheel zoom, middle-mouse pan, Space+left-drag pan, the right-edge
  zoom/pan/Fit rail, and the transformed stage. The compact rail reserves a
  minimum 48px width for Fit calculations, then its controls may grow
  continuously from 24px to 48px only into residual unused horizontal gutter.
  The expanded rail width is not fed back into the same Fit calculation pass,
  so rail growth cannot reduce the fit scale or move the fitted surface. Design
  Check and Guide Legend controls remain outside the transformed stage. The
  stage owns the 4px surface guard, minimum right rail reservation, and bottom
  Design Check / Guide Legend rail reservation, while the preview surfaces fill
  the available stage instead of keeping legacy fixed-width caps.
- `PreviewElementOverlay` measures matching DOM nodes and draws hover/selected boxes.
- Inline text editor renders preview-mounted contextual controls and hidden
  native input/selection adapters. For case insert and straight disc WYSIWYG
  paths, the final preview renderer remains visible as the glyph renderer
  during editing; the adapter supplies input, caret, selection, boundaries, and
  menu affordances.
- The contextual text ribbon moves only the control host into a reserved
  top-right app-shell slot above the preview. Preview layers continue to supply
  caret, selection, outline, direct typing, edge-grab movement, Move fallback,
  and Delete affordances; the ribbon consumes the contextual control registry
  and adapter callbacks without becoming a renderer or geometry owner.
- Inline text host lookup uses registry-defined target keys; case insert and
  disc adapters still own their values, geometry, commit behavior, and pointer
  movement.
- HTML source editing is parsed and sanitized by `src/text/htmlText.ts` into
  the shared rich-text run model. Project restore migrates legacy Markdown
  source fields into canonical HTML; preview and export consume parsed runs, not
  unsanitized markup.

Edit/interaction path:

- Shared pointer drag lifecycle is in `usePointerDrag`.
- Disc drag adapter handles background pixel offsets plus percent-positioned visual elements and disc text.
- Case insert drag adapter handles template/spine images, text blocks, lists, title, and slot groups.
- Percent-positioned drag math uses transformed preview DOM bounds. Pixel
  offset dragging must compensate for viewport scale before updating saved
  design-space offsets.
- Text-body pointer drag should select text. Text-object movement should use
  the approximately 8px selection-edge grab region or the Move fallback.

Save/load path:

- Dragged positions are saved in the relevant layout objects.

Export path:

- Export consumes the same layout state but does not reuse DOM overlay measurements.

Tests:

- `src/interaction/dragGeometry.test.ts`
- `src/editor/previewEditableRegistry.test.ts`
- `src/editor/previewElementOverlay.test.ts`
- `src/components/preview/inlinePreviewTextEditor*.test.ts`
- `src/diagnostics/textEditorContract.test.ts`

Risks:

- Snapping and keyboard nudging are not evident as implemented in the current files reviewed; open issue `#172` tracks related work.
- Overlay measurements depend on rendered DOM and ResizeObserver behavior, which was not manually verified here.

## Guide, Checklist, and Preflight Systems

Purpose: show print guides, guide legends, design warnings, and export preflight confirmations.

Key files:

- `src/editor/layerOrder.ts`
- `src/components/preview/DiscGuideOverlay.tsx`
- `src/components/preview/CaseInsertGuideOverlay.tsx`
- `src/components/preview/PreviewGuideLegendPanel.tsx`
- `src/components/preview/PreviewDesignCheckPanel.tsx`
- `src/components/preview/usePreviewGuideLegendPlacement.ts`
- `src/export/exportPreflight.ts`
- `src/export/discDesignCheck.ts`
- `src/export/caseInsertExportPreflight.ts`
- `src/export/caseInsertDesignCheck.ts`
- `src/export/preflightWarnings.ts`
- `src/export/drawExportGuides.ts`
- `src/export/drawCaseInsertGuides.ts`
- `src/caseInsert/exportGuideOptions.ts`
- `src/caseInsert/guideStyles.ts`
- `src/caseInsert/exportSettings.ts`
- `docs/MANUAL_SMOKE_CHECKLISTS.md`

Source-of-truth state:

- Disc export guide toggles are owned by `App.tsx`.
- Case insert export guide IDs live in case insert export settings.
- Design-check data is computed from current editor state at preview/export time.

Render path:

- Preview guide overlays and guide legend panels render in preview components.
- Design warnings render through `PreviewDesignCheckPanel`.

Edit/interaction path:

- Sidebar export/guide controls update guide settings.
- Export flow presents preflight warnings through a Tauri dialog confirm.

Save/load path:

- Disc export guide settings are saved in `SavedDiscProject.export`.
- Case insert export settings are saved in `ProjectJewelCaseState.export`.

Export path:

- Disc export draws optional guides after clipped content.
- Case insert export draws selected guides through `drawCaseInsertExportGuides`.

Tests:

- `src/export/exportPreflight.test.ts`
- `src/export/discDesignCheck.test.ts`
- `src/export/caseInsertDesignCheck.test.ts`
- `src/export/caseInsertExportPreflight.test.ts`
- `src/export/preflightWarnings.test.ts`
- `src/caseInsert/exportGuideOptions.test.ts`

Risks:

- Guide legend placement and preview/export guide parity need visual/manual verification.
- Repository instructions note issue `#124` tracks a future guide legend move, but the current intended flow still includes Guide Legend in the sidebar.

## PNG and Export Systems

Purpose: render disc and case insert projects to PNG bytes.

Key files:

- `src/export/exportPng.ts`
- `src/export/exportCaseInsertPng.ts`
- `src/export/canvasImage.ts`
- `src/export/draw*.ts`
- `src/editor/layerOrder.ts`
- `src/templates/templateModel.ts`
- `src/layout/*`
- `src-tauri/src/commands/files.rs`

Source-of-truth state:

- Export reads the same runtime state used by preview, passed from `App.tsx`.
- Export dimensions are derived from template geometry and export DPI helpers.

Render path:

- Export renders to canvas, not DOM.
- Disc export clips to the disc circle, cuts the physical center hole, and optionally draws export guides.
- Case insert export draws rectangular template/spine content and selected guides.

Edit/interaction path:

- Export is initiated from `App.tsx` after optional preflight confirmation.

Save/load path:

- Export settings are persisted as part of project state, but PNG bytes are not part of project serialization.

Tests:

- `src/export/canvasImage.test.ts`
- `src/export/drawSteamBanner.test.ts`
- `src/export/drawCaseInsertSteamBanner.test.ts`
- `src/export/drawRatingBadge.test.ts`
- `src/export/drawMarkImage.test.ts`
- Preflight/design-check tests listed above.

Risks:

- DOM preview and canvas export are distinct renderers.
- Case insert export is large and tightly coupled to text, slot, branding, and spine layout helpers.
- Actual PNG visual output was not manually inspected in this task.

## Test Coverage Map

Purpose: document what the current test suite covers.

Current `npm run test` covers these broad areas:

- Asset manifest and built-in asset dimensions.
- Background artwork sources, image geometry, content bounds, and content shape.
- Steam banner defaults and Steam artwork/title/logo/platform/metadata imports.
- Editor helper contracts for image source menus, panel classes, range field models, optional visual features, preview overlay metadata, and repeated artwork.
- Inline preview text caret/input/positioning and text-editor contract diagnostics.
- Disc text layout, SVG rendering, curved text, style normalization, and disc-number artwork.
- Case insert branding slots/visibility, export guide options, Steam back-cover import, text readability, title artwork, sidebar workflow, and back-cover copy fitting.
- Export preflight, design checks, canvas image helpers, Steam banner drawing, rating/mark drawing, and warning helpers.
- Drag geometry.
- Disc and jewel-case layout helpers.
- Project schema, routing, restoration, normalization, and feature-specific serialization helpers.
- Shared project parity harness diagnostics for representative disc and case insert runtime/saved/restored/export inputs.
- Render models for artwork frames, image render artifacts, platform marks, and technical marks.
- Template models and case insert templates.

Unknowns:

- There is no evidence in `package.json` of an end-to-end Playwright test command.
- Runtime Tauri behavior, file dialogs, native network commands, drag behavior, and actual PNG pixel output were not verified here.

## Known Fragile Areas Visible From Code, Tests, Docs, and Issues

- `App.tsx` remains a large orchestration component and owns many cross-feature flows.
- Case insert editor hooks and export are large and centralize many behaviors.
- Project schema migration support exists as a structure, but no migrations are implemented.
- Preview and export rendering are separate paths for both disc and case insert editors.
- Inline preview text editing depends on DOM measurement, caret math, wrapped text behavior, and CSS.
- Case insert parity is active work, especially tray/spine structured layout and alpha finish-line work.
- CSS ownership remains a known risk, with open issue `#46`.
- Optional visual feature behavior must preserve disabled state without rendering/exporting disabled features.
- Built-in mark/logo/rating catalogs are centralized but incomplete by open issue.
- Current working tree may contain status noise or real uncommitted work. Status-only/no-diff files are not treated as meaningful source changes, but any real content diffs should be reviewed before release claims.

## Validation

No validation command was run for this docs-only inventory. `package.json`, source files, tests, and behavior were not changed.
