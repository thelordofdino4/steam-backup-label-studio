# Software Design Document
> Status: Authoritative architecture contract.
> Purpose: As-built architecture contracts for state, rendering, editing, save/load, export, and subsystem boundaries.
> Read when: Architecture-sensitive work, renderer/editor/export changes, schema work, drag/selection, or parity-sensitive changes.
> Authoritative source: This document for architecture; AGENTS.md for stricter agent workflow rules.
> Last reviewed against commit: `6feb262bed2abd36b1371e5c0674013018132d16`.
> Lifecycle/package authority cross-references reviewed against PR #326 merge commit `4db227266695ee0b35d33e1f88e82cd88ad85034` plus the focused `agent/project-session-dirty-replacement-guard` implementation checkpoint on 2026-07-29. The broader as-built inventory below still records its separately identified refactor baseline where stated.


This Software Design Document describes the as-built architecture of Steam Backup Label Studio. It is a contract document for preserving current behavior while future work continues. It is not a feature proposal and it does not claim that future planned behavior is implemented.

## 1. Document Scope

### 1.1 Evidence Base

This SDD is based on the repository inventory in `docs/REPO_ARCHITECTURE_INVENTORY.md`, current project documentation, source files, tests, and a live review of open GitHub issues. Because this SDD cites the inventory, `docs/REPO_ARCHITECTURE_INVENTORY.md` must be included with any main-branch commit that includes this SDD.

Branch and commit described by this SDD refresh:

- Branch: `main`
- HEAD commit: `6feb262bed2abd36b1371e5c0674013018132d16`
- Refactor impact comparison: `d23c1bafdce998041bc7c683ebd38f0401acdd39..6feb262bed2abd36b1371e5c0674013018132d16`.
- `main` and `origin/main` were both at `6feb262bed2abd36b1371e5c0674013018132d16` when this refresh began, so the merge-base with `origin/main` was HEAD. The previous commit range above is used only to inventory the merged large-refactor pass.

Post-refactor documentation reconciliation note:

- A large behavior-preserving refactor pass was merged as
  `6feb262bed2abd36b1371e5c0674013018132d16`. It split oversized files,
  added focused helper modules, and expanded contract tests across app
  orchestration, text editing, case insert, export, project save/load, Steam
  candidate discovery, layout, and smoke diagnostics.
- This SDD documents the as-built code after that merge. It does not claim
  future architecture is implemented.
- The later package-codec checkpoint starts from
  `ba89635bc4075b013361feb6af33147f1a4e14e3` and adds one Rust-owned
  package-domain workspace member plus its focused tests and vendored native
  decoder sources. Those files are
  described as current implementation in the package-focused sections below;
  they are not evidence that production `.sbls` Open or Save is connected.
- The later bounded binary project-I/O checkpoint starts from
  `a040e72a6972d07c2cd72198fd8bcc835d9ea113` and adds dormant raw-byte
  Tauri commands, bounded native reading, atomic binary writing, and a dormant
  TypeScript port.
- The later dormant package Open-staging checkpoint starts from
  `42c58821ad355a0cbc3ee602c94ec67ac7345de0` and composes bounded native read
  with package decode, returns raw hydrated JSON bytes through a strict
  TypeScript port, and delegates to the existing mutation-free staging owner.
  It does not change dialogs, lifecycle commands, production `.sbls` Open,
  Save, or Save As.
- PR #324 merged that staging checkpoint at
  `607ab5ffc73f22f71105ea7e5434c93f3de439ef`. The focused package Save
  checkpoint documented below adds session persistence identity,
  lifecycle-owned Save/Save As, a closed asset capture plan, a published
  built-in compatibility registry, bounded native encode/write, atomic commit,
  and native legacy-source alias protection. It deliberately leaves production
  package Open, content sniffing, replacement guards, Resume, and menus dormant.
- PR #325 merged production package Save/Save As at
  `b69ce9e905041796c318c059e55cc030a587d962`. The focused package-Open
  checkpoint documented here adds bounded native content recognition, `.sbls`
  and `.json` chooser affordances, production package-versus-legacy dispatch,
  and truthful package session adoption through the existing immutable staging
  and lifecycle commit owners. It leaves replacement guards, Resume, menus,
  shortcuts, and history absent.
- Manual app testing was reported before the merge with no regressions spotted,
  but this documentation refresh did not independently launch Tauri.

Original broad-refresh working-tree note:

- The checkout was clean at the start of this documentation refresh.
- That broad refresh was documentation-only. The later focused package-codec
  and dormant binary project-I/O checkpoints are separately identified above
  and do not re-baseline unrelated editor architecture.

Related current issue context:

- `#44` remaining editor state extraction.
- `#46` CSS organization.
- `#48` closed project schema validation and migration baseline; future schema
  changes remain owned by `PROJECT_FILE_SPEC.md`.
- `#125` historical technology mark catalog expansion.
- `#126` jewel case editor alpha finish line.
- `#149` structured tray/spine layouts for case inserts.
- `#172`, `#174`, `#175`, `#176` preview editing and workflow improvements.
- `#178`, `#181`, `#184` text system and preview-mounted text editing work.
- `#266` was the large-file refactor tracking issue and is closed as completed
  after merge commit `6feb262bed2abd36b1371e5c0674013018132d16`.

### 1.2 Scope Boundaries

This document describes:

- How the app currently starts, stores state, renders, edits, saves, loads, validates, and exports.
- The architecture contracts future changes must preserve.
- Known fragile areas visible from current files, tests, docs, and issues.

This document does not:

- Claim live Tauri runtime behavior was manually verified.
- Claim case insert alpha completion.
- Claim native Tauri workflow acceptance was performed for application-connected
  `.sbls` Open/Save/Save As. Their source paths are connected, but this
  checkpoint did not run the interactive Tauri application or platform dialogs.
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

- Preview-mounted text editing is governed by this WYSIWYG contract. As of
  merge commit `6feb262bed2abd36b1371e5c0674013018132d16`, cover, tray,
  left/right spine, and straight disc inline editing keep the final preview
  renderer visible during edit and use target-specific input/selection adapters
  instead of fake visible edit text.
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

Artwork-frame material rendering is covered by the stricter reset contract in
`docs/ARTWORK_FRAME_MATERIAL_CONTRACT.md`. Future material work must not claim
visual acceptance from unit tests, generated contact sheets, browser-only
diagnostics, or shared-source assertions alone. The native Tauri preview and
PNG export must be checked from the primary checkout before reporting
user-visible material behavior as fixed.

### 4.6 Contract Test Owners

The architectural contracts above are enforced by source-level tests where the
behavior is deterministic. These tests do not replace native runtime
verification, but they are the named gates that should fail when a contract is
violated:

- Preview-mounted text renderer ownership and adapter boundaries:
  `src/diagnostics/textEditorContract.test.ts`,
  `src/components/preview/inlinePreviewTextEditorContract.test.ts`, and
  `src/components/preview/inlinePreviewTextEditorRendererContract.test.ts`.
- Text selection, caret, source editing, and geometry helpers:
  `src/components/preview/inlinePreviewTextEditorSelection.test.ts`,
  `src/components/preview/inlinePreviewTextEditorCaret.test.ts`,
  `src/components/preview/inlinePreviewTextEditorSource.test.ts`, and
  `src/components/preview/inlinePreviewTextEditorTextGeometry.test.ts`.
- Contextual ribbon layout/control contracts:
  `src/components/preview/contextualTextRibbon*.test.ts`.
- Rich-text command and serialization contracts:
  `src/text/richTextCommands.test.ts`,
  `src/text/richTextRunRanges.test.ts`,
  `src/text/richTextSelectionRanges.test.ts`,
  `src/text/richTextListKeyboard.test.ts`, and
  `src/text/htmlText.test.ts`.
- Project save/load/export parity:
  `src/diagnostics/projectParityHarness.test.ts`,
  `src/diagnostics/projectParityHarnessDisc.test.ts`,
  `src/diagnostics/projectParityHarnessCaseInsert.test.ts`, and the focused
  `src/project/projectCaseInsert*.test.ts` and `src/project/restoreProject*.test.ts`
  suites.
- Case insert slot/source, branding, and disabled-state preservation:
  `src/caseInsert/branding*.test.ts`,
  `src/caseInsert/imageSlotSource*.test.ts`,
  `src/caseInsert/templateSurface*.test.ts`, and
  `src/caseInsert/jewelCaseSpine*.test.ts`.
- Export warning and visibility contracts:
  `src/export/caseInsertExportPreflight.test.ts`,
  `src/export/caseInsertPreflightImageWarnings.test.ts`,
  `src/export/caseInsertPreflightVisibility.test.ts`, and
  `src/export/exportPreflight.test.ts`.

## 5. App Architecture Overview

### 5.1 Current Implementation Summary

The app is a Tauri desktop shell with a Vite/React/TypeScript frontend. React owns the editor UI and runtime state. Rust/Tauri owns native file, network, local Steam, local image, and platform folder-opening commands.

The frontend has three top-level workspaces:

- `home`
- `disc`
- `caseInsert`

The disc editor is the stable alpha-capable workspace. The case insert editor is active and partially implemented for jewel case layouts.

The frontend contains a runtime-connected lifecycle foundation and a still-disconnected application-menu foundation. `src/main.tsx` constructs one application lifecycle runtime outside React Strict Mode; `ApplicationLifecycleBoundary` owns its one disposal, while a dependency-ref hook updates committed React adapters without recreating the root. `src/lifecycle/` supplies the single-session/canonical-baseline primitives and framework-neutral root that owns one immutable lifecycle store, command registry/dispatcher, busy-scope coordinator, typed command-port set, and implementation-aware capability projection. `project.new-disc`, `project.new-case`, `project.open`, `project.save`, and `project.save-as` are production-implemented lifecycle ports. The lifecycle session is continuously synchronized with the complete normalized committed Disc or Case editor aggregate and is the authoritative dirty/Save source. `src/applicationMenu/` defines the exact first-release menu descriptors, semantic targets, platform projection, owner-injected capability projection, an in-memory test port, and a narrow lifecycle-capability consumption helper. No React or native Tauri menu consumes the menu model yet, and no menu command is executable through it.

### 5.2 Key Files

- `index.html`
- `src/main.tsx`
- `src/app/App.tsx`
- `src/app/ApplicationLifecycleBoundary.tsx`
- `src/app/applicationLifecycleRuntime.ts`
- `src/app/applicationLifecycleRuntimeContext.ts`
- `src/app/useApplicationLifecycleRoot.ts`
- `src/app/appProjectNewCommand.ts`
- `src/app/appProjectNewEditorApply.ts`
- `src/app/appProjectOpenCommand.ts`
- `src/app/appProjectOpenFeedback.ts`
- `src/app/appProjectReplacementGuard.ts`
- `src/app/appProjectSaveCommand.ts`
- `src/app/appProjectLoad.ts`
- `src/app/appProjectSave.ts`
- `src/app/appProjectRestore.ts`
- `src/components/project/ProjectReplacementDialog.tsx`
- `src/components/project/useProjectReplacementPrompt.ts`
- `src/app/appPngExport.ts`
- `src/app/appPngExportInputs.ts`
- `src/app/appSteamImportPlan.ts`
- `src/app/appSteamDiscVisualImport.ts`
- `src/app/appCaseInsertPreviewTextHandlers.ts`
- `src/lifecycle/applicationCommandTypes.ts`
- `src/lifecycle/applicationCommandRegistry.ts`
- `src/lifecycle/applicationLifecycleStateStore.ts`
- `src/lifecycle/applicationLifecycleCommandPorts.ts`
- `src/lifecycle/applicationLifecycleCommandDefinitions.ts`
- `src/lifecycle/applicationLifecycleCompositionRoot.ts`
- `src/lifecycle/lifecycleCommandCapabilities.ts`
- `src/lifecycle/projectSession.ts`
- `src/project/blankDiscProject.ts`
- `src/applicationMenu/applicationMenuTypes.ts`
- `src/applicationMenu/applicationMenuRegistry.ts`
- `src/applicationMenu/applicationMenuProjection.ts`
- `src/applicationMenu/applicationMenuLifecycleCapabilities.ts`
- `src/applicationMenu/inMemoryApplicationMenuPort.ts`
- `src/editor/editorTypes.ts`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/files.rs`
- `src-tauri/src/project_file.rs`
- `src-tauri/src/commands/steam.rs`
- `src-tauri/src/commands/local_steam.rs`
- `src-tauri/src/commands/local_images.rs`
- `src-tauri/src/commands/official_site.rs`
- `src-tauri/src/platform/open_folder.rs`

### 5.3 Source-Of-Truth State

`src/app/App.tsx` owns workspace routing and cross-feature orchestration. The application-boundary runtime owns the sole production lifecycle root. After committed React updates, one focused adapter supplies the complete normalized Disc or Case aggregate to the root; canonical equality is a lifecycle state/revision/publication no-op. New Disc, New Case, and Open prepare one complete immutable candidate, use the shared dirty-aware replacement guard when required, and apply lifecycle plus editor/route state atomically after a final session/revision check. Save and Save As capture immutable snapshot `R` from the lifecycle-owned current project, delegate package planning/writing to focused modules, and adopt `R` as baseline after commit without a second editor capture; a newer current `R+1` remains current and dirty. Other focused app-owned helpers own PNG export preflight/execution, Steam import planning, disc visual import defaults, and case-insert preview text handlers. Focused hooks own many feature-specific state slices, including disc template, Steam banner, background artwork, disc text, title artwork, additional artwork, logos, rating badges, media marks, platform marks, technical marks, case insert editing, spine editing, and case insert branding sync.

Native Rust commands do not own editor state. They return data or perform filesystem/platform operations on request.

Application-menu presentation IDs are separate from semantic command and owner IDs. The pure menu registry maps each first-release item to a lifecycle command, domain command, typed workflow destination, focused-edit role, native-window operation, or informational operation. Capability projection consumes owner-provided capabilities and does not execute targets or reproduce domain authorization. A one-way helper can read lifecycle capabilities from the composition root without giving the menu a dispatch path or importing menu concepts into lifecycle. The in-memory port is test-only; it stores immutable newer generations per window label and is not a browser or native menu.

### 5.4 Render, Edit, And Export Paths

- React entry: `src/main.tsx` creates one lifecycle runtime, mounts its owning boundary, and renders `<App />` inside Strict Mode.
- Vite entry: `index.html` provides the root element and loads `/src/main.tsx`.
- Tauri dev/build entry: `src-tauri/tauri.conf.json` points dev to Vite and packaged frontend output to `dist`.
- UI routing: `App.tsx` renders `HomeScreen`, disc editor panels plus `DiscPreview`, or `CaseInsertEditorShell`.
- Native integration: frontend wrappers call Tauri commands registered in `src-tauri/src/lib.rs`.
- Open: every current Home, Disc, and Case Load control dispatches
  `project.open`; the owner stages dialog/read/schema/restore work before one
  dirty-aware replacement decision and one batched lifecycle-and-editor commit.
  Cancellation, failure, guard decline, apply
  precondition failure, and stale CAS do not apply editor state.
- New: every current Home, Disc, and Case New/Switch control dispatches
  `project.new-disc` or `project.new-case`; both commands consume the same
  guard and atomically establish one pathless, baseline-less, dirty session.
- Save: `project.save` and `project.save-as` write the lifecycle-owned immutable
  snapshot and adopt only that snapshot as baseline after native commit. They
  never perform a fallible post-commit editor recapture.
- Export: `App.tsx` opens the native destination chooser, calls preflight helpers, always requests confirmation (information for clean summaries and warning for summaries with warnings), calls canvas export helpers, then writes PNG bytes through Tauri.

### 5.5 Invariants And Future-Change Rules

- Keep `App.tsx` as orchestration where practical.
- Do not add feature-specific layout math, renderer construction, pointer math, import/upload interpretation, project normalization, or export drawing to `App.tsx`.
- Keep disc editor, case insert editor, and neutral template helpers separate.
- Use focused hooks/domain modules when behavior grows beyond trivial wiring.
- Keep `src/applicationMenu/` presentation-neutral: native construction, event
  transport, command dispatch, workflow-host routing, and UI composition belong
  to later adapters and must not be smuggled into the descriptor or projection
  model.
- Target editor-navigation destinations, control classification, presentation-adapter boundaries, and semantic ownership are defined in [`EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md`](EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md). Final target application-menu presentation and integration are defined separately in [`APPLICATION_MENU_BAR_CONTRACT.md`](APPLICATION_MENU_BAR_CONTRACT.md). Neither draft target-state document replaces the current implementation summarized here or claims the menu and relocated workflows are implemented.
- Target application-level PNG export execution, immutable snapshot, preflight/conditional-confirmation/destination order, typed outcomes, busy ownership, and Disc/Case adapter boundaries are defined in [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md). That draft target-state contract does not describe the current workflow as already implemented.
- Target Game search, stable selection, immutable import planning, separated metadata operations, atomic Disc/Case apply, stale-result handling, and Case imported-text visibility are defined in [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md). That draft target-state contract does not describe the current workflow as already implemented.

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

Package scripts define dev, build, lint, test, cycle checking, Vite preview, and
Tauri CLI entry points. The standard test runner executes explicit Node test
batches, stops the Node phase after its first failing batch, and then always
runs the focused `sbls-package-codec` Rust suite with `--locked --jobs 1` while
preserving the combined failure status.

### 6.2 Key Files

- `package.json`
- `scripts/run-tests.mjs`
- `scripts/test-file-list.mjs`
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
- `npm run test`: `scripts/run-tests.mjs`, which runs Node's built-in test runner
  in batches over the explicit list in `scripts/test-file-list.mjs`, then runs
  the runtime-disconnected Rust package-codec tests declared by that same
  registry.
- `npm run preview`: Vite preview.
- `npm run tauri`: Tauri CLI.

### 6.4 Source-Of-Truth State

- `package.json` is the source of truth for standard npm commands.
- `scripts/test-file-list.mjs` is the source of truth for Node test files and
  follow-on focused test commands included in `npm run test`;
  `scripts/run-tests.mjs` owns sequential Node batching, stops after the first
  failing Node batch, then still runs every follow-on command and accumulates
  the final failure status.
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

Production Open recognizes and stages `.sbls` package-v1 or legacy JSON content;
extensions are chooser affordances rather than decoder selectors. Save and Save
As write `.sbls` package-v1 files only. Existing plain `.json` and `.sbls.json`
projects remain readable legacy imports. The hydrated
saved-project type remains a union of Disc and Case Insert shapes under schema
version `0.2.0`; package/session metadata does not enter it.

The ZIP-compatible `.sbls` package format is defined in
[`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md). Its
package-domain encoder/decoder is implemented as the dependency-isolated Rust
workspace member `sbls-package-codec`. Dormant generic raw-byte Tauri commands
provide bounded native reading and atomic binary writing. Production Open uses
a focused bounded native recognizer and a separate native command that composes
bounded read with codec decode and returns hydrated JSON through a strict
TypeScript port into the existing mutation-free staging owner. Production
Save/Save As use one
closed TypeScript capture plan and bounded raw request, native borrowed-input
encoding, and direct atomic commit without returning package bytes to the
WebView. The
original format-choice rationale remains in
[`PROJECT_PACKAGE_FORMAT_DECISION.md`](PROJECT_PACKAGE_FORMAT_DECISION.md).

### 7.2 Key Files

- `src/project/projectTypes.ts`
- `src/project/projectSchema.ts`
- `src/project/projectGuidedWorkflow.ts`
- `src/project/createProjectSnapshot.ts`
- `src/project/restoreProjectState.ts`
- `src/project/caseInsertProjectAdapters.ts`
- `src/project/projectRouting.ts`
- `src/project/savedProjectNormalization.ts`
- `src/project/projectCaseInsert.ts`
- `src/diagnostics/projectParityHarness.ts`
- `src/diagnostics/projectParityHarnessDisc.test.ts`
- `src/diagnostics/projectParityHarnessCaseInsert.test.ts`
- `docs/PROJECT_FILE_SPEC.md`
- `docs/PROJECT_PACKAGE_FORMAT_CONTRACT.md`
- `docs/PROJECT_PACKAGE_FORMAT_DECISION.md`
- `src/tauri/binaryProjectFile.ts`
- `src/tauri/projectFileFormat.ts`
- `src/tauri/packageProjectFile.ts`
- `src/tauri/projectPackageWrite.ts`
- `src/package/projectPackageCapturePlan.ts`
- `src/tauri/projectFileFailure.ts`
- `src-tauri/src/commands/project_files.rs`
- `src-tauri/src/commands/project_packages.rs`
- `src-tauri/src/legacy_project_identity.rs`
- `src-tauri/src/project_binary_io.rs`
- `src-tauri/src/project_file.rs`
- `src-tauri/src/project_format_recognition.rs`
- `src-tauri/crates/sbls-package-codec/Cargo.toml`
- `src-tauri/crates/sbls-package-codec/src/lib.rs`
- `src-tauri/crates/sbls-package-codec/src/conformance_tests.rs`
- `src-tauri/crates/sbls-package-codec/src/encode.rs`
- `src-tauri/crates/sbls-package-codec/src/decode.rs`
- `src-tauri/crates/sbls-package-codec/vendor/PROVENANCE.md`

### 7.3 Source-Of-Truth State

- `SavedProject`, `SavedDiscProject`, `SavedCaseInsertProject`, `ProjectMetadata`, and case insert project state types live in `src/project/projectTypes.ts`.
- `CURRENT_PROJECT_SCHEMA_VERSION` is `0.2.0` in `src/project/projectSchema.ts`.
- `PROJECT_SCHEMA_MIGRATIONS` registers the compatibility step from `0.1.0`.
- `sbls-package-codec` owns package bytes, manifest/projection/bindings,
  content-addressed raster assets, strict ZIP/JSON validation, hydration, and
  package failures. It returns hydrated JSON bytes to the later schema boundary
  and does not become a second `SavedProject` or lifecycle owner.
- Disc guided workflow persistence stores only active layout ID/version plus
  independent canonical omitted and completed slot IDs; owner state, canonical
  preset definitions, resolved runtime geometry, and export composition remain
  independent.

### 7.4 Render/Edit/Export Paths

- Runtime edits update React state first.
- Save captures one immutable normalized snapshot, builds one owner-aware plan,
  writes a complete package atomically, then adopts only the committed snapshot
  as baseline; a newer current snapshot remains dirty.
- Production Open recognizes content natively. Legacy content uses the existing
  text/JSON path; package content is decoded and hydrated natively, then both
  branches route, normalize, and restore through the shared immutable staging
  owner before one lifecycle compare-and-swap/apply.
- Export reads current runtime state; PNG bytes are not part of project serialization.

### 7.5 Serialization Contract

- New application-connected Save output is `.sbls` package v1; legacy JSON is
  read-only import compatibility.
- Imported and uploaded images are embedded as data URLs where needed for reload.
- Built-in generic assets stay routed through `src/assets/assetManifest.ts` rather than being copied into every project.
- Package-qualified built-ins are frozen by
  `docs/PROJECT_PACKAGE_BUILT_IN_REGISTRY_V1.json`; unqualified app assets must
  be safely captured or rejected before write.
- Provenance/status metadata may include source kind, source ID, sanitized label, and safe source URL.
- Durable local file paths should not be required after reload.
- The package-domain encoder writes deterministic Store-only ZIP32 bytes in
  memory; its reader accepts only the contract's bounded Store/Deflate profile
  and returns isolated hydrated JSON. Neither operation reads or writes a path.

### 7.6 Invariants And Future-Change Rules

- Keep `projectType` as a real saved-project family boundary.
- Keep `home` as a workspace only, not a project type.
- Do not collapse disc and case insert schema owners.
- Add migrations before changing saved-project semantics.
- Distinguish source-connected package Open/Save/Save As from native runtime
  acceptance. Content recognition and package Open activation are current;
  native dialogs and platform behavior must not be claimed verified until the
  runtime validation required by
  [`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md).

### 7.7 Validation Expectations

- Project changes should update project/schema tests.
- Save/load-affecting changes need manual load/save/export smoke on real projects or fixtures.
- Runtime validation must distinguish disc and case insert project routing.
- Shared parity fixtures in `src/diagnostics/projectParityHarness.test.ts`,
  `src/diagnostics/projectParityHarnessDisc.test.ts`, and
  `src/diagnostics/projectParityHarnessCaseInsert.test.ts` compare semantic
  runtime, saved, restored, and export-facing state for representative disc
  and case insert visual/text features without merging their schemas.

### 7.8 Known Risks

- Top-level schema validation is intentionally shallow.
- Migration coverage is intentionally limited to the registered `0.1.0` to
  `0.2.0` compatibility step.
- Issue `#48` is closed; future validation/migration changes remain governed by
  [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md).

### 7.9 Package Codec And Production Decode Integration

The package-domain public boundary is intentionally small:
`encode_project_package(&ProjectPackageEncodeInput)` borrows a boundary value
that itself owns immutable
normalized JSON, diagnostic creator metadata, and one typed capture decision
for every expanded registry owner; `decode_project_package(&[u8])` returns
owned hydrated JSON plus separate validated package metadata. Stable
`ProjectPackageFailure` values carry a closed `FailureCode` and normative
`FailureStage`. Inputs are never paths, and transport metadata never enters the
hydrated project.

Known typed failures pass through that boundary unchanged. As last-resort Rust
containment, an unexpected encode unwind becomes
`project.package.encode-failed` at encoding and an unexpected decode unwind
becomes `project.package.archive-invalid` at raw input. Unwind containment is
not an allocation strategy; the package contract still requires every
hostile-input-derived allocation to be fallible.

The crate keeps the complete package policy together. `archive.rs` owns strict
ZIP32 inventory/Store writing/Store-or-Deflate reading; `json.rs` owns bounded
duplicate-key-rejecting JSON and RFC 8785 emission; `manifest.rs`, `registry.rs`,
`assets.rs`, `encode.rs`, and `decode.rs` own the manifest, exact Disc/Case
pointer vocabulary, canonical data URLs, projection, binding, hashing,
deduplication, and hydration; `limits.rs` and `error.rs` own checked budgets and
stable failures; `raster.rs` owns the five-format raster gate.

Decoder lifetimes deliberately avoid several avoidable full-copy overlaps. ZIP
inventory borrows caller bytes; manifest entry bytes drop after parsing;
native/raster working memory is active for only one asset; validated encoded
assets drop after hydration; the manifest's transport graph drops before
canonical hydrated-output allocation; and the hydrated tree drops after
serialization. A separate 512 MiB hostile-JSON phase ledger covers the owned
Store/Deflate entry buffer currently feeding the parser plus retained
manifest/project roots, collection capacities, strings, keys, and number
tokens. It precharges old-plus-replacement capacity during collection growth,
uses receipts for transfer/release, and rolls back every outstanding
operation-owned charge after success or failure. Hydration-created strings,
canonical output, caller archive bytes, raster/native work, and
allocator-private metadata are intentionally outside that ledger and retain
their separate budgets.

Neither the JSON phase ledger nor the native working ledger establishes a
measured whole-process ceiling. Asset validation still retains prior encoded
assets while validating the current entry, hydration retains encoded assets
while data URLs accumulate, and output serialization temporarily overlaps the
hydrated tree. The pure codec proves those lifetimes and its owned allocation
boundaries deterministically. Windows x64 RSS, other-platform process evidence,
and hydrated-response IPC/WebView copy measurement remain native-runtime
evidence gaps; source-level production Open linkage and hydrated-byte transport
now use the native decode adapter.

JPEG and WebP full decoding uses a narrow Rust-consumed crate-private C boundary
built from exact-pinned libjpeg-turbo `3.1.4.1` archive SHA-256
`ecae8008e2cc9ade2f2c1bb9d5e6d4fb73e7c433866a056bd82980741571a022`
and libwebp `1.6.0` archive SHA-256
`e4ab7009bf0629fd11982d4c2aa83964cf244cffba7347ecd39019a9e38c4564`.
The build does not consult system codecs. Audited allocator overlays enforce checked,
fallible, operation-scoped allocation under the 512 MiB decoder ceiling,
single-validator leasing, deterministic cleanup, and safe typed failure
conversion. Native reallocation precharges the still-live old block plus the
complete replacement block, including both ledger headers, before calling the
system allocator; one-byte-over rejection and failure cleanup are exercised.
JPEG fatal `longjmp` remains inside one C wrapper frame. Exact
versions, source/archive/overlay digests, notices, exclusions, and patch
rationale live under `src-tauri/crates/sbls-package-codec/vendor/`.
The root `LICENSE` contains MIT text, but `README.md` still says a license has
not been chosen and the application manifest leaves `license` empty; this
package slice does not resolve that repository-level conflict. The unpublished
codec manifest currently declares `MIT AND BSD-3-Clause AND IJG`, while the
checked-in libjpeg-turbo IJG/Modified-BSD notices and libwebp Modified-BSD
notice/patent grant remain the authoritative upstream texts.

The narrow boundary description applies to the Rust-consumed production
validation surface; the private static archive retains selected upstream,
ledger, and test-probe link symbols. Package configuration disables libjpeg
environment reads with `NO_GETENV` and forces libwebp's audited generic C path
through a verified `cpu.h` overlay. Windows x64 compilation is exercised;
macOS, Linux, and other Windows architectures remain source/configuration
reviewed pending an executed cross-target build matrix.

The JPEG v1 profile is deliberately limited to 8-bit Huffman baseline or
progressive grayscale/three-component DCT with the contract's fixed component
and sampling layouts. The BMP v1 profile is deliberately limited to canonical
bottom-up Windows `BITMAPINFOHEADER`, 24-bit BGR, uncompressed `BI_RGB` data.
Well-formed family members outside those profiles use
`project.package.asset-jpeg-profile-unsupported` and
`project.package.asset-bmp-profile-unsupported`; malformed family data remains
the general `project.package.asset-type-invalid` failure.

The crate-level conformance suite exercises the public boundary, rather than
only private helpers. It includes deterministic exact current-schema Disc and
all-four-surface Case round trips spanning PNG, JPEG, WebP, GIF, and BMP;
older-schema hydration without package-owned migration; mutation isolation;
and an independent Store-only ZIP32/manifest builder whose valid golden bytes
match the public writer and pass the public reader. Focused tests separately
exercise the closed profiles, stable failures, hostile JSON allocation
receipts, native allocation/reallocation faults, one-validator ownership, and
cleanup/reuse.

The workspace root lists this crate as a member and keeps the Tauri app as its
default member. The app crate has one local path dependency on the codec. The
registered `decode_project_package_file` command reuses the bounded file-read
request owner, lends its operation-owned archive buffer to the codec, discards
transport metadata, and moves only hydrated JSON bytes into the raw response.
`project_format_recognition.rs` and `projectFileFormat.ts` own bounded native
recognition and its strict two-value DTO. `packageProjectFile.ts` validates the
exact raw response and closed safe failure DTO; `stageProjectPackageOpen`
performs strict UTF-8 decoding and delegates to the same
parse/migrate/normalize/route/restore/candidate-capture path as legacy Open.
Production Open composes these adapters, while lifecycle identity and live
editor mutation remain owned by the later compare-and-swap/apply boundary.

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
- `src/export/caseInsertTemplateExportLayers.ts`
- `src/export/caseInsertPngImage.ts`
- `src/export/caseInsertPngText.ts`
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
- For procedural/material rendering, refactor ownership boundaries before
  adding visual complexity. Material planning, stable geometry fields, response
  maps, preview adapters, export adapters, controls, diagnostics, caching, and
  performance scheduling must have clear owners before tuning appearance.
- Preview/export material parity must be proven at effective runtime inputs, not
  only by sharing a helper. Preview texture scale, export pixel bounds,
  descriptor values, seed inputs, light inputs, quality modes, and cached maps
  must be comparable and documented.
- Expensive procedural rendering must define interaction-quality and cache
  boundaries before live controls are wired. Live sliders and menus must not
  synchronously regenerate large textures or serialize images on every input
  event without a reviewed performance plan.
- Adding renderer controls is also a layout change. Sidebar fit, control
  reachability, and narrow-width behavior must be tested when material controls
  are added or expanded.

### 8.6 Validation Expectations

- Unit tests should cover render models, export helpers, preflight, and layer-sensitive helpers where deterministic.
- Visual changes need preview and exported PNG comparison.
- WYSIWYG-sensitive changes need runtime validation.
- Material-rendering changes additionally need native flat-profile smoke before
  visual acceptance is claimed, because generated diagnostics can diverge from
  the live preview path.

### 8.7 Known Risks

- DOM preview and canvas export are separate renderers in several subsystems.
- CSS can create visual behavior that export cannot reproduce.
- Actual PNG output was not visually inspected during this SDD task.
- Procedural material systems can easily couple geometry to response inputs or
  create performance regressions if preview/export/runtime ownership is not
  designed first.

## 9. Text System Design

### 9.1 Current Implementation Summary

The app has two related text systems:

- Disc text, including metadata-bound straight text, disc-number artwork, and curved SVG/textPath legal text.
- Case insert text, including cover/tray/spine text blocks and lists with rectangular/spine layout helpers.

Preview-mounted text editing is protected by `docs/TEXT_EDITOR_CONTRACT.md`.

### 9.2 Key Files

- `src/discText/index.ts`
- `src/discText/renderLayout.ts`
- `src/discText/straightTextPaintGeometry.ts`
- `src/discText/straightTextWrapping.ts`
- `src/discText/svgLayer.ts`
- `src/discText/svgTextMarkup.ts`
- `src/discText/curvedTextLayout.ts`
- `src/discText/curvedTextWrapping.ts`
- `src/discText/curvedTextPaintGeometry.ts`
- `src/discText/curvedTextRangeMath.ts`
- `src/discText/styles.ts`
- `src/discText/metadataStateTransitions.ts`
- `src/discText/styleStateTransitions.ts`
- `src/discText/textStateTransitions.ts`
- `src/discText/discNumberArtwork.ts`
- `src/discText/sidebarControlPolicy.ts`
- `src/hooks/useDiscTextState.ts`
- `src/project/metadataDiscText.ts`
- `src/components/preview/DiscTextLayer.tsx`
- `src/components/preview/DiscInlineTextEditorLayer.tsx`
- `src/components/preview/discInlineTextEditorControls.ts`
- `src/components/preview/InlinePreviewTextEditor.tsx`
- `src/components/preview/inlinePreviewTextEditorContract.ts`
- `src/components/preview/inlinePreviewTextEditorTextGeometry.ts`
- `src/components/preview/inlinePreviewTextEditorSelection.ts`
- `src/components/preview/inlinePreviewTextEditorCanvasOverlays.tsx`
- `src/components/preview/inlinePreviewTextEditorMoveRing.tsx`
- `src/components/preview/inlinePreviewTextEditorTextarea.tsx`
- `src/components/preview/inlinePreviewTextEditorRibbon.tsx`
- `src/components/preview/inlinePreviewTextEditorMenuContent.tsx`
- `src/components/preview/inlinePreviewTextRibbonControls.tsx`
- `src/components/preview/inlinePreviewTextPointColorControls.tsx`
- `src/components/preview/caseInsertInlineTextEditorControls.ts`
- `src/components/preview/discInlineTextEditorControlHelpers.ts`
- `src/caseInsert/sidebarControlPolicy.ts`
- `src/caseInsert/textTransitions.ts`
- `src/caseInsert/previewTextRichText.ts`
- `src/caseInsert/textLayout.ts`
- `src/caseInsert/textStyles.ts`
- `src/caseInsert/textRenderStyles.ts`
- `src/caseInsert/textReadability.ts`
- `src/caseInsert/textContent.ts`
- `src/caseInsert/previewTextSelection.ts`
- `src/caseInsert/previewTextEditing.ts`
- `src/text/contextualTextControlViewModel.ts`
- `src/text/htmlText.ts`
- `src/text/htmlEntities.ts`
- `src/text/htmlInlineStyles.ts`
- `src/text/htmlTags.ts`
- `src/text/richTextRunRanges.ts`
- `src/text/richTextSelectionRanges.ts`
- `src/text/richTextListKeyboard.ts`
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
  The component owns lifecycle, refs, active target state, source draft state,
  contextual-ribbon registration, and commit/delete behavior. Editor-owned
  helper modules own DOM text geometry, selection frame construction, canvas
  overlays, move ring presentation, native textarea presentation, menu content,
  ribbon presentation, and point/color controls.
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
  keeps setup/type responsibilities such as enable and the straight/curved
  mode switch. Metadata/default status and restore actions for selected
  metadata-backed text live in the ribbon Utilities `Source` card.
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
- Rich-text command behavior is split into text-owned helpers for run-range
  transforms, selection ranges, list-keyboard mutations, HTML entity/style/tag
  handling, and command orchestration. These helpers are still text-contract
  owned and must not become generic string utilities.
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
- Text-tab dense boxes use this hierarchy to protect the fixed app-shell
  header: the Text tab contains common typography controls, but it must not
  grow vertically, create a third control row, or push the editable preview
  down. Field columns preserve readable values, while companion command columns
  keep compact actions beside the fields they affect.
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
  once their contained controls have reached their target sizes. This prevents
  dead card interiors and keeps extra header width available for groups that
  can use it meaningfully.
- Compact select fields in dense text-ribbon groups use the same target-width
  rule even when they are unpaired; for example, Paragraph alignment is sized
  from the widest supported alignment label, not from leftover card width.
- Reset actions that are semantically associated with a card live inside that
  card. The reset control sits on the right side of the associated card,
  separated from the primary controls by the same vertical divider language
  used by that card type. It must not render as a separate `Reset` card or as
  a detached standalone button when its reset target is a specific card
  responsibility. The card's width profile reserves the reset divider and
  button so reset availability does not clip or steal space from sibling
  controls.
- The Presets tab is modeled as native semantic `Style` and `Layout` cards.
  Style and Layout are matched one-row dropdown cards that stack in the same
  column when both are available; their width is calculated from the complete
  card contents, not only from the select element. The visible card title is
  the purpose label, so inner select labels remain accessibility labels and
  must not duplicate the card title in visible text. Style reset belongs inside
  the `Style` card on the right side behind the card divider.
- Layout presets are placement/layout-geometry commands only. Applying one may
  update supported position, wrapping width, arc, or alignment geometry, but it
  must preserve typography and style values such as font family, point size,
  legacy scale-derived size, BIU, color, contrast, background, and border.
- Composite value/dropdown controls in the ribbon, such as `Font size (pt)`,
  must follow the native dropdown visual contract in
  `docs/TEXT_EDITOR_CONTRACT.md`: the `POINTS` unit label outside the field,
  value left of the chevron inside one shared bordered field, no nested
  chevron box, matching field height, and matching chevron-to-right-border
  spacing verified from a native Tauri screenshot when visual parity is in
  question.
- Text > Font uses a stacked label column with `STYLES` beside the font-family
  dropdown and `POINTS` beside the point-size dropdown so the two fields remain
  aligned. These labels are intentionally compact and visible: they identify
  the value fields without the width cost of full form labels.
- Text > Font uses an underlined `FORMAT` heading above the BIU command
  buttons, and those buttons remain centered in that format section so the
  buttons read as one formatting command cluster.
- Text > Paragraph uses `ALIGN` beside the alignment dropdown and a `LIST`
  heading above the bulleted-list button. The `LIST` label/button stack is
  centered in the available command-column space between the divider and the
  Paragraph box's right edge, not by a hardcoded pixel offset. That command
  column is the extension point for future paragraph actions, so spacing must
  be relative to the column rather than tuned to today's single button.
- The Utilities tab follows the same semantic-card model. Position controls
  are grouped as a two-row X/Y field card. Layout controls are grouped as a
  two-row card with `Wrap width` and its related `Respect visual elements`
  toggle kept inside the same internal box. Unrelated mode/arc options may use
  the separate divider column, but that divider must not split the checkbox
  away from `Wrap width`. `Wrap width` and `Respect visual elements` remain
  fully readable; the fixed-height ribbon should use whole-card horizontal
  overflow rather than truncate those utility labels. Utilities range sliders
  share the Artistic range-slider track compression metrics: 72px normal
  track minimum and 58px compact track minimum. Utilities value boxes keep a
  wider coordinate-safe numeric field so signed and decimal Position values
  can display without clipping. Utility range tracks share a 96px useful
  maximum so Position X/Y and Layout `Wrap width` controls keep matched slider
  lengths even when their semantic cards receive different horizontal space.
  Utilities layout reset belongs inside the `Layout` card on the right side,
  separated from the layout ranges/options by the same divider language used
  for utility layout option columns. It spans the two-row card body visually
  without becoming a separate reset card or detached command. Metadata/default
  status and manual override restoration use a full-height Utilities `Source`
  card. HTML source remains in the dedicated `HTML` tab, and Utilities must
  not render empty placeholder cards for unavailable source or unsupported
  target-specific controls. A range-only
  `Layout` card uses a compact content width so its right border remains near
  the last visible control; the wider Layout profile is reserved for targets
  with additional mode or arc option columns.
- The HTML tab is rendered as a dedicated two-row source panel rather than a
  titled semantic-card group. It owns source/status text, validation feedback,
  and a monospaced source textarea with native typing, selection, clipboard,
  undo/redo behavior, `white-space: pre`, and editor-owned horizontal/vertical
  scrolling. The source/status row is the visible label for the panel, so the
  textarea does not spend horizontal space on a second visible `Source` label.
  The HTML tab fills the available active control area instead of using the
  ordinary ribbon horizontal scrollbar; long source scrolls inside the
  textarea. Validation text stays in the status row rather than adding a row
  beneath the textarea, so newlines in the source draft cannot shrink the
  editor or its panel. The panel must not add a third ribbon row, collapse into
  a one-line strip, move the preview, or reintroduce Utilities-owned HTML
  source controls.
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
| Cover | Contextual presets, text controls, art controls, metadata source status/restore, utilities, reset style/layout, Done, Delete where supported | Direct typing, caret, selection, dotted bounds, edge-grab movement, Move fallback | Add/select |
| Tray | Same as cover, with tray geometry and wrap semantics | Same as cover | Same as cover |
| Left spine | Supported contextual text controls | Rotated caret/selection, rotated bounds, edge-grab movement, Move fallback | Add/select and structural spine setup where needed |
| Right spine | Same as left spine | Same as left spine | Same as left spine |
| Straight disc | Supported contextual text controls, including metadata source status/restore and HTML source | SVG/tspan renderer, direct typing adapter, caret, selection, bounds, edge-grab movement, Move fallback | Enable/add and straight/curved setup where needed |
| Curved disc | Curved-safe text controls, metadata source status/restore, safe inline HTML source, arc controls, presets, Done, Delete where supported | SVG/textPath renderer, path-aware caret/selection, arc-aware bounds, direct typing adapter, edge-grab movement, Move fallback | Enable/add and straight/curved mode selection |

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
  intentionally sidebar-owned setup/type UI. Metadata/default status and
  manual-override restoration are contextual ribbon Source-card responsibilities.
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
  `src/text/richTextRunStyle.test.ts`; command-family coverage also lives in
  `src/text/richTextRunRanges.test.ts`,
  `src/text/richTextSelectionRanges.test.ts`,
  `src/text/richTextListKeyboard.test.ts`, and
  `src/text/richTextCommands.test.ts`.
- Runtime validation must use the text editor stabilization checklist for cover, tray, left spine, right spine, straight disc text, and curved disc text where affected.

### 9.7 Known Risks

- Browser caret measurement and wrapped text layout are fragile.
- Right spine contextual-editor clipping remains a high-priority runtime smoke
  target whenever contextual editor positioning changes.
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
- `src/caseInsert/imageSlotSourceImport.ts`
- `src/caseInsert/imageSlotSourceApply.ts`

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
- `src/caseInsert/brandingMarkTargetSources.ts`
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
- `src/presets/discPresetDefinition.ts`
- `src/presets/discPresetResolution.ts`
- `src/presets/discPresetPlacementAdapters.ts`
- `src/presets/discPresetApplication.ts`
- `src/presets/discPresetTargetedApplication.ts`
- `src/presets/discPresetRegistry.ts`
- `src/presets/builtins/classicTopTitleDiscPreset.ts`
- `src/guidedPresets/discGuidedLayouts.ts`
- `src/templates/discTemplates.ts`
- `src/export/exportPng.ts`
- `src/export/exportPreflight.ts`
- `src/export/discDesignCheck.ts`

### 12.3 Source-Of-Truth State

- Runtime state is split between `App.tsx` and disc feature hooks.
- Persisted state is `SavedDiscProject`.
- Disc layer order lives in `src/editor/layerOrder.ts`.

The semantic packaging role taxonomy for current role panels and future role-based preset planning is documented in [`PACKAGING_ROLE_MODEL.md`](PACKAGING_ROLE_MODEL.md). The role-based preset model and application contract for #269 is documented in [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md). The Disc guided slot identity, lifecycle, binding, and persistence boundaries for #281/#283 are documented in [`GUIDED_PRESET_SLOT_MODEL.md`](GUIDED_PRESET_SLOT_MODEL.md). Current role lists remain UI shell/navigation concepts, and no persisted packaging-role, object-role, or generic preset schema exists. Schema `0.2.0` does persist the focused Disc guided-workflow layout ID/version plus independent canonical omitted/completed slot IDs; it does not persist generic preset identity or geometry.

The proposed target application-level Disc Layout Preset workflow—stable
catalog references, non-mutating selection, immutable impact planning, review,
atomic Apply/Reapply/Detach, persistent applied/customized/detached
configuration, and Game/Guided/output boundaries—is documented in
[`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md).
It is not current implementation. The generic preset definition, resolution,
fitting, and targeted-application modules below remain focused inputs to that
workflow rather than a second session, schema, geometry, or renderer owner.

The proposed target application workflow for Disc template choice, raw custom
dimension validation, immutable multi-owner geometry planning, atomic apply, and
revision-scoped recovery is documented in
[`DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`](DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md).
It is not current implementation. Existing Disc geometry/layout owners remain
authoritative for calculations and render math; the target workflow coordinates
their pure plan adapters without moving their decisions into `App.tsx`.

Generic Disc preset definitions are pure JSON-compatible domain data. The
definition parser reconstructs immutable allowlisted identity, compatibility,
slot geometry, visual-layer, and placement-intent values from `unknown`; the
registry provides storage-agnostic built-in/user-ready lookup. Classic Top
Title guided geometry derives from its canonical built-in definition.

The pure Disc preset application foundation separates a nominal validated
definition from a transient template-resolved definition. Resolution preserves
nominal/resolved content and action regions, deterministic slot order, and
structured compatibility/annulus warnings. The trusted adapter registry maps
only allowlisted semantic targets to application-code adapters; targets are not
project state paths. The application-plan builder returns immutable ordered
updates and structured partial/rejected outcomes without React, DOM, persistence,
renderer, export, or Case Insert dependencies.

Concrete pure adapters now translate resolved centers and V1 size intents into
placement-only typed updates for title artwork/text, Background, primary Rating,
primary Media Format Mark, primary Developer/Publisher Logos, and copyright
text. Their focused owner-state slices support dormant disabled layouts without
changing enablement or payload. The definition parser strictly accepts
`fixed-scale` or the canonical JSON-compatible `contain-region` policy.
`contain-region` requires boolean `allowUpscale`; optional `maximumScale` must
be finite, positive, and within the shared owner-scale ceiling, and optional
`insetPercent` must be finite in `[0, 50)`. Unknown fields, malformed optionals,
the retired `fit-region` spelling, and unsupported future policies fail closed.

`src/presets/fitVisualBoundsToDiscPresetRegion.ts` owns the pure normalized
contain calculations. `fitVisualBoundsToDiscPresetRectangle` is authoritative
for Classic preset placement: it uniformly scales canonical bounds to the first
limiting inset-region X or Y axis, respects declared no-upscale/maximum-scale
caps, compensates for bounds-center offsets, and returns exact fitted bounds
plus a horizontal, vertical, both, or capped classification. The complete
fitted rectangle must stay inside the resolved rectangle. Classic adapters may
not follow that result with a safe-annulus or center-hole shrink, translation,
or broad clamp. The older `fitVisualBoundsToDiscPresetRegion` composition
remains as a separately tested legacy-compatible annulus/inner-hole calculation;
Classic adapters do not call it. Invalid regions or bounds return structured
unsupported results.

Canonical point-owner bounds reuse feature/render paths that also drive preview
and export: alpha/content-trimmed Title artwork, uploaded primary-logo assets or
their renderable built-in fallback placeholders, the primary Rating render model
in `src/render/ratingBadgeRenderModel.ts`, and the primary Media render model.
Supplemental USK and additional/repeated logos are excluded. Missing valid
renderable dimensions seed the resolved center while preserving dormant scale,
and the first valid bounds later target-refit only that semantic owner.
Applicable Disc preview images suppress preview-only drop shadows outside these
canonical bounds, matching the shadow-free PNG paths and keeping a zero-inset
guide boundary equal to the visible replacement boundary.

Disc text uses the existing center-relative X contract. Title fitting receives
browser-canvas measurement through the app boundary, uses the template-aware
default Title point size at scale one as preferred, and shrinks in 0.25pt steps
to an 8pt minimum without enlarging short text to meet a border. Its canonical bounds
include the renderer-shared straight-SVG stroke, directional shadow halo,
italic overhang, and optional box geometry. The fitted layout persists a
paint-safe wrap width inside the resolved region and offsets its text anchor
when needed so the painted bounds, not the logical advance box, remain centered.
Contrast and other paint-geometry style changes therefore participate in
targeted Title and Legal refitting. Legal fitting remains 7pt preferred, 3pt
minimum, and 0.25pt steps while containing its complete rendered box and paint
bounds. Resolved rich-run font sizes participate in line height for both fitted
text owners. Both use the exact
resolved rectangle as their preset fit boundary, receive no later annulus/hole
reduction, and never truncate. Legal returns a slot-local resolved
geometry/status patch; Title preserves the shared Game Title slot geometry.
Impossible content emits no owner update. Legal can mark its dedicated slot
unsupported, while Title emits a target-specific warning without suppressing
the shared artwork slot. The generic engine and fit helpers remain
browser-independent. Background V1
retains legacy centered-cover intents for other definitions, while Classic uses
the shared rectangular contain primitive against its exact resolved region.
Background canonical bounds at scale one match the content-aware full-disc
source draw geometry used by preview and export; the fitted result keeps zero pixel
offset and uniformly stops at the first limiting region axis. It intentionally
uses the same rectangle-authoritative, no-post-fit-annulus rule as every other
Classic guided owner. The Background layer still spans beneath the physical
cutout and is circularly clipped by both preview and export. Active-preset image
replacement and re-enable refit only Background; direct scale/offset edits
remain manual.

Operating System Marks use a focused platform-mark/template owner slice and
delegate resolved-region grouping to `placeGroupedPlatformMarks`. Preset
contain mode derives its upper scale from the resolved region/policy, evaluates
centered one-row and two-row candidates in canonical order, and chooses the
largest valid common scale while preserving each mark's aspect ratio. Each
candidate reserves its configured fixed horizontal and vertical gaps before
calculating that common scale. The preset rectangle is authoritative: the final
union remains centered, fully region-contained, pairwise non-overlapping, and
reaches the nearest limiting rectangle edge unless policy-capped. Preset
contain mode does not shrink or translate the group for the Disc annulus or
center hole. The legacy non-preset helper path retains its earlier offset/clamp
behavior. The adapter emits only typed `x`, `y`, and `scale` updates keyed by
`PlatformMarkValue`; selected values, enablement, source/theme, custom assets,
and inference metadata remain feature-owned. The trusted production registry
now covers every Classic placement target exactly once.

Exact late placement is owned by
`src/presets/discPresetTargetedApplication.ts`. Given a transient canonical
preset ID/revision, active template, one semantic target, focused owner state,
and adapter registry, it resolves and invokes only the unambiguous matching
slot/intent. Expected missing, unsupported, and ambiguous cases produce
structured no-update results.

Feature owners remain authoritative for actual layout, rendering, export, and
project persistence. `src/app/appRegisteredDiscPresetApplication.ts` is the
React-free Classic compatibility boundary. It resolves the legacy menu alias
through the canonical registry, resolves the definition for the active Disc
template, snapshots only the required owner slices, builds the generic plan,
and immutably translates each discriminated update into feature-owner state.
`src/app/appDiscRolePresetApplication.ts` dispatches each touched owner family
once through existing setters. Disabled point/text owners receive dormant
placement without enablement or content changes; dimensionless point owners
preserve their dormant scale.

`src/hooks/useActiveDiscPreset.ts` owns the single transient canonical active
preset state: exact ID/revision plus the latest resolved runtime definition. It
is cleared with the existing new/reset/workspace-exit/project-load lifecycle and
never enters a project snapshot. Explicit application stores the final resolved
definition; targeted point-owner, Title-text, OS, or Legal application replaces
only its matching resolved slot. Guidance consumes this state directly and
fails closed when resolved geometry is unavailable.

`src/project/projectGuidedRestoreLayout.ts` is the save/load placement-preservation
boundary for persisted guided layouts. It resolves the exact saved guided
layout ID/version through its exact canonical preset revision and the restored
Disc template. After ordinary project normalization and safety clamping, only
placements owned by resolved or adjusted guided slots recover their normalized
saved values. This preserves rectangle-authoritative and later manual edits
without reapplying a preset. Unknown, future, rejected, or unsupported mappings
retain the ordinary clamp. Additional logos, supplemental USK, technical and
additional artwork, and unrelated text never inherit a primary guided slot's
restore authority. Omission and completion remain presentation state and do
not affect placement restoration.

`src/app/appActiveDiscPresetPointOwners.ts` requests one exact Title-artwork,
Rating, Media, Developer, or Publisher target from the next authoritative owner
state and merges only `x`, `y`, and scale. Feature hooks invoke it after semantic
changes that can alter valid canonical bounds, including first/replacement
assets, enablement with retained content, value/system/source/theme changes,
and dimension/provenance changes. Direct layout edits do not invoke it. The
providers in `projectTitleArtwork.ts`, `projectLogoAssets.ts`,
`mediaMarkRenderModel.ts`, and `ratingBadgeRenderModel.ts` keep target-specific
visual truth out of `App.tsx` and the generic fitter.

`src/app/appActiveDiscPresetTitleText.ts` and `useDiscTextState.ts` similarly
request only `game-title.text` for canonical content and
fit-geometry-relevant style changes.
`src/app/appActiveDiscPresetPlatformMarks.ts`
requests only the OS group target and merges only x/y/scale.
`usePlatformMarksState.ts`
composes selection, enablement, source/theme/custom-asset changes with that
focused result before committing final platform-mark state. Direct layout
x/y/scale changes do not call targeted placement, preventing effect or setter
recursion. `src/app/appActiveDiscPresetLegalText.ts` similarly requests only
`legal.copyright`; `useDiscTextState.ts` invokes it for next-state Legal
enablement, canonical manual/metadata/rich content, and
fit-geometry-relevant style changes. Direct Legal layout edits do not refit,
while an explicit preset reapply restores preset fitting.

`src/guidedPresets/discGuidedWorkflow.ts` separately owns the pure, versioned
guided-layout identity plus independent omission and completion transitions.
Schema `0.2.0` snapshots only that compact workflow through
`src/project/projectGuidedWorkflow.ts`; neither flag mutates owner content or
placement. Completion is seeded from satisfied authoritative owner state only
when a new/different layout activates and is subsequently recorded only by
explicit user-domain actions. Presentation retains orthogonal unsupported,
omitted, completed, owner-filled, and suggested facts, then applies that
precedence without erasing stored overlap.

Contain-fit is independent of guided progress and navigation. It neither reads
nor mutates `omittedSlotIds`, `completedSlotIds`, completion triggers, Guided
Progress controls, or semantic focus routes. Omitted or completed owners still
target-refit after a semantic replacement because those flags affect guidance
presentation only; impossible fit does not resurrect a guide. Guided reset,
Include/Show actions, and navigation do not change owner placement. Fitted
feature-owner fields remain the shared edit/save/load inputs and drive both
preview and PNG export; guidance and progress UI remain editor-only and never
export.

Disc project load uses a focused post-restore boundary to map valid guided
layout identity to the canonical preset, resolve it for the restored template,
refine content-aware Legal slot geometry from restored owner state and injected
measurement, and record the transient active preset reference/resolved
definition. It does not reapply Title owner geometry; the reconstructed policy
enables later semantic Title changes to target-refit. It never dispatches the application plan's owner updates or infers
identity from coordinates. This restores guided geometry plus targeted late OS
and Legal application while keeping resolved geometry out of the project file.
Persisted feature-owner layout remains preview/export truth, while the
reconstructed transient contain policy enables later semantic point/Title
refits without a full preset reapplication. Failure preserves owner state and
deactivates guidance safely.

Classic applies adapter-safe output directly and does not run the legacy broad
clamp sequence, so unrelated text rows, technical marks, repeated logos, and
other untargeted state do not move. `discRolePresets.ts` retains only Classic
menu metadata while the other two built-in presets continue using their legacy
plans. Normal Classic application is fully applied; only genuinely impossible
rectangle contain/text fitting or another structured placement failure remains
partial. Later semantic changes re-resolve only the active preset's exact point,
Title-text, OS, or Legal target, without reapplying or reclamping any unrelated
owner. Guided placeholders project the same final
resolved regions/statuses and hide unsupported slots.

Guided navigation has two related but distinct contracts. A guided action route
exists only while lifecycle resolution projects an unfilled or suggested
placeholder; pointer, Enter, Space, and native guided-action acceptance apply
only in that reachable state. Sidebar semantic focus targets have a broader
lifetime and may remain registered after owner state fills a slot and removes
its guide, so controller-level or future workflows can still focus the normal
control. A registered target does not make an unmounted guide dispatchable.
Mounted controller tests cover enabled Rating, Media, Developer, and Publisher
targets that are unreachable through current filled-slot guidance. Lifecycle
resolution remains authoritative, and presentation code must not duplicate its
predicates or use runtime DOM queries to decide reachability.

### 12.4 Render/Edit/Export Paths

- `DiscPreview` composes preview layers according to disc layer order.
- Sidebar panels edit feature state.
- Direct preview dragging uses `useDiscPreviewPointerDrag`.
- Straight text inline editing uses the shared preview-mounted editor with a disc adapter.
- Preflight uses `buildExportPreflightSummary`.
- PNG export uses `exportDiscLabelPngBytes`.

### 12.5 Invariants And Future-Change Rules

- Preserve established feature owners when presentation adapters or navigation hosts move; detailed target navigation and control-ownership semantics defer to `EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md`.
- Keep circular disc geometry out of case insert modules.
- Keep shared layout helpers limited to neutral numeric range math; disc annulus, center-hole, and safe-zone collision rules remain disc-owned.
- Keep nominal preset parsing, template resolution, trusted owner adaptation, and App dispatch as separate dependency layers.
- Keep Classic compatibility translation in the focused app-domain wrapper; `App.tsx` supplies current owner state and setters but contains no slot, target, or coordinate policy.
- Do not interpret preset semantic targets as arbitrary object paths or allow serialized definitions to supply executable adapters.
- Keep owner-specific canonical-bounds providers beside their feature/render
  truth; the generic contain helper must not branch on Classic IDs or inspect
  project owners, DOM nodes, React state, or renderer orchestration.
- A contain fit may uniformly change only the exact target's `x`, `y`, and scale,
  must preserve the rendered-bounds center, and must not be followed by a broad
  clamp. Direct layout edits remain manual state until explicit reapply or a
  bounds-changing semantic owner action.
- Keep editor-only guides and UI chrome out of clean exports.
- Preserve disc preview/export parity and fixed layer order.
- Curved disc text remains SVG/textPath.

### 12.6 Validation Expectations

- Unit coverage should include disc text, disc geometry, preflight/design checks, project restore, and feature project modules.
- Manual validation should cover Steam import, artwork import, drag, slider/manual controls, save/load, export preflight, clean export, guide export, and preview/export visual comparison.

### 12.7 Known Risks

- Disc preview/export parity depends on separate DOM/SVG and canvas paths.
- Straight text and curved text have different render/edit constraints.
- This documentation refresh did not independently launch Tauri. Manual app
  testing before the large refactor merge reported no regressions spotted.

## 13. Case Insert Editor Design

### 13.1 Current Implementation Summary

The case insert editor is a separate rectangular editor environment. Jewel case is the first supported case insert template. Current code includes cover, tray, left spine, and right spine state/editing/render/export paths, but the editor remains active work and not alpha-complete.

### 13.2 Key Files

- `src/components/caseInsert/CaseInsertEditorShell.tsx`
- `src/components/caseInsert/CaseInsertTemplateControls.tsx`
- `src/components/caseInsert/CaseInsertTemplateControls.types.ts`
- `src/components/caseInsert/CaseInsertTemplateGameTitleControls.tsx`
- `src/components/caseInsert/CaseInsertTemplateSteamBrandingControls.tsx`
- `src/components/caseInsert/CaseInsertTemplateGameInfoLogoControls.tsx`
- `src/components/caseInsert/CaseInsertTemplateCompanyLogoControls.tsx`
- `src/components/caseInsert/CaseInsertTemplateImageSlotControls.tsx`
- `src/components/caseInsert/CaseInsertTemplateTextControls.tsx`
- `src/components/caseInsert/CaseInsertTemplateControlPlacement.ts`
- `src/components/caseInsert/CaseInsertSpineControls.types.ts`
- `src/components/caseInsert/CaseInsertSpineGameTitleControls.tsx`
- `src/components/caseInsert/CaseInsertSpineGameInfoLogoControls.tsx`
- `src/components/caseInsert/CaseInsertSpineSteamBrandingControls.tsx`
- `src/components/caseInsert/CaseInsertSpineImageSlotControls.tsx`
- `src/components/caseInsert/CaseInsertSpineTextControls.tsx`
- `src/components/caseInsert/CaseInsertSpineControlPlacement.ts`
- `src/components/preview/CaseInsertPreview.tsx`
- `src/components/preview/CaseInsertTemplatePreviewLayers.tsx`
- `src/components/preview/CaseInsertTemplatePreviewLayerTypes.ts`
- `src/components/preview/CaseInsertTemplateTextLayer.tsx`
- `src/components/preview/caseInsertTemplatePreviewGeometry.ts`
- `src/components/preview/CaseInsertSpinePreviewLayer.tsx`
- `src/components/preview/CaseInsertSteamBannerPreviewLayer.tsx`
- `src/components/preview/CaseInsertGuideOverlay.tsx`
- `src/hooks/useCaseInsertTemplateEditor.ts`
- `src/hooks/useCaseInsertTemplateLogoEditor.ts`
- `src/hooks/useCaseInsertTemplateSteamBannerEditor.ts`
- `src/hooks/useJewelCaseSpineEditor.ts`
- `src/hooks/useJewelCaseSpineLogoEditor.ts`
- `src/hooks/useJewelCaseSpineSteamBannerEditor.ts`
- `src/hooks/useCaseInsertBrandingMarkSync.ts`
- `src/caseInsert/*.ts`
- `src/layout/jewelCase*.ts`
- `src/layout/caseInsert*.ts`
- `src/layout/layoutRangeMath.ts`
- `src/templates/caseInsertTemplates.ts`
- `src/export/exportCaseInsertPng.ts`
- `src/export/caseInsertTemplateExportLayers.ts`
- `src/export/caseInsertPngImage.ts`
- `src/export/caseInsertPngText.ts`
- `src/export/caseInsertExportPreflight.ts`
- `src/export/caseInsertPreflightImageWarnings.ts`
- `src/export/caseInsertPreflightVisibility.ts`
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
- Cover/tray image-slot, logo, Steam banner, and text-list action families are
  delegated to focused case-insert action modules and small hook adapters while
  the public hook return shape remains the editor contract.
- `useJewelCaseSpineEditor` owns spine editing actions.
- Spine image-slot, logo, Steam banner, and text action families are delegated
  to focused spine-owned helpers while left/right target identity and mirror
  fanout stay explicit.
- `useCaseInsertPreviewPointerDrag` handles case preview dragging.
- Export uses `exportCaseInsertPngBytes`, with template layer drawing,
  image-slot drawing, and text drawing delegated to case-insert export helpers.
- Preflight/design check use case insert export helpers, including focused
  image-warning and visibility-warning builders.

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
- Focused tests cover split cover/tray and spine action modules, branding mark
  source projection, image-slot source import/application, project persistence,
  and case insert text layout/wrapping helpers.
- Manual validation should cover New Case Insert, loading case projects, cover/tray/spine controls, source switching, drag, save/load, clean export, guide export, and preview/export parity.

### 13.7 Known Risks

- Case insert hooks remain central, but the largest repeated action families
  have been split into focused case/spine modules. Further extraction should
  stop when it would obscure target identity, mirror behavior, save/load shape,
  or preview/export ordering.
- Structured tray/spine layouts remain open under `#149`.
- Jewel case alpha remains open under `#126`.
- Broad case insert runtime behavior remains source-reviewed in this document.
  Manual app testing before the large refactor merge reported no regressions
  spotted, but this documentation refresh did not independently validate case
  insert runtime behavior in Tauri.

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
- `src/components/preview/inlinePreviewTextEditorTextGeometry.ts`
- `src/components/preview/inlinePreviewTextEditorSelection.ts`
- `src/components/preview/inlinePreviewTextEditorMoveRing.tsx`
- `src/components/preview/inlinePreviewTextEditorTextarea.tsx`
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
  two-column zoom out/in, Fit, and pan layout. It normally collapses to a slim
  right-edge hover/focus handle so zoomed previews can use the viewable area;
  hovering the handle or focusing any rail control opens the full panel. Fit
  calculations reserve the minimum 48px rail, then the visible rail may grow
  continuously up to 96px only into residual unused gutter. The collapsed or
  expanded rail presentation must not feed back into Fit, reduce the fitted
  preview scale, or move the fitted design surface. The zoomed viewport may
  render the transformed preview surface behind otherwise empty header/ribbon
  space, while the fitted stage still reserves the header height and the
  app-shell header/ribbon controls remain visually and interactively above the
  preview.
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

Save remains orchestrated by `App.tsx`, focused project snapshot/package
helpers, the lifecycle root, and Tauri file commands. It writes complete
`.sbls` packages through a same-directory temporary file that is fully written,
flushed, synchronized, closed, identity-rechecked for legacy conversion, and
atomically replaced at the native boundary. Open dispatches through the same
lifecycle root.
Its staging phase reads, parses, validates/migrates, routes, restores, resolves
Disc background image geometry, reconstructs Disc preset state, and projects
Case branding before any live mutation. Its commit phase establishes the exact
accepted normalized snapshot as a path-bearing revision-zero clean session and
applies the complete editor aggregate synchronously in the same React batch.

The draft target-state application-command, single-project session, path,
baseline, dirty-state, replacement-guard, and native close/Quit semantics are
defined in [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md).
That contract records the implemented New/Open/Save, continuous current-project
synchronization, and replacement-guard checkpoints while remaining normative
for unfinished lifecycle work. Serialized fields and migrations remain owned by
[`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md). Exact `.sbls` codec, security,
legacy-conversion, and atomic binary persistence behavior is defined by
[`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md).
The package-domain codec/security layer and bounded binary project-I/O layer
retain separate ownership. Native content recognition, read/decode composition,
strict raw hydrated-response transport, and shared mutation-free package
staging are implemented. Package Open/Save/Save As, legacy conversion,
session-format adoption, and lifecycle/runtime composition are source-connected;
native Tauri workflow acceptance remains unperformed.

### 15.2 Key Files

- `src/app/App.tsx`
- `src/app/appProjectLoad.ts`
- `src/app/appProjectRestore.ts`
- `src/app/appProjectNewCommand.ts`
- `src/app/appProjectNewEditorApply.ts`
- `src/app/appProjectOpenCommand.ts`
- `src/app/appProjectReplacementGuard.ts`
- `src/app/appProjectSaveCommand.ts`
- `src/package/projectPackageCapturePlan.ts`
- `src/project/createProjectSnapshot.ts`
- `src/project/blankDiscProject.ts`
- `src/project/restoreProjectState.ts`
- `src/project/caseInsertProjectAdapters.ts`
- `src/project/projectSchema.ts`
- `src/project/projectRouting.ts`
- `src/project/savedProjectNormalization.ts`
- `src/tauri/fileSystem.ts`
- `src/tauri/binaryProjectFile.ts`
- `src/tauri/projectFileFormat.ts`
- `src/tauri/packageProjectFile.ts`
- `src/tauri/projectPackageWrite.ts`
- `src/tauri/projectFileFailure.ts`
- `src-tauri/src/commands/files.rs`
- `src-tauri/src/commands/project_files.rs`
- `src-tauri/src/commands/project_packages.rs`
- `src-tauri/src/legacy_project_identity.rs`
- `src-tauri/src/project_binary_io.rs`
- `src-tauri/src/project_format_recognition.rs`
- `src-tauri/src/project_file.rs`
- `src-tauri/crates/sbls-package-codec/src/lib.rs`
- `src-tauri/crates/sbls-package-codec/src/conformance_tests.rs`
- `src-tauri/crates/sbls-package-codec/src/encode.rs`
- `src-tauri/crates/sbls-package-codec/src/decode.rs`
- `src-tauri/crates/sbls-package-codec/src/archive.rs`
- `src-tauri/crates/sbls-package-codec/src/raster.rs`
- `src-tauri/crates/sbls-package-codec/vendor/PROVENANCE.md`

### 15.3 Source-Of-Truth State

Runtime feature-owner state remains source of truth while editing. After each
committed React update, a focused application adapter synchronizes one complete
normalized Disc or Case aggregate into the lifecycle session. Canonically equal
content is a state/revision/publication no-op; a real change preserves session
identity, recognized persistence format, selected path, clean baseline, and
route while incrementing revision once. Save captures immutable `R` from this
lifecycle-owned current project. After commit, it adopts `R` as baseline without
recapturing editor state, so an in-flight `R+1` remains current and dirty.
Production Open accepts content-recognized legacy JSON or package input. The
package crate, recognizer, native decode command, raw decode port, and package
staging entry own no active session: the lifecycle Open owner alone adopts the
accepted path, truthful format, route, revision-zero state, and baseline. The
encode/write command also owns no session: the lifecycle Save owner alone
authorizes it and adopts state.

### 15.4 Render/Edit/Export Paths

- Disc save uses `createProjectSnapshot`.
- Disc Open staging uses the existing schema parser/routing owners and
  `restoreSavedProjectState`, including asynchronous background image geometry.
- Case insert save uses `createCaseInsertProjectSnapshot`; Case Open staging
  uses the existing normalizer/restore owners and precomputes branding slots.
- The staged discriminated union carries the exact normalized project, selected
  path, project kind, target route, complete restored owner state, and transient
  preset state needed for the non-fallible aggregate application seam.
- `write_project_file` remains registered but production Save no longer calls
  it. The binary export writer is not routed through project-package persistence.
- Dormant `read_binary_project_file` and `write_binary_project_file` commands
  transport top-level raw bytes and a canonical percent-encoded path header.
  Native reading is bounded at exactly 256 MiB with a fixed scratch buffer;
  native writing performs the same bound check and delegates the caller's byte
  slice to the existing atomic writer. Their TypeScript port is not imported by
  a production Open, Save, Save As, dialog, or lifecycle owner.
- Production `encode_and_write_project_package_file` validates a narrow raw
  plan/project frame plus destination and optional legacy-source headers,
  borrows project JSON into the codec, and passes one complete owned package
  buffer directly to the atomic writer. It returns no package bytes.
- Production `recognize_project_file_format` uses an empty raw request plus the
  canonical path header and returns only `legacy-json` or `sbls-package-v1`.
  It enforces the 256 MiB file-length boundary and exact package/BOM/JSON-prefix
  recognition without inspecting filename suffixes.
- Production `decode_project_package_file` reuses the binary reader's
  path/body/read owner, lends the owned archive buffer to the protocol-bounded
  Rust codec, and moves only hydrated JSON into a raw response. The strict
  TypeScript port validates exact file/package failures and the contract-derived
  671,096,832-byte static hydrated-response cap without receiving archive bytes
  or metadata.
- `stageProjectPackageOpen` performs strict UTF-8 decode, then calls the same
  parse/migrate/normalize/route/restore/candidate-capture owner used by legacy
  staging. Production `stageAppProjectOpen` recognizes first and dispatches to
  package staging without any JSON fallback after a package failure.
- Export uses runtime state after any load/restore.

### 15.5 Invariants And Future-Change Rules

- Saving and loading must preserve current visual state, disabled state, uploaded assets, source choices, placement, scale, custom images, and export guide settings.
- Load normalization may tolerate sparse legacy data but must not erase valid user data.
- Case insert projects must not restore through the disc path.
- Target package support must continue to load current `.json` and `.sbls.json`
  files and must follow
  [`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md).
- Native project writes must exclusively create adjacent temporary files,
  synchronize and close them before one platform replacement, avoid copy or
  delete-then-rename fallbacks, preserve the prior destination on every returned
  precommit/replacement failure, and report cleanup failures without hiding the
  primary phase error.

### 15.6 Validation Expectations

- Project schema/routing/restore tests should be updated for schema changes.
- `src-tauri/src/project_file.rs` tests must cover real create/replace behavior,
  deterministic phase failures, collision ownership, operation ordering, exact
  Disc/Case bytes, and the actual Windows replace-existing failure path.
- `src-tauri/src/commands/project_packages.rs` tests must cover real Disc/Case
  package encode/write/decode, request framing, exact hydrated raw bytes,
  borrowed input/native-owned output, legacy identity and commit-boundary race
  protection, exhaustive safe failures, file-before-codec precedence,
  isolation, and registration. TypeScript tests must cover the closed capture
  plan, built-in registry digests, exact DTO guards, strict UTF-8, Save routing
  and adoption, native recognition/misleading-suffix dispatch, shared full
  Disc/all-four-surface Case staging, immutability, lifecycle identity, and
  direct-Save eligibility.
- Manual validation should save, reload, and export both disc and case insert projects when affected.

### 15.7 Known Risks

- Shallow schema validation can miss nested invalid states.
- The native writer synchronizes the temporary file before replacement but does
  not perform a fallible parent-directory sync after commit; it does not claim
  stronger power-loss durability for the namespace entry than the host
  filesystem provides.
- Real dirty source changes may affect exact save/load behavior until committed or reverted by the user; status-only/no-diff files are not treated as meaningful source changes.

## 16. Export Design

### 16.1 Current Implementation Summary

Export renders PNG bytes through canvas helpers. Disc export is circular and 300 DPI by selected/custom disc geometry. Case insert export is rectangular and template-driven. Export preflight summarizes output and warnings before writing files.

### 16.2 Key Files

- `src/export/exportPng.ts`
- `src/export/exportCaseInsertPng.ts`
- `src/export/caseInsertTemplateExportLayers.ts`
- `src/export/caseInsertPngImage.ts`
- `src/export/caseInsertPngText.ts`
- `src/export/canvasImage.ts`
- `src/export/exportPreflight.ts`
- `src/export/discDesignCheck.ts`
- `src/export/caseInsertExportPreflight.ts`
- `src/export/caseInsertPreflightImageWarnings.ts`
- `src/export/caseInsertPreflightVisibility.ts`
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
- The native destination chooser opens first.
- After a destination is selected, a preflight summary is built.
- User confirmation is always requested; clean summaries use an information dialog and warning summaries use a warning dialog.
- Canvas export builds PNG bytes.
- Tauri writes binary PNG bytes directly to the selected path.

The draft target workflow intentionally differs: [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md)
requires one immutable request, preflight before dialogs, confirmation only for
aggregated actionable warnings, then destination selection, render/encode, and
safe write/commit.

### 16.5 Invariants And Future-Change Rules

- Clean export omits editor-only guides and preview chrome.
- Guide-enabled export draws selected guides intentionally.
- Export must match visible preview content and layer order.
- Export warnings must not fire solely because an element uses a built-in/default generic asset.
- Export must not silently omit enabled preview-visible elements.

### 16.6 Validation Expectations

- Unit tests cover preflight, design checks, canvas helpers, and draw helpers.
- Case insert export tests also cover image-warning families, visibility
  warnings, and text/image draw helper behavior where deterministic.
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
- Guide legends currently render as preview-local app-shell overlays.
- Export draws selected guides after normal content.
- Preflight/design checks produce summaries and warnings.

### 17.5 Invariants And Future-Change Rules

- Guide Legend remains preview-local app-shell information and must not become exported or dirty project content.
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
- Focused split suites now cover project case insert artwork slots, branding
  sources/persistence, legacy normalization, preview text editing/controls,
  text persistence/normalization, platform marks, and restore slices instead of
  relying only on the former monolithic project test files.

### 18.4 Known Validation Gaps

- Browser diagnostic scripts exist for selector and DOM triage, but required
  user-visible smoke targets the native Tauri window rather than Playwright
  against localhost.
- Manual Tauri behavior is not validated by tests alone.
- Current fixture coverage does not fully cover every recently added visual system.
- No docs-specific validation command exists. Documentation-only changes should
  still run the standard lightweight/full validation when practical:
  `npm run check:cycles`, `npm run lint`, `npm run test`, and `npm run build`.

## 19. Known Fragile Areas And Gaps

### 19.1 Fragile Areas

- `App.tsx` remains large and coordinates many feature flows.
- Case insert editor hooks and export are large and central.
- Project schema validation is shallow, and migration coverage is limited to
  the explicit `0.1.0` to `0.2.0` compatibility step.
- Preview and export rendering are separate paths in several subsystems.
- Inline text editing depends on DOM measurement, caret math, wrapped text, CSS, and runtime focus behavior.
- CSS can become hidden rendering/layout policy.
- Optional visual disabled-state behavior is cross-cutting and regression-prone.
- Case insert global-source branding sync is parity-sensitive.
- The documentation refresh starts from a clean `main` checkout at
  `6feb262bed2abd36b1371e5c0674013018132d16`; any future dirty state should be
  inspected before release claims.

### 19.2 Known Gaps

- Case insert editor is active but not alpha-complete.
- Structured tray/spine layouts remain open under `#149`.
- Jewel case alpha remains open under `#126`.
- Historical mark families remain open under `#125`.
- Issue `#48` is closed; current schema validation and the `0.1.0` to `0.2.0`
  migration are implemented, while any future schema change remains separate
  work under [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md).
- Preview selection, snapping, keyboard nudging, inspector, and context-menu workflows remain open under related preview issues.
- Production [`.sbls` package Open and content recognition](PROJECT_PACKAGE_FORMAT_CONTRACT.md)
  are source-connected alongside package Save/Save As, legacy conversion,
  encoder/write composition, session format identity, and bounded binary I/O.
  New Disc, New Case, and Open use one dirty-aware replacement guard; Home
  Resume, Close/termination guarding, and native Tauri workflow acceptance
  remain unimplemented.
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

### ADR-003: Plain JSON Project Files Are The Current Production Format

Status: Accepted, current.

Decision:

- New project output is `.sbls` package v1; plain `.json` and `.sbls.json`
  projects remain legacy imports. Hydrated projects use schema version `0.2.0`.
- Schema `0.1.0` projects migrate explicitly to `0.2.0` without inferred guidance or owner changes.
- Images needed for reload are embedded as data URLs where supported.
- `.sbls` packages are defined by
  [`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md),
  and preserve the choice recorded in
  [`PROJECT_PACKAGE_FORMAT_DECISION.md`](PROJECT_PACKAGE_FORMAT_DECISION.md).
- A deterministic, security-bounded, Rust-owned v1 codec with crate-private
  vendored native JPEG/WebP validation shims is implemented as a
  dependency-isolated workspace member. A production native recognizer selects
  legacy versus package content; one Tauri command composes bounded file read
  with codec decode and one TypeScript path stages only hydrated JSON through
  existing project owners. A separate production
  native command composes bounded capture metadata/project JSON, borrowed codec
  encode, and the existing atomic writer for lifecycle Save/Save As.

Consequences:

- Current package/legacy Open and package Save must preserve hydrated schema compatibility under
  [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md).
- Source-connected `.sbls` Open/Save behavior may be described as current;
  native platform workflow acceptance must not be implied until the runtime
  requirements in [`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md)
  are executed.
- Target package work must continue loading existing JSON projects.

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
- The current merged implementation keeps cover, tray, spine, and straight disc
  inline editing on final-renderer-visible adapter input/selection paths. The
  previous blanket noncompliance caveat is stale for those surfaces, but this
  ADR remains the stabilization contract for future WYSIWYG work.

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
- Keep intentional setup/type controls in the sidebar. Metadata/default status
  and manual-override restoration are contextual ribbon Source-card
  responsibilities for selected text.
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
- Home Return/Resume, Close/termination use of the dirty-aware guard, and native
  package workflow acceptance; the guard is already active for New Disc, New
  Case, and Open, while content-recognized `.sbls` Open/Save/Save As,
  encoder/write composition, session format identity, bounded binary project
  I/O, and native decode/staging are source-connected.
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
