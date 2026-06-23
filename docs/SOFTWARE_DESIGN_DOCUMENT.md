# Software Design Document
> Status: Authoritative architecture contract.
> Purpose: As-built architecture contracts for state, rendering, editing, save/load, export, and subsystem boundaries.
> Read when: Architecture-sensitive work, renderer/editor/export changes, schema work, drag/selection, or parity-sensitive changes.
> Authoritative source: This document for architecture; AGENTS.md for stricter agent workflow rules.
> Last reviewed against commit: `8393cb9a8d89f56e80af62df01cc32fb0a63015a`.


This Software Design Document describes the as-built architecture of Steam Backup Label Studio. It is a contract document for preserving current behavior while future work continues. It is not a feature proposal and it does not claim that future planned behavior is implemented.

## 1. Document Scope

### 1.1 Evidence Base

This SDD is based on the repository inventory in `docs/REPO_ARCHITECTURE_INVENTORY.md`, current project documentation, source files, tests, and a live review of open GitHub issues. Because this SDD cites the inventory, `docs/REPO_ARCHITECTURE_INVENTORY.md` must be included with any main-branch commit that includes this SDD.

Branch and commit at the time this SDD was drafted:

- Branch: `main`
- HEAD commit: `94fa3cf2c9936aa281d2da017f189e91b491edfc`

WYSIWYG text refresh note:

- Text editor architecture notes were reviewed again after PR `#186` was
  merged into `main` at `40fd7e4ca44648a4fa0061696bc1aa4583ff8d45`.
- PR `#186` reported runtime verification for cover, tray, left/right spine,
  straight disc inline editing, and the curved disc SVG/textPath exception.
- This documentation refresh did not independently launch Tauri; runtime claims
  beyond the PR `#186` report still require a new manual runtime pass.

Current working-tree note:

- The checkout had pre-existing working-tree noise before this SDD was created.
- Some source paths appeared in `git status` even when `git diff` showed no content changes for those files. Status-only/no-diff paths are not treated as meaningful dirty source changes in this SDD.
- Only paths with actual content diffs should be treated as uncommitted source changes for SDD evidence or release-readiness claims.
- No source files, package metadata, runtime behavior, issues, commits, or pushes are changed by this document.

Related current issue context:

- `#44` remaining editor state extraction.
- `#46` CSS organization.
- `#48` project schema validation and migration support.
- `#125` historical technology mark catalog expansion.
- `#126` jewel case editor alpha finish line.
- `#149` structured tray/spine layouts for case inserts.
- `#172`, `#174`, `#175`, `#176` preview editing and workflow improvements.
- `#178`, `#181`, `#184` text system and preview-mounted text editing work.

### 1.2 Scope Boundaries

This document describes:

- How the app currently starts, stores state, renders, edits, saves, loads, validates, and exports.
- The architecture contracts future changes must preserve.
- Known fragile areas visible from current files, tests, docs, and issues.

This document does not:

- Claim live Tauri runtime behavior was manually verified.
- Claim case insert alpha completion.
- Claim future `.sbls` package read/write support exists.
- Claim DVD/Amaray or Blu-ray editors are implemented.
- Replace source code, tests, issue descriptions, or manual smoke checklists as the source of detailed implementation truth.

Unknowns are marked as unknown or called out for user review.

### 1.3 How To Read Current Implementation And Contracts

This SDD separates current implementation facts from architectural contracts:

- "Current implementation summary", "source-of-truth state", and "render/edit/export paths" describe how the repo is currently organized.
- "Invariants", "future-change rules", "global architectural contracts", and ADR consequences define rules future work must preserve.
- A contract may be stricter than the current implementation. When current behavior is known not to satisfy a contract, the gap is called out as a risk or known gap rather than described as implemented behavior.

## 2. Product Purpose

Steam Backup Label Studio is a cross-platform desktop application for creating standardized, print-ready labels and case artwork for personal Steam game backup media.

The current alpha-capable surface is the disc-label editor. It supports Steam/manual metadata, Steam and local artwork sources, real disc geometry, background editing, title/logo artwork, additional artwork, Steam banner branding, logos, badges, marks, optional text systems, save/load, export preflight, and 300 DPI PNG export.

The case insert editor exists as an active implementation surface for jewel case cover, tray, and spine work. It is not yet documented as alpha-complete. Structured tray/spine layout work remains open under `#149`, and the broader jewel case alpha boundary remains open under `#126`.

## 3. Core Product Principles

1. The app is a workflow accelerator, not a full image editor.
2. The default disc-label workflow should stay fast enough for ordinary backup-label work.
3. Blank projects must stay supported; users should be able to upload one image and export without a required guided checklist.
4. Current working disc editor behavior is launchpad infrastructure and must be preserved unless a replacement path is explicitly planned and reviewed.
5. Disc and case insert editors are separate product surfaces that share lower-level systems only where those systems are genuinely neutral.
6. Preview/export parity is a product contract, not a visual suggestion.
7. Optional visual features must preserve disabled state, hide dependent controls while disabled, and omit disabled visuals from preview and export.
8. Built-in/default generic app assets are valid output sources and must not produce warnings solely because they are built in.
9. Runtime validation is required before claiming WYSIWYG-sensitive behavior is fixed or preserved.

## 4. Global Architectural Contracts

These contracts apply across subsystems.

### 4.1 Visual Source Of Truth

The visible preview/final renderer is the visual source of truth for user-facing artwork and text.

Hidden inputs, hit targets, measurement layers, drag overlays, and export renderers are adapters. They may support editing, measuring, interaction, or file generation, but they must not define a separate visual truth that contradicts the visible renderer.

Edit mode may add affordances such as dotted boundaries, handles, tabs, menus, hover boxes, selected boxes, and hidden native inputs. Edit mode must not replace a visual object with a different visible renderer whose layout, wrapping, spacing, style, or bounds differ from the final preview/output renderer.

### 4.2 Renderer Parity Rule

Preview and PNG export must render the same user-visible elements in the same relative layer order and with equivalent geometry.

Allowed differences:

- The preview is scaled to fit the editor pane.
- Preview viewport zoom/pan is editor-only app-shell state. It may transform
  the visible preview surface for inspection and editing, but it must not alter
  saved design coordinates, project JSON, export coordinates, or print scale.
- Editor guide overlays, toast UI, labels, selection boxes, handles, and sidebar chrome are editor-only.
- Export-only proof guides may draw last when the user enables guide export.
- Disc export performs canvas operations such as clipping to the disc face and cutting out the physical center hole.

Not allowed without an explicit ADR:

- Preview-only visuals that cannot be exported.
- Export-only content that was visible nowhere in the preview.
- Separate preview/export layer order.
- CSS preview effects that the export path cannot reproduce when those effects are part of the user-visible design.

### 4.3 Save/Load/Export Parity

For any persisted visual or text feature:

- Edit state, preview state, saved JSON state, restored state, and export state must agree.
- Disabling a feature must not destroy its remembered state.
- Re-enabling a feature must restore previous source, custom image, layout, scale, settings, and related values where those values are part of the feature state.
- Export must not silently omit an enabled visual that appears in preview.
- Load normalization may add safe defaults, but it must preserve user-provided assets and layout values when possible.

### 4.4 WYSIWYG Text Contract

Text editing is WYSIWYG-sensitive. Runtime validation is required before claiming text editor behavior is fixed or preserved.

Current implementation note:

- Preview-mounted text editing is governed by this WYSIWYG contract. As of PR `#186`, cover, tray, left/right spine, and straight disc inline editing keep the final preview renderer visible during edit and use target-specific input/selection adapters instead of fake visible edit text.
- Treat preview-mounted text editing as a protected stabilization area. Future WYSIWYG changes still need parity tests and runtime validation, especially around save/load, export, rich text, caret behavior, selection behavior, wrapping, and curved disc text.
- The accepted next UI direction for contextual text controls is a stable
  top-right app-shell ribbon above the preview, documented in
  `docs/TEXT_EDITOR_CONTRACT.md`. That ribbon is a control host only. It does
  not change the preview renderer, direct text editing, save/load, export, or
  curved SVG/textPath ownership contracts.

Contracts:

- The visible text remains on the canvas and is editable directly in the preview.
- The text body is for typing and text selection.
- Normal drag/select over text should select text. Moving text uses an
  approximately 8px selection-edge grab region or a visible Move fallback; text
  body dragging must not move the object.
- Fake visible text rendered over a transparent input is a known violation/risk and is forbidden unless explicit parity tests prove spacing, caret, wrapping, selection, final preview, save/load, and export behavior remain equivalent.
- Hidden/native input adapters may exist only as adapters. They must not become the visible source of truth.
- Spaces, multiple spaces, leading/trailing spaces, newlines, and pasted multiline text must be preserved while editing and after exiting edit mode.
- Curved disc text remains SVG/textPath based unless a future ADR explicitly changes that decision.

### 4.5 Runtime Validation Rule

Non-interactive tests are necessary but insufficient for visual/editor claims. For WYSIWYG-sensitive changes, preview/export parity changes, drag changes, upload/source changes, save/load visual state changes, and desktop layout changes:

- Run appropriate non-interactive checks for the change scope.
- Ask for manual `npm run tauri dev` verification from the primary checkout.
- Do not claim manual runtime verification unless it actually happened.
- Record any skipped runtime scenarios.

Agents must not run `npm run tauri dev` unless the user explicitly asks.

## 5. App Architecture Overview

### 5.1 Current Implementation Summary

The app is a Tauri desktop shell with a Vite/React/TypeScript frontend. React owns the editor UI and runtime state. Rust/Tauri owns native file, network, local Steam, local image, and platform folder-opening commands.

The frontend has three top-level workspaces:

- `home`
- `disc`
- `caseInsert`

The disc editor is the stable alpha-capable workspace. The case insert editor is active and partially implemented for jewel case layouts.

### 5.2 Key Files

- `index.html`
- `src/main.tsx`
- `src/app/App.tsx`
- `src/editor/editorTypes.ts`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/files.rs`
- `src-tauri/src/commands/steam.rs`
- `src-tauri/src/commands/local_steam.rs`
- `src-tauri/src/commands/local_images.rs`
- `src-tauri/src/commands/official_site.rs`
- `src-tauri/src/platform/open_folder.rs`

### 5.3 Source-Of-Truth State

`src/app/App.tsx` owns workspace routing and much cross-feature orchestration. Focused hooks own many feature-specific state slices, including disc template, Steam banner, background artwork, disc text, title artwork, additional artwork, logos, rating badges, media marks, platform marks, technical marks, case insert editing, spine editing, and case insert branding sync.

Native Rust commands do not own editor state. They return data or perform filesystem/platform operations on request.

### 5.4 Render, Edit, And Export Paths

- React entry: `src/main.tsx` renders `<App />`.
- Vite entry: `index.html` provides the root element and loads `/src/main.tsx`.
- Tauri dev/build entry: `src-tauri/tauri.conf.json` points dev to Vite and packaged frontend output to `dist`.
- UI routing: `App.tsx` renders `HomeScreen`, disc editor panels plus `DiscPreview`, or `CaseInsertEditorShell`.
- Native integration: frontend wrappers call Tauri commands registered in `src-tauri/src/lib.rs`.
- Export: `App.tsx` calls preflight helpers, confirms warnings, calls canvas export helpers, then writes PNG bytes through Tauri.

### 5.5 Invariants And Future-Change Rules

- Keep `App.tsx` as orchestration where practical.
- Do not add feature-specific layout math, renderer construction, pointer math, import/upload interpretation, project normalization, or export drawing to `App.tsx`.
- Keep disc editor, case insert editor, and neutral template helpers separate.
- Use focused hooks/domain modules when behavior grows beyond trivial wiring.

### 5.6 Validation Expectations

- Source changes should run `npm run lint` and `npm run build`.
- Ownership or module moves should run `npm run check:cycles`.
- Runtime/editor changes need manual Tauri verification by the user.

### 5.7 Known Risks

- `App.tsx` is still large and remains a cross-feature coordination point.
- Open issue `#44` tracks further state extraction.
- Tauri command behavior was not runtime-verified for this SDD.

## 6. Package Scripts And Validation Commands

### 6.1 Current Implementation Summary

Package scripts define dev, build, lint, test, cycle checking, Vite preview, and Tauri CLI entry points.

### 6.2 Key Files

- `package.json`
- `vite.config.ts`
- `scripts/check-cycles.mjs`
- `eslint.config.js`
- `tsconfig*.json`

### 6.3 Commands

- `npm run dev`: Vite dev server.
- `npm run build`: TypeScript build plus Vite build.
- `npm run check:cycles`: relative import cycle detector for `src`.
- `npm run lint`: ESLint.
- `npm run smoke:text-editor`: native text-editor smoke policy guard. The
  required runtime route is `npm run tauri dev` plus Any App / Computer Use
  against the native Tauri window; this npm script must not run browser/Vite
  acceptance.
- `npm run diagnose:text-editor:browser`: browser-only text-editor diagnostic
  route.
- `npm run capture:ribbon:browser`: browser-only ribbon capture diagnostics.
- `npm run test`: Node test runner with an explicit test-file list.
- `npm run preview`: Vite preview.
- `npm run tauri`: Tauri CLI.

### 6.4 Source-Of-Truth State

- `package.json` is the source of truth for standard npm commands and the explicit Node test file list.
- `scripts/check-cycles.mjs` owns relative import cycle detection.
- Vite, ESLint, and TypeScript configuration live in their dedicated config files.

### 6.5 Render/Edit/Export Paths

- Scripts do not render editor content directly.
- `npm run dev`, `npm run build`, `npm run preview`, and `npm run tauri` support the app runtime/build paths.
- `npm run test`, `npm run lint`, and `npm run check:cycles` support validation.

### 6.6 Invariants And Future-Change Rules

- Add new tests to the explicit `npm run test` file list or they will not run under the standard test command.
- Keep relative import cycles at zero after module moves.
- Do not treat historical validation notes as proof that the current checkout was validated.

### 6.7 Validation Expectations

- Use the scripts named above as the standard validation entry points.
- Do not run `npm run tauri dev` unless the user explicitly asks for runtime verification.

### 6.8 Known Risks

- `npm run test` can miss newly created tests if package metadata is not updated.
- No end-to-end Playwright command is exposed in `package.json`.

## 7. Project Data Model

### 7.1 Current Implementation Summary

Projects are saved as plain JSON files, commonly named `.sbls.json`. The current saved-project type is a union of disc and case insert project shapes under schema version `0.1.0`.

The future ZIP-compatible `.sbls` package format is documented but not implemented.

### 7.2 Key Files

- `src/project/projectTypes.ts`
- `src/project/projectSchema.ts`
- `src/project/createProjectSnapshot.ts`
- `src/project/restoreProjectState.ts`
- `src/project/caseInsertProjectAdapters.ts`
- `src/project/projectRouting.ts`
- `src/project/savedProjectNormalization.ts`
- `src/project/projectCaseInsert.ts`
- `src/diagnostics/projectParityHarness.ts`
- `docs/PROJECT_FILE_SPEC.md`
- `docs/PROJECT_PACKAGE_FORMAT_DECISION.md`

### 7.3 Source-Of-Truth State

- `SavedProject`, `SavedDiscProject`, `SavedCaseInsertProject`, `ProjectMetadata`, and case insert project state types live in `src/project/projectTypes.ts`.
- `CURRENT_PROJECT_SCHEMA_VERSION` is `0.1.0` in `src/project/projectSchema.ts`.
- `PROJECT_SCHEMA_MIGRATIONS` exists but is empty.

### 7.4 Render/Edit/Export Paths

- Runtime edits update React state first.
- Save creates a snapshot from runtime state.
- Load parses JSON, routes by project type/template clues, normalizes sparse data, then restores runtime state.
- Export reads current runtime state; PNG bytes are not part of project serialization.

### 7.5 Serialization Contract

- Current project files are JSON.
- Imported and uploaded images are embedded as data URLs where needed for reload.
- Built-in generic assets stay routed through `src/assets/assetManifest.ts` rather than being copied into every project.
- Provenance/status metadata may include source kind, source ID, sanitized label, and safe source URL.
- Durable local file paths should not be required after reload.

### 7.6 Invariants And Future-Change Rules

- Keep `projectType` as a real saved-project family boundary.
- Keep `home` as a workspace only, not a project type.
- Do not collapse disc and case insert schema owners.
- Add migrations before changing saved-project semantics.
- Keep package-format behavior clearly labeled future until implemented and validated.

### 7.7 Validation Expectations

- Project changes should update project/schema tests.
- Save/load-affecting changes need manual load/save/export smoke on real projects or fixtures.
- Runtime validation must distinguish disc and case insert project routing.
- Shared parity fixtures in `src/diagnostics/projectParityHarness.test.ts` compare semantic runtime, saved, restored, and export-facing state for representative disc and case insert visual/text features without merging their schemas.

### 7.8 Known Risks

- Top-level schema validation is intentionally shallow.
- No migrations are currently registered.
- Open issue `#48` tracks validation/migration depth.

## 8. Rendering Model

### 8.1 Current Implementation Summary

The app uses React/DOM/SVG preview layers for live editing and canvas-based PNG export for file output. Layer order is centralized in `src/editor/layerOrder.ts` and documented separately for disc and case insert editors.

### 8.2 Key Files

- `src/editor/layerOrder.ts`
- `docs/DISC_EDITOR_LAYER_ORDER.md`
- `docs/CASE_INSERT_EDITOR_LAYER_ORDER.md`
- `src/components/preview/*`
- `src/export/exportPng.ts`
- `src/export/exportCaseInsertPng.ts`
- `src/export/draw*.ts`
- `src/render/*.ts`

### 8.3 Source-Of-Truth State

The source-of-truth design state is runtime project/editor state. Layer order is source-of-truth policy in `src/editor/layerOrder.ts`. The visible preview/final renderer is the visual source of truth for WYSIWYG behavior.

### 8.4 Render/Edit/Export Paths

- Preview renders DOM/SVG layers in editor shells.
- Export draws to canvas using layer-order policy and export draw helpers.
- Disc export applies circular clipping and center-hole cutout.
- Case insert export draws rectangular surfaces and optional selected guides.
- Editor overlays, handles, hit targets, and hidden inputs support editing only.

### 8.5 Invariants And Future-Change Rules

- Add new user-visible visual layers to `src/editor/layerOrder.ts` first.
- Keep preview/export order aligned.
- Keep editor-only affordances out of clean export.
- Keep measurement/hit-target layers separate from visual artifacts.
- Do not allow hidden CSS business logic to override the rendering model.

### 8.6 Validation Expectations

- Unit tests should cover render models, export helpers, preflight, and layer-sensitive helpers where deterministic.
- Visual changes need preview and exported PNG comparison.
- WYSIWYG-sensitive changes need runtime validation.

### 8.7 Known Risks

- DOM preview and canvas export are separate renderers in several subsystems.
- CSS can create visual behavior that export cannot reproduce.
- Actual PNG output was not visually inspected during this SDD task.

## 9. Text System Design

### 9.1 Current Implementation Summary

The app has two related text systems:

- Disc text, including metadata-bound straight text, disc-number artwork, and curved SVG/textPath legal text.
- Case insert text, including cover/tray/spine text blocks and lists with rectangular/spine layout helpers.

Preview-mounted text editing is protected by `docs/TEXT_EDITOR_CONTRACT.md`.

### 9.2 Key Files

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
- `src/caseInsert/sidebarControlPolicy.ts`
- `src/caseInsert/textTransitions.ts`
- `src/caseInsert/textLayout.ts`
- `src/caseInsert/textStyles.ts`
- `src/caseInsert/textRenderStyles.ts`
- `src/caseInsert/textReadability.ts`
- `src/caseInsert/textContent.ts`
- `src/caseInsert/previewTextSelection.ts`
- `src/caseInsert/previewTextEditing.ts`
- `src/text/contextualTextControlViewModel.ts`
- `src/text/htmlText.ts`
- `src/text/richTextRunStyle.ts`
- `src/layout/caseInsertTextVisualLayout.ts`
- `src/export/drawDiscText.ts`
- `docs/TEXT_EDITOR_CONTRACT.md`

### 9.3 Source-Of-Truth State

- Disc text runtime state lives in `useDiscTextState`.
- Metadata-bound disc text source rules live in `src/project/metadataDiscText.ts`.
- Disc text persisted data lives in `SavedDiscProject.discText`.
- Case insert text blocks/lists live inside `ProjectJewelCaseState`.

### 9.4 Render/Edit/Export Paths

- Disc straight text uses measured layout helpers and preview layers.
- Disc curved legal text uses SVG/textPath in preview and export-oriented SVG/canvas conversion.
- Case insert text uses computed rectangular/spine layout helpers.
- Case insert rectangular text uses typographic point sizes as its canonical
  sizing model. `src/caseInsert/textSizing.ts` converts points to export pixels
  from the template DPI and provides legacy scale migration for old saved case
  insert text layouts.
- Straight and curved disc text use disc-owned typographic point sizing through
  `src/discText/pointSize.ts`. The disc model resolves export DPI from the
  selected disc template, converts `fontSizePt * dpi / 72` into the shared SVG
  viewBox geometry used by preview and PNG export, and migrates legacy
  scale-only layouts to apparent-equivalent point sizes. Curved copyright text
  remains SVG/textPath based.
- Inline editing uses `InlinePreviewTextEditor` plus target-specific adapters.
- `src/components/preview/inlinePreviewTextEditorContract.ts` owns the
  neutral preview-mounted adapter contract, capability flags, normalized
  edit-session shape, and conformance assertions. Surface adapters still own
  renderer choice, measured layout, state setters, pointer movement, and
  commit/delete behavior.
- Shared contextual text-control labels, tabs, preset option construction,
  Custom-option behavior, matching helpers, and target capability declarations
  live in `src/text/contextualTextControlViewModel.ts`; adapters keep current
  values, state setters, ranges, units, geometry semantics, renderer paths, and
  commit behavior target-specific.
- Disc sidebar demotion uses `src/discText/sidebarControlPolicy.ts` to consult
  contextual target capabilities. Straight text and curved copyright/legal text
  move duplicated editing controls into contextual adapters, while the sidebar
  keeps setup/source/type responsibilities such as enable, metadata/default
  source, and the straight/curved mode switch.
- Cover/tray single text-block, text-list, and spine text sidebar demotion uses
  `src/caseInsert/sidebarControlPolicy.ts` to consult the same contextual
  target capabilities for rectangular case-insert text while spine orientation
  remains sidebar-owned structural geometry.
- Cover, tray, spine, straight disc, and curved disc inline editing use adapter
  mode: native input/selection support is hidden, while the existing final
  preview renderers remain the visible glyph source.
- HTML source editing stores canonical sanitized HTML, parses it into the shared
  rich-text run model, and renders those runs through the same preview/export
  renderers. Legacy Markdown fields are load-only migration inputs.
- Case insert rich-text run style interpretation is shared through
  `src/text/richTextRunStyle.ts`; DOM preview layers, layout measurement, and
  canvas export remain separate adapters that consume the normalized run style.
- Selection-scoped point sizing stores `fontSizePt` on shared rich-text runs.
  The case-insert and straight-disc adapters treat their object-level
  `fontSizePt` as the ambient size for unstyled text, convert per-run points
  through their existing DPI/template helpers, and keep legacy `fontSizePx`
  HTML runs readable for migration.
- Export uses `drawDiscTextElements` for disc text and `exportCaseInsertPng.ts` for case insert text.

### 9.4.1 Stable Contextual Text Ribbon Contract

The contextual text-control host is a stable ribbon in the app shell, not a
floating menu attached to selected text. The old floating implementation has
been removed from migrated case and disc text surfaces.

Ribbon placement and layout:

- The ribbon occupies a reserved top-right app-shell region above the preview.
- The Live Preview heading remains on the left of the same header region.
- The preview header is a two-region layout: a bounded left label column and a
  right contextual ribbon column.
- The ribbon is visually attached to the top and right edges of the preview
  workspace, not rendered as a detached floating card.
- The ribbon left edge must not cross into the Live Preview label column.
- The ribbon may use the full available right-hand header column up to the Live
  Preview label boundary. It must not leave eligible header space unused while
  active controls are still compressed or clipped.
- The preview begins below the complete header/ribbon region and never
  encroaches into the reserved slot.
- The slot remains reserved when inactive, but ribbon contents disappear.
- Selecting editable text activates the ribbon.
- Row 1 contains the five contextual tabs with compact single-line labels:
  `Presets`, `Text`, `Artistic`, `Utilities`, and `HTML`.
- Row 2 contains the active tab's controls rendered as native ribbon toolbar
  groups, not as old floating-menu form markup moved into a fixed slot.
- The ribbon uses a fixed compact app-shell height sized for the tab row, two
  fixed control rows, a horizontal overflow lane, and the documented bottom
  clearance. Active controls must not wrap downward or push the editable
  surface lower. Horizontal sizes may adapt, but row heights remain constant.
- Semantic control boxes are packed in column-first order. Within one column,
  every stacked box must use the same column width: if the top or bottom box in
  that column requires a wider usable width, every other box in the column
  expands to match it. Do not shrink the wider box to match smaller siblings.
  This equalization affects horizontal sizing only; disabled/enabled state must
  not change the column width or row height.
- Column-first packing means the current column is filled from top to bottom
  before the next column is opened. If a one-row semantic box leaves usable
  fixed-row space below it, the next one-row box must use that lower slot and
  must not reposition to the next column. Two-row/tall boxes may start a new
  column only when they cannot fit in the remaining row space. This supersedes
  any layout that balances boxes across columns or fills every top-row slot
  before using the second row.
- Dense semantic boxes with multiple independent controls use internal columns
  before labels or values are hidden. Primary fields and dropdowns stack in a
  field column; secondary command buttons, toggles, or steppers sit in a
  companion command column. Text > Font and Text > Paragraph must not collapse
  into one long row. Enabled feature boxes such as Artistic > Background and
  Border keep their separate header-checkbox plus stable dependent-field
  hierarchy.
- Dense command columns stay adjacent to their field column and use the same
  vertical divider language as the semantic-box label/function separator.
  Command buttons must not drift to the far edge of unused ribbon or card
  space.
- Comparable stacked input/select fields in one semantic group share matched
  visual dimensions. The shared target field width is based on the widest
  reasonable selectable or enterable value for that group rather than the
  current value; long future labels may be capped only after the group reaches
  its maximum useful width. These fields should not stretch beyond that target
  merely because the card has spare horizontal space unless the group has an
  explicit flexible-field contract.
- Dense semantic boxes that own matched stacked fields are content-fitted: the
  bordered box ends after the last contained control plus normal padding,
  separator, and border. If a contained field expands because its matched-width
  value set grows, the owning box and any stacked sibling in the same column
  follow that content-derived width up to the group's maximum useful width.
  Extra header/ribbon width must not stretch Text > Font or Text > Paragraph
  once their contained controls have reached their target sizes.
- Compact select fields in dense text-ribbon groups use the same target-width
  rule even when they are unpaired; for example, Paragraph alignment is sized
  from the widest supported alignment label, not from leftover card width.
- Composite value/dropdown controls in the ribbon, such as `Font size (pt)`,
  must follow the native dropdown visual contract in
  `docs/TEXT_EDITOR_CONTRACT.md`: the `POINTS` unit label outside the field,
  value left of the chevron inside one shared bordered field, no nested
  chevron box, matching field height, and matching chevron-to-right-border
  spacing verified from a native Tauri screenshot when visual parity is in
  question.
- Text > Font uses a stacked label column with `STYLES` beside the font-family
  dropdown and `POINTS` beside the point-size dropdown so the two fields remain
  aligned.
- Text > Font uses an underlined `FORMAT` heading above the BIU command
  buttons, and those buttons remain centered in that format section.
- Text > Paragraph uses `ALIGN` beside the alignment dropdown and a `LIST`
  heading above the bulleted-list button. The `LIST` label/button stack is
  centered in the available command-column space between the divider and the
  Paragraph box's right edge, not by a hardcoded pixel offset.
- Ribbon position and size depend only on the app-shell container dimensions.
  They must not depend on selected-text bounds, safe zones, arcs, disc center
  holes, preview geometry, or collision scoring.
- The ribbon applies to cover, tray, left spine, right spine, straight disc, and
  curved disc text.
- Toast notifications keep their current top-right placement when no ribbon is
  active. When the ribbon is active, the toast stack moves below the reserved
  ribbon region with a small gap. The offset must come from the actual reserved
  ribbon slot height, preferably via shared app-shell layout state or a CSS
  variable, not from selected text, selected module, disc geometry, preview
  geometry, or a fragile hardcoded value.
- Toasts must never overlap ribbon tabs or controls, and toast appearance,
  disappearance, or animation must not resize or move the preview.

Preview responsibilities remain on the preview surface:

- The visible text renderer remains the visual source of truth.
- The preview retains caret, selection, outline, direct typing, edge movement
  affordance, Move fallback, and Delete where supported.
- Text-body dragging selects text and never moves the object.
- An approximately 8px selection-edge grab region moves the object
  immediately.
- The Move button remains an accessible movement fallback.

Ownership matrix:

| Surface | Ribbon-owned editing controls | Preview-owned affordances | Sidebar-owned setup/source controls |
| --- | --- | --- | --- |
| Cover | Contextual presets, text controls, art controls, utilities, reset style/layout, Done, Delete where supported | Direct typing, caret, selection, dotted bounds, edge-grab movement, Move fallback | Add/select, metadata/default setup without contextual equivalent |
| Tray | Same as cover, with tray geometry and wrap semantics | Same as cover | Same as cover |
| Left spine | Supported contextual text controls | Rotated caret/selection, rotated bounds, edge-grab movement, Move fallback | Add/select and structural spine setup where needed |
| Right spine | Same as left spine | Same as left spine | Same as left spine |
| Straight disc | Supported contextual text controls, including HTML source | SVG/tspan renderer, direct typing adapter, caret, selection, bounds, edge-grab movement, Move fallback | Enable/add, metadata/default source, straight/curved setup where needed |
| Curved disc | Curved-safe text controls, safe inline HTML source, arc controls, presets, Done, Delete where supported | SVG/textPath renderer, path-aware caret/selection, arc-aware bounds, direct typing adapter, edge-grab movement, Move fallback | Enable/add, metadata/default source, straight/curved mode selection |

Responsive states:

- Wide: tabs fit in one row; active controls use the full available top-right
  header column when doing so keeps controls readable and usable.
- Compact: tabs remain single-line where possible and controls keep usable hit
  targets inside fixed-height semantic-card rows. Controls condense
  horizontally and may use compact icon/dropdown-only affordances when a text
  value would become unreadable.
- Narrow: controls preserve the fixed ribbon height, row count, and column
  equalization rules. Do not add a third control row, vertical scrollbar, or
  preview-displacing overflow escape.
- Horizontal overflow may scroll inside a dedicated lane below the fixed
  control rows. That scrollbar is the fallback after the two-row semantic-card
  layout has used the available width; it must not cover the bottom row, trigger
  vertical remeasurement, change fixed row heights, or move the preview.

Current implementation:

- The reserved app-shell ribbon slot above the preview is the production
  contextual control host for cover, tray, spine, straight-disc, and
  curved-disc text.
- The ribbon is flush with the top and right edge of the preview app-shell
  column. Preview padding must not create dead blank space above or to the
  right of the ribbon; the ribbon may use the available header width up to the
  Live Preview label boundary.
- Active-tab controls consume the existing contextual control registry and
  target adapters, but render through native ribbon presentation components.
  Production ribbon code must not reuse portal-slot markup or
  `.inline-preview-text-control-grid` presentation from the old full menu. The
  ribbon does not own renderer, layout, save/load, or export behavior.
- The measured ribbon slot height or offset is exposed to the toast container
  so active-ribbon toasts stack below the ribbon while inactive-ribbon toasts
  keep their current placement.
- The preview workspace uses the remaining viewport space and scales the canvas
  down rather than pushing the preview bottom permanently below the window.
- Caret, selection, outline, direct typing, edge-grab movement, Move fallback,
  and Delete affordances remain local preview responsibilities.
- The old floating full-menu collision, docking, portal, emergency placement,
  selected-text obstacle, and menu-size feedback code has been removed from
  active editor code.

Removed legacy responsibilities:

- Selected-text-anchored tab/menu positioning, collision scoring, center/side
  docking, emergency detached placement, portal-only containment, and
  responsive-shell feedback code that existed only to keep floating menus
  usable.
- Tests and smoke routes that proved the floating menu avoided safe zones,
  center holes, or selected-text bounds.

Acceptance criteria:

- The inactive ribbon slot stays reserved with no visible contents.
- Selecting editable text activates the ribbon across cover, tray, spines,
  straight disc, and curved disc.
- The preview starts below the full header/ribbon region.
- Toasts keep their existing placement when no ribbon is active, move below the
  actual reserved ribbon slot while active, never overlap ribbon tabs or
  controls, and do not move or resize the preview.
- Ribbon position does not change when text moves, wraps, changes point size,
  changes arc geometry, touches safe zones, or crosses the disc center hole.
- Stacked semantic boxes in a ribbon column share the widest box width in that
  column; smaller boxes above or below a wider box must expand horizontally to
  match it.
- Semantic boxes fill available lower fixed-row slots in their current column
  before later boxes may start the next column.
- Text-body drag selects text; edge-grab and Move fallback move immediately.
- No migrated editing control remains duplicated in the sidebar unless it is
  intentionally sidebar-owned setup/source/type UI.
- Preview, save/load, and export parity remain unchanged.

### 9.5 Invariants And Future-Change Rules

- Curved disc text remains SVG/textPath unless a future ADR changes it. The
  current contextual curved-text adapter may expose direct text editing and
  whole-object controls, but SVG/textPath remains the visible renderer and
  curved text must not be routed through a rectangular on-canvas editor.
- Edit mode may add boundaries, toolbar controls, menus, move handles, and hidden input adapters, but it must not replace the visible text with a different visual renderer.
- Contextual text controls should migrate to the stable top-right app-shell
  ribbon. After migration, text-target geometry may control only preview
  affordances and text layout; it must not position or resize the ribbon.
- Hidden inputs and measurement layers are adapters.
- Text selection should work as text selection. Text movement should use an
  edge-grab region or Move fallback; text-body drag should never move the
  object.
- Fake visible text over a transparent input is a known violation/risk unless explicit parity tests cover it.
- Unsanitized HTML must never be used as the visual renderer source of truth;
  source editors are input adapters, and normal preview/export must consume the
  parsed safe rich-text model.
- Spaces, newlines, wrapping, caret position, final preview, save/load, and export must remain aligned.
- For case insert text, wrap width is a wrapping maximum only. Collision,
  clamping, and dotted edit bounds must use measured rendered glyph/ink bounds
  plus paint slack rather than the logical wrap box.

### 9.6 Validation Expectations

- Required text validation is broader than unit tests.
- Deterministic coverage belongs in `src/discText/*.test.ts`, `src/components/preview/inlinePreviewTextEditor*.test.ts`, `src/diagnostics/textEditorContract.test.ts`, `src/caseInsert/textReadability.test.ts`, and layout tests.
- Rich-text run style normalization coverage belongs in
  `src/text/richTextRunStyle.test.ts`.
- Runtime validation must use the text editor stabilization checklist for cover, tray, left spine, right spine, straight disc text, and curved disc text where affected.

### 9.7 Known Risks

- Browser caret measurement and wrapped text layout are fragile.
- Right spine contextual-editor clipping was reported runtime-verified in PR `#186`; keep it in smoke coverage whenever contextual editor positioning changes.
- Open issues `#178`, `#181`, and `#184` track text expansion/redesign work.

## 10. Image And Artwork System Design

### 10.1 Current Implementation Summary

The image/artwork systems import, normalize, place, frame, render, save, and export background artwork, title/logo artwork, additional artwork, screenshots, and case insert image slots.

### 10.2 Key Files

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
- `src/project/projectAssetStatus.ts`
- `src/render/imageRenderArtifact.ts`
- `src/render/artworkFrame.ts`
- `src/components/preview/ContentBoundedImage.tsx`
- `src/components/preview/ArtworkFrameOverlay.tsx`
- `src/export/canvasImage.ts`
- `src/export/drawTitleArtwork.ts`
- `src/export/drawAdditionalArtwork.ts`
- `src/export/drawArtworkFrame.ts`
- `src/caseInsert/imageSlotTransitions.ts`

### 10.3 Source-Of-Truth State

- Disc background, title artwork, and additional artwork use focused hook/domain state.
- Case insert image slots are nested in `ProjectJewelCaseState`.
- Asset provenance/status is centralized in `src/project/projectAssetStatus.ts`.

### 10.4 Render/Edit/Export Paths

- Preview renders content-bounded images and optional frames.
- Upload, Steam artwork, web artwork, local Steam screenshots, reset, clear, fit, layout, and frame controls update hook/domain state.
- Export uses canvas-safe image helpers and target-specific draw helpers.
- Saved projects persist image data URLs, image sizes, provenance, layout, scale, offsets, and frames where relevant.

### 10.5 Invariants And Future-Change Rules

- Source switching, upload, clear, reset, drag, slider/manual controls, save/load, preview, and export must remain coherent for each image-backed feature.
- Image content bounds and shape detection may affect placement and crop; preview and export must agree.
- Built-in/default app artwork is a valid source and should not create warnings solely because it is built in.
- Future shared asset-library work must not break current embedded data URL reload behavior.

### 10.6 Validation Expectations

- Unit tests should cover image geometry, content bounds, content shape, render artifacts, artwork frames, and project import/normalization.
- Manual visual checks are required for placement, crop, drag, and export parity.

### 10.7 Known Risks

- Preview CSS/object-fit behavior and canvas `drawImageContent` can diverge.
- Case insert artwork slots add target-region complexity.

## 11. Visual Elements, Marks, Logos, And Ratings

### 11.1 Current Implementation Summary

The app supports Steam banner branding, developer/publisher/additional logos, rating badges, media marks, platform marks, technical marks, and centralized built-in asset routing.

### 11.2 Key Files

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

### 11.3 Source-Of-Truth State

- Disc visual element runtime state is owned by focused hooks and project modules.
- Case insert branding slots are part of `ProjectJewelCaseState`.
- Built-in asset IDs, dimensions, and file routing live in `src/assets/assetManifest.ts`.

### 11.4 Render/Edit/Export Paths

- Disc preview has dedicated layers for banner, logos, rating badge, media mark, platform marks, and technical marks.
- Case insert preview maps logo/mark slots into template/spine layers.
- Disc export uses dedicated draw helpers.
- Case insert export draws slot groups from case insert slot state.
- `OptionalFeatureSection` only owns the neutral sidebar shell for an optional feature's show/enable control, dependent-control hiding, and slots; feature modules still own state, reset/clear semantics, rendering, save/load, and export.
- Current shell adoption covers Steam banner controls, rating badge controls, media marks, case insert game-logo/title artwork, disc game title/logo artwork, disc primary developer/publisher logos, case insert primary developer/publisher logo slots, additional-artwork global gates, and additional-artwork frame gates. More complex optional visuals such as background artwork, platform marks, technical marks, repeated visual element cards, and text sections retain their existing shells unless separately migrated with their feature-owned semantics preserved.

### 11.5 Invariants And Future-Change Rules

- Optional visual disabled behavior must hide dependent controls, preserve state, and omit preview/export rendering.
- Shared optional feature shells must stay state-agnostic and must not flatten feature-specific reset, source, renderer, geometry, save/load, or export behavior into one domain model.
- Source controls must not invent editor-specific duplicate source concepts when shared source behavior exists.
- Rating badge "off" behavior is the top-level show/enable checkbox; avoid redundant visible "none" controls unless backward compatibility requires them.
- Built-in asset expansion must route through `assetManifest.ts` or a documented successor.

### 11.6 Validation Expectations

- Unit tests cover asset manifest, optional visual feature gates, logo/mark source helpers, project modules, and render models.
- Manual validation must cover drag, slider/manual placement, upload/custom image, reset/clear, save/load, preview, and export.

### 11.7 Known Risks

- Open issue `#125` tracks missing/historical mark families.
- Case insert branding sync is large and parity-sensitive.

## 12. Disc Editor Design

### 12.1 Current Implementation Summary

The disc editor builds printable disc labels with background artwork, additional artwork, Steam banner branding, title/logo artwork, logos, rating/media/platform/technical marks, disc text, guide overlays, preflight, and PNG export.

The disc editor is the first alpha-capable app surface.

### 12.2 Key Files

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
- `src/discText/*`
- `src/layout/disc*.ts`
- `src/layout/layoutRangeMath.ts`
- `src/templates/discTemplates.ts`
- `src/export/exportPng.ts`
- `src/export/exportPreflight.ts`
- `src/export/discDesignCheck.ts`

### 12.3 Source-Of-Truth State

- Runtime state is split between `App.tsx` and disc feature hooks.
- Persisted state is `SavedDiscProject`.
- Disc layer order lives in `src/editor/layerOrder.ts`.

### 12.4 Render/Edit/Export Paths

- `DiscPreview` composes preview layers according to disc layer order.
- Sidebar panels edit feature state.
- Direct preview dragging uses `useDiscPreviewPointerDrag`.
- Straight text inline editing uses the shared preview-mounted editor with a disc adapter.
- Preflight uses `buildExportPreflightSummary`.
- PNG export uses `exportDiscLabelPngBytes`.

### 12.5 Invariants And Future-Change Rules

- Preserve the current sidebar flow: Project File, Export Options, Game, Template, Artwork, Branding, Text, Guide Legend.
- Keep circular disc geometry out of case insert modules.
- Keep shared layout helpers limited to neutral numeric range math; disc annulus, center-hole, and safe-zone collision rules remain disc-owned.
- Keep editor-only guides and UI chrome out of clean exports.
- Preserve disc preview/export parity and fixed layer order.
- Curved disc text remains SVG/textPath.

### 12.6 Validation Expectations

- Unit coverage should include disc text, disc geometry, preflight/design checks, project restore, and feature project modules.
- Manual validation should cover Steam import, artwork import, drag, slider/manual controls, save/load, export preflight, clean export, guide export, and preview/export visual comparison.

### 12.7 Known Risks

- Disc preview/export parity depends on separate DOM/SVG and canvas paths.
- Straight text and curved text have different render/edit constraints.
- This documentation refresh did not independently launch Tauri. PR `#186`
  reported runtime validation for straight disc inline editing and the curved
  SVG/textPath exception.

## 13. Case Insert Editor Design

### 13.1 Current Implementation Summary

The case insert editor is a separate rectangular editor environment. Jewel case is the first supported case insert template. Current code includes cover, tray, left spine, and right spine state/editing/render/export paths, but the editor remains active work and not alpha-complete.

### 13.2 Key Files

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
- `src/layout/layoutRangeMath.ts`
- `src/templates/caseInsertTemplates.ts`
- `src/export/exportCaseInsertPng.ts`
- `src/export/caseInsertExportPreflight.ts`
- `src/export/caseInsertDesignCheck.ts`
- `docs/CASE_INSERT_EDITOR_LAYER_ORDER.md`
- Historical planning context, if needed: `docs/archive/CASE_INSERT_EDITOR_ARCHITECTURE.md`

### 13.3 Source-Of-Truth State

- `ProjectJewelCaseState` and related types live in `src/project/projectTypes.ts`.
- Defaults and normalization live under `src/caseInsert/`.
- Case insert saved-project adapters live in `src/project/caseInsertProjectAdapters.ts`.
- `src/project/projectCaseInsert.ts` is a compatibility barrel and should not receive new behavior.

### 13.4 Render/Edit/Export Paths

- `CaseInsertEditorShell` wires case project controls, game controls, export controls, surface controls, spine controls, preview, and actions.
- `CaseInsertTemplatePreviewLayers` renders cover/tray template layers.
- `CaseInsertSpinePreviewLayer` renders left/right spine content.
- `useCaseInsertTemplateEditor` owns cover/tray editing actions.
- `useJewelCaseSpineEditor` owns spine editing actions.
- `useCaseInsertPreviewPointerDrag` handles case preview dragging.
- Export uses `exportCaseInsertPngBytes`.
- Preflight/design check use case insert export helpers.

### 13.5 Invariants And Future-Change Rules

- Jewel case is a case insert template, not a disc template.
- DVD/Amaray and Blu-ray must remain unavailable until usable template, preview, save/load, and export support exists.
- Keep rectangular case geometry out of disc-specific modules.
- Keep cover, tray, left spine, and right spine behavior explicit.
- Keep rectangular bounds, cover/tray/spine coordinate interpretation, and movement policy case-owned; shared layout helpers may own only neutral numeric range math.
- Shared controls may render neutral UI, but target-specific geometry and source-slot mapping remain case-owned.
- Parity work must cover all applicable target surfaces, not only one panel shape.

### 13.6 Validation Expectations

- Unit tests should cover case defaults, normalization, layout helpers, export guide options, preflight, design check, branding visibility, and title/text/artwork helpers.
- Manual validation should cover New Case Insert, loading case projects, cover/tray/spine controls, source switching, drag, save/load, clean export, guide export, and preview/export parity.

### 13.7 Known Risks

- Case insert hooks and export are large and central.
- Structured tray/spine layouts remain open under `#149`.
- Jewel case alpha remains open under `#126`.
- Broad case insert runtime behavior remains source-reviewed in this document.
  PR `#186` reported runtime validation for cover, tray, and spine inline text
  editor parity only.

## 14. Interaction Model

### 14.1 Current Implementation Summary

Preview interactions use shared pointer-drag primitives plus editor-specific adapters. Preview selection and hover overlays use DOM attributes and measured overlay boxes. Text editing uses a preview-mounted editor with contextual controls.

### 14.2 Key Files

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

### 14.3 Source-Of-Truth State

Pointer operations update owning feature state through callbacks. Preview
viewport zoom/pan state is local editor UI state owned by `PreviewViewport`; it
is not persisted and is not part of export geometry. Overlay hover/selection
state is local to the overlay component. Editable element identity, DOM
attribute names, stable target keys, and inline text target keys are owned by
`src/editor/previewEditableRegistry.ts`. `src/editor/previewElementOverlay.ts`
remains the overlay lookup and rectangle-measurement facade.

### 14.4 Render/Edit/Export Paths

- Preview elements expose registry-defined data attributes for overlay lookup.
- `PreviewElementOverlay` measures matching DOM nodes.
- Drag adapters translate pointer movement into percent or pixel layout changes.
- `PreviewViewport` transforms the preview surface as an app-shell viewport.
  Design Check and Guide Legend controls remain outside the transformed stage.
  Percentage-based drag math uses transformed DOM bounds; pixel-based drag math
  must compensate for viewport scale. The transformed stage reserves only the
  compact right control rail, the bottom Design Check / Guide Legend rail, and
  the 4px side surface guard, and must not reintroduce old fixed preview width
  caps that create artificial side gutters. The right rail uses the approved
  two-column zoom out/in, Fit, and pan layout; Fit calculations reserve the
  minimum 48px rail, then the visible rail may grow continuously up to 96px
  only into residual unused gutter. The expanded rail width must not feed back
  into Fit, reduce the fitted preview scale, or move the fitted design surface.
- Inline text adapters use registry-defined target keys while surface adapters continue to own geometry, values, commit behavior, and move handling.
- Export consumes saved layout state and does not reuse DOM overlay measurements.

### 14.5 Invariants And Future-Change Rules

- Interaction layers are adapters, not visual source-of-truth renderers.
- Zoom/pan controls must stay outside saved design state. Fit resets viewport
  pan/zoom to the available preview space; Ctrl+wheel, middle-drag, Space+drag,
  and right-edge pan buttons must inspect the same preview surface without
  changing export output. The Fit state uses the available preview stage, not a
  legacy hard maximum preview width. Current zoom is exposed through accessible
  control labels/tooltips; the compact rail intentionally has no visible 100%
  or percentage control.
- Design Check and Guide Legend are app-shell controls, not design content. Their
  closed buttons reserve fixed bottom workspace rail space. Expanding either
  panel must not resize, refit, or move the preview surface.
- Drag behavior, slider/manual controls, upload/custom image, reset/clear, save/load, preview, and export must stay aligned for movable visual elements.
- Normal text pointer behavior should allow text selection; movement uses a handle or intentional long-hold behavior.
- Snapping, keyboard nudging, context menus, and inspector workflows should extend the existing interaction owners, not create a separate hidden state path.

### 14.6 Validation Expectations

- `src/interaction/dragGeometry.test.ts` and overlay/editor tests cover deterministic helpers.
- Runtime validation is required for pointer capture, drag affordances, overlay measurement, focus behavior, text selection, and move handles.

### 14.7 Known Risks

- DOM measurement and ResizeObserver behavior are runtime-dependent.
- Open issue `#172` tracks selection, snapping, and keyboard nudging.
- Preview inspector/context menu work remains open under `#174`, `#175`, and `#176`.

## 15. Save/Load Design

### 15.1 Current Implementation Summary

Save/load is orchestrated by `App.tsx`, project snapshot/restore helpers, and Tauri file commands. Save writes JSON. Load reads JSON, validates and normalizes enough to route and restore editor state.

### 15.2 Key Files

- `src/app/App.tsx`
- `src/project/createProjectSnapshot.ts`
- `src/project/restoreProjectState.ts`
- `src/project/caseInsertProjectAdapters.ts`
- `src/project/projectSchema.ts`
- `src/project/projectRouting.ts`
- `src/project/savedProjectNormalization.ts`
- `src/tauri/fileSystem.ts`
- `src-tauri/src/commands/files.rs`

### 15.3 Source-Of-Truth State

Runtime state is source of truth while editing. Saved JSON snapshots are source of truth after save. Restore helpers normalize saved JSON into runtime state.

### 15.4 Render/Edit/Export Paths

- Disc save uses `createProjectSnapshot`.
- Disc load uses `restoreProjectStateFromContents`.
- Case insert save/load uses `createCaseInsertProjectSnapshot` and `restoreCaseInsertProjectStateFromContents`.
- `resolveSavedProjectRouteFromContents` routes loaded projects to the correct workspace.
- Export uses runtime state after any load/restore.

### 15.5 Invariants And Future-Change Rules

- Saving and loading must preserve current visual state, disabled state, uploaded assets, source choices, placement, scale, custom images, and export guide settings.
- Load normalization may tolerate sparse legacy data but must not erase valid user data.
- Case insert projects must not restore through the disc path.
- Future package support must continue to load current `.sbls.json` files.

### 15.6 Validation Expectations

- Project schema/routing/restore tests should be updated for schema changes.
- Manual validation should save, reload, and export both disc and case insert projects when affected.

### 15.7 Known Risks

- Shallow schema validation can miss nested invalid states.
- Real dirty source changes may affect exact save/load behavior until committed or reverted by the user; status-only/no-diff files are not treated as meaningful source changes.

## 16. Export Design

### 16.1 Current Implementation Summary

Export renders PNG bytes through canvas helpers. Disc export is circular and 300 DPI by selected/custom disc geometry. Case insert export is rectangular and template-driven. Export preflight summarizes output and warnings before writing files.

### 16.2 Key Files

- `src/export/exportPng.ts`
- `src/export/exportCaseInsertPng.ts`
- `src/export/canvasImage.ts`
- `src/export/exportPreflight.ts`
- `src/export/discDesignCheck.ts`
- `src/export/caseInsertExportPreflight.ts`
- `src/export/caseInsertDesignCheck.ts`
- `src/export/preflightWarnings.ts`
- `src/export/draw*.ts`
- `src/editor/layerOrder.ts`
- `src/templates/templateModel.ts`
- `src-tauri/src/commands/files.rs`

### 16.3 Source-Of-Truth State

Export reads current runtime project state and template geometry. Layer order policy comes from `src/editor/layerOrder.ts`.

### 16.4 Render/Edit/Export Paths

- Export starts in `App.tsx`.
- Preflight summary is built.
- User confirmation is requested if warnings exist.
- Canvas export builds PNG bytes.
- Tauri writes binary PNG bytes.

### 16.5 Invariants And Future-Change Rules

- Clean export omits editor-only guides and preview chrome.
- Guide-enabled export draws selected guides intentionally.
- Export must match visible preview content and layer order.
- Export warnings must not fire solely because an element uses a built-in/default generic asset.
- Export must not silently omit enabled preview-visible elements.

### 16.6 Validation Expectations

- Unit tests cover preflight, design checks, canvas helpers, and draw helpers.
- Visual/editor changes need manual preview/export comparison.
- PNG pixel output was not validated for this SDD.

### 16.7 Known Risks

- Case insert export is large and tightly coupled to surface/spine layout, text, branding, and image slot helpers.
- Canvas export cannot reuse all DOM/SVG preview details directly.

## 17. Guide, Checklist, And Preflight Design

### 17.1 Current Implementation Summary

The app displays editor guides, guide legends, design check warnings, and export preflight warnings. Disc export guide toggles and case insert export guide IDs are persisted in project state.

### 17.2 Key Files

- `src/components/preview/DiscGuideOverlay.tsx`
- `src/components/preview/CaseInsertGuideOverlay.tsx`
- `src/components/preview/PreviewGuideLegendPanel.tsx`
- `src/components/preview/PreviewDesignCheckPanel.tsx`
- `src/components/preview/usePreviewGuideLegendPlacement.ts`
- `src/export/exportPreflight.ts`
- `src/export/discDesignCheck.ts`
- `src/export/caseInsertExportPreflight.ts`
- `src/export/caseInsertDesignCheck.ts`
- `src/export/drawExportGuides.ts`
- `src/export/drawCaseInsertGuides.ts`
- `src/caseInsert/exportGuideOptions.ts`
- `src/caseInsert/guideStyles.ts`
- `src/caseInsert/exportSettings.ts`

### 17.3 Source-Of-Truth State

- Disc guide settings are owned by `App.tsx` and saved in disc project export settings.
- Case insert guide IDs live in case insert export settings.
- Design check data is computed from current editor state.

### 17.4 Render/Edit/Export Paths

- Guide overlays render in preview.
- Guide legends render in preview/sidebar UI according to current UI ownership.
- Export draws selected guides after normal content.
- Preflight/design checks produce summaries and warnings.

### 17.5 Invariants And Future-Change Rules

- Guide Legend remains in the current sidebar flow unless issue-scoped work moves it.
- Export guide behavior must be explicit and user-controlled.
- Design Check notification badges should be reserved for concrete design-rule failures, not lower-risk print advisories.

### 17.6 Validation Expectations

- Preflight/design-check tests must be updated when warnings change.
- Manual validation must compare clean and guide-enabled export behavior where affected.

### 17.7 Known Risks

- Guide legend placement and preview/export guide parity require visual/manual verification.

## 18. Validation Strategy

### 18.1 Source-Level Validation

Use these commands according to change scope:

- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run check:cycles`

For code changes, repository instructions expect `npm run lint` and `npm run build`. For ownership/module changes, cycle checking is required. For text editor stabilization work, `docs/TEXT_EDITOR_CONTRACT.md` calls for test, lint, cycle check, and build.

### 18.2 Runtime Validation

Runtime validation is required before claiming correctness for:

- WYSIWYG text editing.
- Preview/export parity.
- Drag, selection, pointer capture, and move handles.
- Upload/custom image controls.
- Save/load behavior affecting visual state.
- Exported PNG visual output.
- Desktop/narrow layout behavior.
- Tauri/native file dialogs and command integration.

Manual runtime validation should use:

- `docs/MANUAL_SMOKE_CHECKLISTS.md`
- `docs/VISUAL_REGRESSION_WORKFLOW.md`
- `npm run tauri dev` launched from the primary checkout by the user or with
  explicit user permission, then the native Tauri window operated manually or
  through Any App / Computer Use. Browser/Vite diagnostics cannot establish
  user-visible runtime acceptance.

### 18.3 Test Coverage Summary

Current tests cover broad helper and contract areas:

- Asset manifest and built-in dimensions.
- Image geometry, bounds, content shapes, and background sources.
- Steam banner defaults and Steam metadata/artwork imports.
- Shared editor controls and optional visual feature gates.
- Preview overlay and inline text editor helpers.
- Disc text layout, SVG, curved text, styles, and disc-number artwork.
- Case insert branding, export guides, text readability, title artwork, sidebar workflow, and copy fitting.
- Export preflight, design checks, warning copy, and draw helpers.
- Drag geometry.
- Disc and jewel case layout helpers.
- Project schema, routing, restoration, normalization, and feature-specific serialization.
- Shared project parity diagnostics for runtime-to-snapshot-to-restore-to-export inputs across representative disc and case insert fixtures.

### 18.4 Known Validation Gaps

- Browser diagnostic scripts exist for selector and DOM triage, but required
  user-visible smoke targets the native Tauri window rather than Playwright
  against localhost.
- Manual Tauri behavior is not validated by tests alone.
- Current fixture coverage does not fully cover every recently added visual system.
- This SDD task did not run validation commands because it is docs-only and did not change source or package metadata.

## 19. Known Fragile Areas And Gaps

### 19.1 Fragile Areas

- `App.tsx` remains large and coordinates many feature flows.
- Case insert editor hooks and export are large and central.
- Project schema validation is shallow and has no migrations.
- Preview and export rendering are separate paths in several subsystems.
- Inline text editing depends on DOM measurement, caret math, wrapped text, CSS, and runtime focus behavior.
- CSS can become hidden rendering/layout policy.
- Optional visual disabled-state behavior is cross-cutting and regression-prone.
- Case insert global-source branding sync is parity-sensitive.
- The current working tree has status noise and may have uncommitted work; behavior should be verified before release claims. Status-only/no-diff files are not treated as meaningful source changes.

### 19.2 Known Gaps

- Case insert editor is active but not alpha-complete.
- Structured tray/spine layouts remain open under `#149`.
- Jewel case alpha remains open under `#126`.
- Historical mark families remain open under `#125`.
- Schema validation and migrations remain open under `#48`.
- Preview selection, snapping, keyboard nudging, inspector, and context-menu workflows remain open under related preview issues.
- Future `.sbls` package read/write is not implemented.
- DVD/Amaray and Blu-ray editors are future planned surfaces, not current working editors.

### 19.3 Areas For User Review

- Whether any future real source diffs should become part of the as-built baseline or stay local WIP.
- Whether additional ADRs should be split into separate files later.
- Which runtime scenarios should be prioritized for the next manual validation pass.
- Whether the text editing contract should be considered already satisfied or still a gate for issue `#184`.

## 20. Architectural Decision Records

These ADRs summarize current architectural decisions. They are embedded here so the SDD can act as the as-built contract. Future changes that reverse these decisions should add or update an explicit ADR.

### ADR-001: Tauri, React, TypeScript, And Rust Split

Status: Accepted, current.

Decision:

- Use Tauri for the desktop shell and native commands.
- Use React and TypeScript for the editor UI and stateful product behavior.
- Use Rust/Tauri commands for filesystem, Steam/network, local Steam discovery, local image reading, and platform folder opening.

Consequences:

- UI state belongs in React/domain modules, not Rust.
- Native commands should remain request/response integration points.
- Runtime validation must account for both frontend and Tauri shell behavior.

### ADR-002: Separate Disc Editor And Case Insert Editor

Status: Accepted, current.

Decision:

- The Disc Editor owns circular disc-label projects.
- The Case Insert Editor owns rectangular case insert projects.
- Jewel case is a case insert template, not another disc template.
- DVD/Amaray and Blu-ray remain unavailable until implemented.

Consequences:

- Disc geometry and case geometry remain separate.
- Shared helpers must be neutral or adapter-based.
- Parity work must map source-of-truth behavior to every applicable target surface.

### ADR-003: Plain JSON Project Files Are Current Format

Status: Accepted, current.

Decision:

- Current projects are plain `.sbls.json` JSON files using schema version `0.1.0`.
- Images needed for reload are embedded as data URLs where supported.
- Future `.sbls` packages are documented but not implemented.

Consequences:

- Current save/load work must preserve JSON compatibility.
- Package behavior must not be implied in UI/docs until implemented.
- Future package work must continue loading existing JSON projects.

### ADR-004: Fixed Layer Order Policy

Status: Accepted, current.

Decision:

- Disc and case insert layer order live in `src/editor/layerOrder.ts`.
- Layer-order docs describe the corresponding preview/export stacks.

Consequences:

- New visual layers must be added to layer-order policy before rendering.
- Preview and export must not rely on incidental JSX or canvas order.

### ADR-005: Preview And Export Are Separate Adapters Under One Visual Contract

Status: Accepted with constraints, current.

Decision:

- Preview may use DOM/SVG/React.
- Export may use canvas.
- Both must follow the same visual contract, layer order, coordinate intent, and persisted state.

Consequences:

- Export renderers are adapters, not independent visual truths.
- Preview/export parity tests and manual comparison are required for visual changes.

### ADR-006: Curved Disc Text Remains SVG/TextPath

Status: Accepted, current.

Decision:

- Curved disc text remains SVG/textPath based.
- Curved disc text must not be forced into a visible rectangular textarea.
- Curved disc text may use contextual controls and direct text editing only
  through a curved-disc adapter that keeps SVG/textPath as the visible renderer
  and uses hidden/native input solely as an interaction adapter.

Consequences:

- Shared text infrastructure may support straight and curved contextual
  controls, but curved text keeps a disc-specific SVG/textPath renderer.
- Any future replacement requires an explicit ADR and parity validation.

### ADR-007: Preview-Mounted Text Editing Is WYSIWYG-Protected

Status: Accepted, current contract.

Decision:

- The visible text object remains the editable preview object.
- Edit mode may add affordances and adapters.
- Fake visible text over transparent input is a known violation/risk and is forbidden unless explicit parity tests prove equivalence.
- Text movement uses a handle or intentional long-hold behavior, not ordinary text-drag selection.

Consequences:

- Hidden inputs, caret helpers, and measurement layers cannot become separate visual renderers.
- Runtime text editor validation is mandatory for claims of correctness.
- PR `#186` reported runtime evidence that cover, tray, spine, and straight disc inline editing now keep the final renderer visible during edit and use adapter input/selection paths. The previous blanket noncompliance caveat is stale for those surfaces, but this ADR remains the stabilization contract for future WYSIWYG work.

### ADR-008: Optional Visual Features Preserve Disabled State

Status: Accepted, current.

Decision:

- Optional visual features expose a top-level show/enable checkbox.
- Disabled features hide dependent controls, do not render/export, and preserve saved state.

Consequences:

- Feature state must not be deleted merely because the user disables visibility.
- Preview, export, preflight, and save/load must agree.

### ADR-009: Contextual Text Controls Use A Stable App-Shell Ribbon

Status: Implemented production contract.

Decision:

- Use the stable
  top-right app-shell contextual text ribbon.
- Reserve the ribbon slot above the preview, keep Live Preview heading on the
  left, and start the preview below the full header/ribbon region.
- Keep contextual tabs and active-tab controls in the ribbon while leaving
  caret, selection, direct typing, outlines, edge-grab movement, Move fallback,
  and Delete affordances on the preview.
- Give the ribbon priority over the existing top-right toast stack while it is
  active by offsetting toasts below the measured reserved ribbon slot.
- Keep intentional setup/source/type controls in the sidebar.
- Keep the full-menu collision, docking, portal, and emergency-placement
  system deleted now that the ribbon owns contextual controls.

Consequences:

- Contextual control placement must no longer be solved from selected-text
  bounds, safe zones, arcs, center holes, or preview geometry.
- The ribbon must be responsive to app-shell container dimensions only.
- Ribbon semantic boxes are packed column-first. Each column uses the width of
  its widest box for every box in that column, so smaller boxes above or below
  a wider box expand to match it without changing row height.
- A column must be filled from top to bottom before the next column opens; a
  one-row box below an existing one-row box cannot be skipped in favor of
  starting a new column when that lower slot is available.
- Toast offset should consume shared app-shell ribbon height/offset state or a
  CSS variable and must not be derived from preview or text geometry.
- Surface adapters continue to own renderer, layout, state, save/load, export,
  and target-specific editing affordances.
- Migration work must preserve WYSIWYG renderer parity and curved
  SVG/textPath behavior.

### ADR-010: App.tsx Is Orchestration, Not A Logic Dumping Ground

Status: Accepted as a direction and guardrail, partially achieved.

Decision:

- `App.tsx` may coordinate top-level workspaces, hooks, dialogs, save/load/export orchestration, and status messages.
- New feature-specific logic belongs in focused hooks, domain modules, renderers, layout helpers, export helpers, project helpers, or utilities with narrow ownership.

Consequences:

- Future fixes should refactor ownership boundaries when hidden coupling causes regressions.
- Open issue `#44` remains relevant.

### ADR-011: Built-In Generic Assets Are Valid Output Sources

Status: Accepted, current.

Decision:

- Built-in/default generic app assets are valid first-party output.
- Built-ins route through `src/assets/assetManifest.ts`.
- Built-in status alone must not create warnings or design-check badges.

Consequences:

- Warning logic targets missing content, invalid settings, unresolved behavior, or print/readability risks.
- Future mark/badge/logo catalogs must preserve centralized asset routing.

### ADR-012: Validation Claims Must Distinguish Source Checks From Runtime Checks

Status: Accepted, current.

Decision:

- Tests, lint, build, and cycle checks prove source-level properties only.
- Runtime editor behavior, WYSIWYG text, drag, preview/export parity, file dialogs, and desktop layout require manual runtime verification.
- Agents do not run Tauri unless explicitly asked.

Consequences:

- Final reports for visual/editor work must state what was actually verified.
- Documentation-only work must not claim runtime validation.

## 21. Future Plans And Non-Current Behavior

The following are documented future plans or active gaps, not current implemented guarantees:

- Guided Start and opening-screen workflow.
- Full `.sbls` package read/write.
- DVD/Amaray and Blu-ray case editors.
- Direct printer integration.
- Full arbitrary layer management.
- Automated visual regression in CI.
- Complete text-system redesign under `#184`.
- Preview snapping, keyboard nudging, inspector, and context menus.
- Complete jewel case alpha readiness.

## 22. SDD Change Rule

Future changes to this SDD should remain evidence-based:

- Update the relevant subsystem section when source ownership changes.
- Add or update an ADR when a core contract changes.
- Clearly mark future plans as future.
- Do not describe planned behavior as implemented until code, tests, and runtime evidence support it.
