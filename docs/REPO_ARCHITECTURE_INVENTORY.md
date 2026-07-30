# Repository Architecture Inventory
> Status: Conditional as-built repository inventory.
> Purpose: File ownership and implementation map for finding existing owners.
> Read when: Before refactors, ownership changes, or architecture-sensitive edits.
> Authoritative source: Current source for exact facts; SDD for architecture contracts.
> Last broad repository review against commit: `6feb262bed2abd36b1371e5c0674013018132d16`.
> Lifecycle/package ownership refresh: PR #326 merge commit `4db227266695ee0b35d33e1f88e82cd88ad85034` plus the focused `agent/project-session-dirty-replacement-guard` checkpoint on 2026-07-29.


This inventory records how Steam Backup Label Studio is implemented in the repository at the time of review. It is an ownership map that supports the Software Design Document, not a roadmap and not a second source of architecture contracts.

## Basis

- Branch: `main`
- HEAD commit at this inventory refresh:
  `6feb262bed2abd36b1371e5c0674013018132d16`.
- Refactor impact comparison:
  `d23c1bafdce998041bc7c683ebd38f0401acdd39..6feb262bed2abd36b1371e5c0674013018132d16`.
- `main` and `origin/main` both pointed at
  `6feb262bed2abd36b1371e5c0674013018132d16` when this refresh began, so the
  merge-base with `origin/main` was HEAD. The previous-commit comparison above
  is the evidence range for the merged refactor pass.
- Working tree status was clean before this documentation refresh.
- This file is based on repository files, tests, documentation, and the merged
  refactor diff. Unknowns are marked as unknown.
- Package-codec ownership below was refreshed separately from the later pure
  codec and native integration checkpoints. It does not broadly re-baseline
  unrelated editor file/line inventories.
- Bounded binary project-I/O ownership was refreshed from the later dormant
  raw Tauri transport checkpoint.
- Package read/decode ownership was refreshed from the native composition and
  TypeScript staging checkpoint, then from production content-recognized Open.
  Bounded native recognition selects legacy versus package transport; both
  branches converge on shared mutation-free project staging and the existing
  lifecycle compare-and-swap/apply owner.
- No browser diagnostic or Tauri runtime verification was performed during this
  documentation refresh. Manual app testing before the refactor merge was
  reported with no regressions spotted.

## Open Issue Context

Open GitHub issues were reviewed during this task. Related open issues include:

- `#44` Extract remaining editor state into focused hooks.
- `#46` Organize CSS after component extraction.
- `#48` is closed after establishing the current schema validation and
  `0.1.0 -> 0.2.0` migration baseline.
- `#125` Disc marks: add historical technology mark catalog and missing mark families.
- `#126` Jewel case editor: define case-front, case-back, and spine alpha finish line.
- `#149` Case inserts: replace auto-stacked imported content with structured tray and spine layouts.
- `#172` Preview editing: add selection, snapping, and keyboard nudging.
- `#174`, `#175`, `#176` Preview inspector/context-menu/sidebar workflow improvements.
- `#178`, `#181`, `#184` Text-system improvements around fonts, copy fitting, and add-only preview editing.
- `#266` Large-file refactor tracking issue; closed as completed after merge
  commit `6feb262bed2abd36b1371e5c0674013018132d16`.
- `#308` Application command and project lifecycle implementation parent.
- `#312` Atomic project writing and durability semantics.

## Package Scripts and Validation

Purpose: define local development, build, lint, test, and Tauri commands.

Key files:

- `package.json`
- `scripts/run-tests.mjs`
- `scripts/test-file-list.mjs`
- `vite.config.ts`
- `scripts/check-cycles.mjs`
- `eslint.config.js`
- `tsconfig*.json`

Implemented scripts:

- `npm run dev`: starts Vite.
- `npm run build`: runs `tsc -b && vite build`.
- `npm run check:cycles`: runs `node scripts/check-cycles.mjs`.
- `npm run capture:ribbon:browser`: runs `node scripts/capture-ribbon.mjs` as a browser diagnostic-only ribbon capture.
- `npm run diagnose:text-editor:browser`: runs `node scripts/text-editor-smoke.mjs` as a browser diagnostic-only text-editor route.
- `npm run lint`: runs `eslint .`.
- `npm run smoke:text-editor`: runs `node scripts/native-tauri-smoke-required.mjs`, which documents the required native `npm run tauri dev` + Any App smoke route and exits nonzero so browser diagnostics cannot satisfy runtime acceptance.
- `npm run test`: runs `scripts/run-tests.mjs`, which batches Node's built-in
  test runner with `--experimental-strip-types` over the explicit file list in
  `scripts/test-file-list.mjs`, then runs the registered
  `sbls-package-codec` Rust tests with `--locked --jobs 1`; Node and Rust
  failures are accumulated so the codec suite still runs after a Node failure.
- `npm run preview`: starts `vite preview`.
- `npm run tauri`: invokes the Tauri CLI.

Validation model:

- Node tests and follow-on focused test commands are explicit entries in
  `scripts/test-file-list.mjs`; newly added tests must be registered there to
  run under `npm run test`.
- `scripts/check-cycles.mjs` scans relative imports in `src/**/*.ts(x)` and fails on import cycles.
- No docs-only validation command is defined.
- User-visible runtime smoke is not repository-owned automation. It is performed
  by launching `npm run tauri dev` from the primary checkout and operating the
  spawned native Tauri window with Any App / Computer Use when explicitly
  authorized.
- `scripts/capture-ribbon.mjs` owns deterministic browser-based contextual
  ribbon diagnostic capture. It writes full-window PNGs, a JSON manifest, and
  an HTML contact sheet outside the repo by default. It is intentionally
  labeled browser capture and does not claim native Tauri visual verification.

Risks:

- The explicit test list can miss newly created tests if package metadata is not updated.
- Cycle detection is separate from `npm run test` and `npm run lint`.

## Tauri, Vite, and React Entry Points

Purpose: launch the React app in Vite and package it through Tauri.

Key files:

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
- `src/app/appApplicationCommandFeedback.ts`
- `src/app/appProjectReplacementGuard.ts`
- `src/app/appProjectSaveCommand.ts`
- `src/app/appWorkspaceNavigationCommand.ts`
- `src/app/appWorkspaceNavigationApply.ts`
- `src/app/appHomeResume.ts`
- `src/components/project/ProjectReplacementDialog.tsx`
- `src/components/project/useProjectReplacementPrompt.ts`
- `vite.config.ts`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/*.rs`
- `src-tauri/crates/sbls-package-codec/Cargo.toml`
- `src-tauri/Cargo.lock`

Source-of-truth state:

- React app state is owned in `src/app/App.tsx` plus feature hooks imported by `App`.
- Native state is not persisted in Rust; Rust commands perform filesystem, HTTP, and platform integration work on request.

Render path:

- `index.html` exposes `#root`.
- `src/main.tsx` imports global CSS and renders `<App />` under React `StrictMode`.
- `src/app/App.tsx` routes between home, disc editor, and case insert editor UI.

Native command path:

- `src-tauri/src/main.rs` calls `app_lib::run()`.
- `src-tauri/src/lib.rs` registers file, dormant generic bounded binary
  project-file, production format-recognition/package-decode/package-encode-write,
  Steam, local Steam, local image, folder opening, and official-site logo
  discovery commands.
- Command owners are split into `commands/files.rs`, `commands/steam.rs`, `commands/local_steam.rs`, `commands/local_images.rs`, `commands/official_site.rs`, and `platform/open_folder.rs`.
- `src-tauri/Cargo.toml` is also the workspace root. It lists
  `crates/sbls-package-codec` as a member while retaining the Tauri application
  as the default member. The Tauri application has one local path dependency on
  the codec for `commands/project_packages.rs`; that module composes production
  encode/atomic write and bounded read/decode. The separately registered
  binary read/write commands remain codec-agnostic.

Risks:

- Tauri command behavior was not runtime-verified here.
- The app manifest declares Rust `1.77.2`, but the pre-existing locked
  `serde_spanned 1.1.1` manifest requires Cargo edition-2024 support and blocks
  a whole-workspace check with installed Cargo 1.77.2 before app compilation.
  Current-toolchain strict Clippy separately flags two untouched
  `official_site.rs` APIs stabilized in Rust 1.84. The focused binary-I/O slice
  changes neither dependency/source owner and makes no whole-app 1.77.2 claim.
- `src-tauri/tauri.conf.json` runs Vite before dev and build, so stale frontend build/runtime state must be checked separately during user-visible fixes.

## App-Level State Ownership

Purpose: orchestrate workspace selection, editor feature hooks, save/load, Steam import, export, and panel/preview wiring.

Key files:

- `src/app/App.tsx`
- `src/app/appProjectLoad.ts`
- `src/app/appProjectSave.ts`
- `src/app/appProjectSaveCommand.ts`
- `src/package/projectPackageCapturePlan.ts`
- `src/tauri/projectPackageWrite.ts`
- `src/app/appProjectRestore.ts`
- `src/app/appPngExport.ts`
- `src/app/appPngExportInputs.ts`
- `src/app/appSteamImportPlan.ts`
- `src/app/appSteamDiscVisualImport.ts`
- `src/app/appCaseInsertPreviewTextHandlers.ts`
- `src/lifecycle/applicationCommandTypes.ts`
- `src/lifecycle/applicationCommandRegistry.ts`
- `src/lifecycle/commandBusyScopes.ts`
- `src/lifecycle/applicationLifecycleStateStore.ts`
- `src/lifecycle/applicationLifecycleCommandPorts.ts`
- `src/lifecycle/applicationLifecycleCommandDefinitions.ts`
- `src/lifecycle/applicationLifecycleCompositionRoot.ts`
- `src/lifecycle/lifecycleCommandCapabilities.ts`
- `src/lifecycle/projectSession.ts`
- `src/applicationMenu/applicationMenuTypes.ts`
- `src/applicationMenu/applicationMenuRegistry.ts`
- `src/applicationMenu/applicationMenuProjection.ts`
- `src/applicationMenu/applicationMenuLifecycleCapabilities.ts`
- `src/applicationMenu/inMemoryApplicationMenuPort.ts`
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

- `App.tsx` owns workspace state, selected game, project metadata, selected case insert pane, selected text target, export guide settings, project jewel case state, local screenshot state, and cross-feature callback orchestration.
- App-owned helper modules own cohesive orchestration clusters for project
  load/save/restore, PNG export preflight and export input construction, Steam
  import planning, disc visual import defaults, and case-insert preview text
  handler construction.
- Focused hooks own feature-specific state slices for disc template, Steam banner, background artwork, disc text, title artwork, additional artwork, logos, rating badge, media mark, platform marks, technical marks, case insert template editing, spine editing, and case insert branding sync.
- `src/lifecycle/` provides the single-session/canonical-baseline foundation
  and one application lifecycle composition root. `src/main.tsx` constructs one
  application runtime outside React Strict Mode, and the application boundary
  owns disposal. The root owns one
  immutable state store, registry/dispatcher, busy coordinator, exhaustive
  typed command-port boundary, operation/session ID boundary, and centralized
  state/busy/termination/owner-aware capability projection. A committed-render
  dependency ref keeps the root stable while New/Open/Save/guard/workspace
  adapters change. `project.new-disc`, `project.new-case`, `project.open`,
  `project.save`, `project.save-as`, `workspace.return-home`, and
  `project.resume` have production command owners; Close/termination ports
  remain explicitly disabled. After committed React updates, focused adapters
  synchronize one complete normalized Disc or Case aggregate and the exact
  session-only Disc or Case Front/Back/Spine route into the active lifecycle
  session. Canonical content and identical route synchronization are no-ops;
  route changes never change project revision or dirty state.
- `src/applicationMenu/` now owns the immutable first-release presentation-ID
  catalog, semantic-target mapping, Windows/Linux/macOS descriptor projection,
  injected capability projection, a lifecycle-root capability consumption
  helper, and an in-memory generation-ordered test port. It is intentionally
  disconnected from React, Tauri, native events, command execution, workflow
  hosts, and sidebar migration.

Render path:

- Home workspace renders `HomeScreen`.
- Disc workspace renders sidebar panels and `DiscPreview`.
- Case insert workspace renders `CaseInsertEditorShell`.

Edit/interaction path:

- Sidebar controls call callbacks from `App.tsx` and feature hooks.
- Preview drag callbacks are composed through `useDiscPreviewPointerDrag` and `useCaseInsertPreviewPointerDrag`.
- Steam import callbacks in `App.tsx` call Steam/native helpers and app-owned
  planning/import helpers, then update disc or case-insert state slices.

Save/Open path:

- Project File Save dispatches `project.save`. A truthful package session with
  an eligible `.sbls` path writes directly; pathless, legacy, and wrong-suffix
  sessions route through Save As. The owner writes lifecycle-owned immutable
  snapshot `R`; commit success adopts path, `sbls-package-v1`, and baseline `R`
  without recapturing editor state, preserving any newer current `R+1` as dirty.
- Every Home, Disc, and Case Load control dispatches `project.open` through the
  sole root. `appProjectLoad.ts` stages one immutable candidate with no live
  setters; `appProjectOpenCommand.ts` prepares its editor aggregate, runs the
  shared dirty-aware replacement guard, performs final authorization/CAS, and
  `appProjectRestore.ts` commits lifecycle notifications and the complete
  editor/route/transient aggregate inside one synchronous React batch.
- Home, Disc, and Case New/Switch controls dispatch `project.new-disc` or
  `project.new-case`. Both owners use the same guard and atomically establish
  one pathless, baseline-less, dirty Disc or Case session. Guard authorization
  is bound to captured session ID/revision, so stale Discard or Save decisions
  cannot replace newer work.
- Disc and Case Main Menu controls dispatch `workspace.return-home`, which
  retains the exact lifecycle session without a replacement guard. Home renders
  Resume only for that retained session, and `project.resume` restores its exact
  editor route without reading or restoring project content.
- Current lifecycle controls publish typed terminal command feedback through
  one application adapter. The shared status owner enforces active
  deduplication keys, editor toasts stay mounted at App scope, and Home mirrors
  accepted messages through a live status surface.

Export path:

- `App.tsx` calls app PNG export helpers, which build preflight inputs, confirm
  warnings, run disc or case-insert PNG export helpers, and write bytes through
  Tauri.

Tests:

- App-owned orchestration helpers have focused tests under `src/app/*.test.ts`.
  Full `App.tsx` integration coverage remains limited.
- Pure lifecycle tests cover command registration, busy scopes, dispatch
  outcomes, and lifecycle capabilities. Pure application-menu tests cover the
  exact hierarchy, semantic mapping, platform placement/accelerators,
  H0/H1/Disc/Case capability projection, dynamic labels, and per-window stale
  generation rejection.

Risks:

- `src/app/App.tsx` is still large, around 1746 lines in this checkout, and
  remains a cross-feature orchestration point.
- Open issue `#44` tracks further state extraction.

## Project Save/Load Model

Purpose: persist new production editor projects as `.sbls` packages, open
content-recognized package or legacy JSON projects into current editor state,
and identify the package codec, bounded binary project-I/O, native recognition,
production read/decode, encode/write, and shared staging owners.

Key files:

- `src/project/projectTypes.ts`
- `src/project/projectSchema.ts`
- `src/project/projectGuidedWorkflow.ts`
- `src/project/createProjectSnapshot.ts`
- `src/project/restoreProjectState.ts`
- `src/project/caseInsertProjectAdapters.ts`
- `src/project/projectRouting.ts`
- `src/project/savedProjectNormalization.ts`
- `src/project/projectCaseInsert.ts`
- `src/app/appProjectLoad.ts`
- `src/app/appProjectRestore.ts`
- `src/app/appProjectOpenCommand.ts`
- `src/app/appProjectSaveCommand.ts`
- `src/package/projectPackageCapturePlan.ts`
- `src/diagnostics/projectParityHarness.ts`
- `src/tauri/binaryProjectFile.ts`
- `src/tauri/binaryProjectFile.test.ts`
- `src/tauri/projectFileFailure.ts`
- `src/tauri/projectFileFormat.ts`
- `src/tauri/projectFileFormat.test.ts`
- `src/tauri/packageProjectFile.ts`
- `src/tauri/packageProjectFile.test.ts`
- `src/tauri/projectPackageWrite.ts`
- `src/tauri/projectPackageWrite.test.ts`
- `src/app/appProjectPackageLoad.test.ts`
- `src-tauri/src/commands/files.rs`
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
- `src-tauri/crates/sbls-package-codec/src/archive.rs`
- `src-tauri/crates/sbls-package-codec/src/assets.rs`
- `src-tauri/crates/sbls-package-codec/src/json.rs`
- `src-tauri/crates/sbls-package-codec/src/limits.rs`
- `src-tauri/crates/sbls-package-codec/src/manifest.rs`
- `src-tauri/crates/sbls-package-codec/src/model.rs`
- `src-tauri/crates/sbls-package-codec/src/native.rs`
- `src-tauri/crates/sbls-package-codec/src/raster.rs`
- `src-tauri/crates/sbls-package-codec/src/registry.rs`
- `src-tauri/crates/sbls-package-codec/build.rs`
- `src-tauri/crates/sbls-package-codec/native/include/sbls_codec_shim.h`
- `src-tauri/crates/sbls-package-codec/native/include/sbls_allocation_ledger.h`
- `src-tauri/crates/sbls-package-codec/native/config/libjpeg-turbo/jconfig.h`
- `src-tauri/crates/sbls-package-codec/native/src/allocation_ledger.c`
- `src-tauri/crates/sbls-package-codec/native/src/jpeg_validator.c`
- `src-tauri/crates/sbls-package-codec/native/src/jpeg_rejected_precision_guards.c`
- `src-tauri/crates/sbls-package-codec/native/src/webp_validator.c`
- `src-tauri/crates/sbls-package-codec/native/src/webp_single_thread_worker.c`
- `src-tauri/crates/sbls-package-codec/vendor/.gitattributes`
- `src-tauri/crates/sbls-package-codec/vendor/overlays/libwebp/src/dsp/cpu.h`
- `src-tauri/crates/sbls-package-codec/vendor/PROVENANCE.md`
- `src-tauri/crates/sbls-package-codec/vendor/patches/PATCHES.md`
- `docs/PROJECT_FILE_SPEC.md`
- `docs/PROJECT_PACKAGE_FORMAT_CONTRACT.md`

Source-of-truth state:

- `SavedProjectBase`, `SavedDiscProject`, `SavedCaseInsertProject`, `ProjectMetadata`, and case-insert project types live in `src/project/projectTypes.ts`.
- `CURRENT_PROJECT_SCHEMA_VERSION` is `0.2.0` in `src/project/projectSchema.ts`.
- `PROJECT_SCHEMA_MIGRATIONS` contains the explicit `0.1.0 -> 0.2.0` compatibility step.
- `projectGuidedWorkflow.ts` owns the compact Disc workflow snapshot adapter
  for active layout identity plus independent omission/completion arrays and
  tolerant restoration through the pure guided normalizer.
- `sbls-package-codec` owns only package transport: exact v1 ZIP/manifest,
  projection/bindings/hydration, the closed Disc/Case asset registry, raster
  validation, budgets, and stable package failures. It does not own hydrated
  schema semantics, migrations, editor state, lifecycle state, filesystem
  paths, or commands.
- `project_binary_io.rs` owns bounded native binary reading and the binary
  preflight/delegation seam into `project_file.rs`; `commands/project_files.rs`
  owns the raw Tauri request/response adapter, stable command failures, and
  canonical path-header decoding. `src/tauri/binaryProjectFile.ts` owns the
  matching dormant generic TypeScript port. `project_format_recognition.rs`
  owns fixed-buffer content recognition under the 256 MiB file limit, while
  `projectFileFormat.ts` owns the strict two-value recognition DTO.
  `commands/project_packages.rs` reuses the
  read request seam, borrows its archive bytes into `sbls-package-codec`, and
  moves only hydrated JSON into a raw response. `packageProjectFile.ts` owns the
  strict production frontend port; shared file failure shapes live in
  `projectFileFailure.ts`. None owns lifecycle or editor semantics.

Render path:

- Saved data is restored into hook/App state, then rendered by the normal preview components.

Edit/interaction path:

- Edits update runtime state first. Snapshots are produced only when saving.

Save/load path:

- Disc save uses `createProjectSnapshot`.
- Disc Open staging uses `parseSavedProjectContents`, project routing, and
  `restoreSavedProjectState`, completing background-image inspection and preset
  reconstruction before acceptance.
- Case-insert save uses `createCaseInsertProjectSnapshot`; Open staging uses the
  existing Case normalizer/restore owner and resolves branding slot state before
  acceptance.
- Successful Open establishes one session ID, exact selected path, matching
  normalized project/clean baseline, revision zero, and target editor route,
  then applies the complete staged Disc or Case editor aggregate in the same
  synchronous batch. Failed, cancelled, precondition-rejected, or stale Open
  applies no editor candidate.
- Tauri `write_project_file` preserves the existing command contract and routes
  opaque JSON bytes to `src-tauri/src/project_file.rs`, which owns exclusive
  adjacent-temp creation, write/flush/sync/close ordering, platform replacement,
  and safe owned-temp cleanup. `read_project_file` remains the JSON text read
  boundary. `write_binary_file` remains a separate direct binary writer.
- Dormant `read_binary_project_file` accepts an empty top-level raw body and
  returns raw bytes; dormant `write_binary_project_file` borrows the top-level
  raw request bytes and delegates them to the atomic writer. Both carry the
  path in a canonical percent-encoded UTF-8 header capped at 4 KiB, reject
  non-raw transport shapes, and enforce an exact 256 MiB file-byte ceiling.
- Production `recognize_project_file_format` accepts an empty raw body plus the
  canonical path header, rejects files whose handle metadata exceeds the 256
  MiB input cap, and distinguishes only an exact local-file ZIP signature from
  one optional UTF-8 BOM/JSON whitespace followed by `{`. Unknown content has a
  stable `project.format.unsupported` DTO; extensions are never inspected.
- Production `decode_project_package_file` accepts the same empty body and path
  header, reuses that exact bounded read owner, decodes in native Rust, drops
  package metadata, and returns raw hydrated JSON bytes. Its TypeScript port
  validates all file/package failures and the exact 671,096,832-byte static
  hydrated-response cap derived by the package contract.
- `stageProjectPackageOpen` strictly decodes UTF-8 and delegates to the same
  parse/migrate/normalize/route/restore/candidate-capture owner used by legacy
  staging. `stageAppProjectOpen` exposes `.sbls` and `.json`, recognizes first,
  dispatches without parser fallback, and remains mutation-free until the
  lifecycle owner commits the complete candidate.

Serialization:

- New application-connected Save/Save As files are `.sbls` package v1;
  `.json`/`.sbls.json` remain legacy imports.
- Imported image data is stored as data URLs where supported.
- Durable local source file paths are avoided through asset provenance helpers.
- The package-domain crate encodes/decodes bounded `.sbls` v1 bytes in memory;
  production package Save calls its borrowed-input encoder and production
  package Open calls its decoder.
- The dormant raw binary project-I/O port can move bounded opaque bytes to and
  from a path. Production package Open instead composes native read/decode so
  archive bytes never enter the WebView. Production package Save uses a
  separate narrow raw plan/project request and native encode/atomic-write
  composition; package output never enters the WebView.

Package-domain codec boundary:

- `lib.rs` exposes `encode_project_package` and `decode_project_package` plus
  owned public model, raster MIME, typed owner, and stable failure types.
- Encoding accepts one immutable normalized JSON byte snapshot, diagnostic
  creator metadata, and a complete typed in-memory capture plan. Decoding
  accepts only bytes and returns isolated hydrated JSON with package metadata
  held outside that JSON.
- `archive.rs` owns the direct strict ZIP32 Store writer and Store/Deflate
  reader; `json.rs` owns duplicate-key-rejecting bounded parsing and RFC 8785
  output; `manifest.rs`, `registry.rs`, `assets.rs`, `encode.rs`, and
  `decode.rs` own the exact package graph; `limits.rs` and `error.rs` own
  checked budgets and closed failures.
- Decoder inventory borrows archive names and compressed spans. Manifest entry
  bytes drop after parsing, native validation is sequential, retained encoded
  assets drop after hydration, the manifest transport graph drops before
  canonical output allocation, and the hydrated tree drops after
  serialization. A distinct 512 MiB Rust ledger charges the owned Store/Deflate
  entry buffer currently feeding hostile JSON parsing plus retained
  manifest/project roots, collection capacities, strings, keys, and number
  tokens; replacement growth is charged while old capacity remains live, and
  outstanding receipts roll back at the operation boundary. Hydration/output,
  raster/native work, caller archive bytes, and allocator-private metadata are
  outside that phase ledger. This is a lifetime/counter map, not a measured
  whole-process-memory claim. Source-level raw-transport copy analysis is
  recorded in the package contract; measured RSS and platform WebView copy
  behavior remain later native-runtime evidence.
- `raster.rs` structurally validates PNG, JPEG, WebP, GIF, and BMP, preserves
  exact accepted encoded bytes, and enforces dimension, animation, pixel,
  sample, metadata, record, and decoder-work budgets. JPEG and BMP use the
  finalized conservative v1 profiles; well-formed out-of-profile files use
  `project.package.asset-jpeg-profile-unsupported` or
  `project.package.asset-bmp-profile-unsupported`.
- `native.rs` is crate-private. Its Rust-consumed production surface validates
  JPEG and WebP bytes only and exposes no path, decoded output buffer, Tauri
  command, or lifecycle hook. The private static archive retains broader
  upstream, ledger/allocator, and test-probe link symbols; it is not described
  as a validation-only static-link namespace.
  Pinned libjpeg-turbo `3.1.4.1`
  (`ecae8008e2cc9ade2f2c1bb9d5e6d4fb73e7c433866a056bd82980741571a022`)
  and libwebp `1.6.0`
  (`e4ab7009bf0629fd11982d4c2aa83964cf244cffba7347ecd39019a9e38c4564`)
  archives, license/patent notices, source provenance, allocator overlays, and
  patch rationale are checked in under `vendor/`. The root `LICENSE` contains
  MIT text, while `README.md` says a license has not been chosen and the
  application manifest leaves `license` empty; this slice does not resolve that
  repository-level conflict. The child manifest currently declares
  `MIT AND BSD-3-Clause AND IJG`; checked-in upstream notices remain
  authoritative for the vendored sources.
- The package libjpeg configuration disables `JPEGMEM`/environment reads with
  `NO_GETENV`. A verified libwebp `cpu.h` overlay under
  `SBLS_WEBP_GENERIC_ONLY=1` forces the audited generic C path across compiler-
  and target-driven SIMD detection, including MSVC ARM families and MIPS.
  Windows x64 compilation is exercised; other Windows architectures and
  macOS/Linux remain source/configuration-reviewed pending an executed
  cross-target build matrix.
- The native allocation ledger rejects checked allocation/reallocation before
  exceeding 512 MiB, including a conservative still-live-old plus complete-new
  transient charge for `realloc`. It admits one active validator, contains JPEG
  fatal jumps in C, deterministically releases operation-owned allocations
  after success or failure, and returns closed statuses that Rust maps to typed
  package errors.
- Runtime dependencies are exact-pinned `base64 0.22.1`, `crc32fast 1.5.0`,
  `miniz_oxide 0.8.9` without default features, `ryu-js 1.0.2`, and
  `sha2 0.10.9`. Exact-pinned build dependencies are `cc 1.2.62`,
  `flate2 1.1.9` with its Rust backend, `sha2 0.10.9`, and `tar 0.4.44`.

Tests:

- `src/project/projectSchema.test.ts`
- `src/project/projectRouting.test.ts`
- `src/project/restoreProjectState.test.ts`
- `src/project/savedProjectNormalization.test.ts`
- `src/project/projectCaseInsert.test.ts`
- `src/project/projectCaseInsertStateHelpers.test.ts`
- `src/project/projectCaseInsertLegacy.test.ts`
- `src/project/projectCaseInsertArtworkSlots.test.ts`
- `src/project/projectCaseInsertAdditionalArtworkSlots.test.ts`
- `src/project/projectCaseInsertArtworkNormalization.test.ts`
- `src/project/projectCaseInsertBrandingSources.test.ts`
- `src/project/projectCaseInsertBrandingPersistence.test.ts`
- `src/project/projectCaseInsertPreviewTextEditing.test.ts`
- `src/project/projectCaseInsertPreviewTextControls.test.ts`
- Rust unit and real-filesystem coverage is colocated in
  `src-tauri/src/project_file.rs`, including Windows replace-existing and
  replacement-failure tests.
- Focused Rust tests cover bounded reader limits and allocation failure,
  partial/interrupted reads, operation isolation, binary writer delegation,
  raw command contracts, package-write framing, canonical path decoding, exact
  failure mapping, real Disc/Case package encode-write-decode, exact-byte
  deduplication, borrowed input/native-owned output, legacy source aliases and
  commit-boundary races, every package failure DTO, file-before-codec
  precedence, concurrent package requests, and command registration.
  TypeScript tests cover the closed capture plan, built-in registry bytes and
  digests, raw request/response identity, bounds, all 27 package failures,
  strict unsafe-shape rejection, Save routing/adoption/concurrent edits,
  canonical Unicode paths, strict UTF-8, native recognition and misleading
  suffix dispatch, current/migrated and representative full Disc, Case cover,
  tray and both spines, hydrated and disabled remembered assets, immutability,
  shared schema taxonomy, lifecycle identity, and direct-Save eligibility.
- Pure package-codec unit, security, independent-fixture, public-facade
  round-trip, and native allocation fault-injection tests are colocated under
  `src-tauri/crates/sbls-package-codec/src/` and run through the registered
  Cargo test command after the repository's Node tests. `conformance_tests.rs`
  covers deterministic exact current-schema Disc and all-four-surface Case
  encode-to-decode across all five raster families, older-schema hydration
  without codec-owned migration, mutation isolation, and an independently
  built valid Store package whose bytes match the public writer and decode
  through the public reader. At this checkpoint the Rust `1.77.2` full crate
  suite passes `241/241`, including focused raster `23/23` and native `7/7`.
- `src/project/projectCaseInsertTextPersistence.test.ts`
- `src/project/projectCaseInsertTextNormalization.test.ts`
- `src/diagnostics/projectParityHarness.test.ts`
- `src/diagnostics/projectParityHarnessDisc.test.ts`
- `src/diagnostics/projectParityHarnessCaseInsert.test.ts`
- Feature-specific project tests for title artwork, additional artwork, logos, media marks, rating badges, technical marks, visual asset import, and metadata-bound disc text.

Risks:

- Schema validation is shallow compared with the number of nested editor states.
- Migration support currently contains only the explicit `0.1.0` to `0.2.0`
  compatibility step.
- Closed issue `#48` established the current schema-validation/migration
  baseline; future schema changes remain owned by `PROJECT_FILE_SPEC.md`.
- Production `.sbls` Open/Save/Save As, content recognition, native
  read/decode and encode/write composition, legacy conversion, session format
  adoption, exact baseline integration, dirty-aware replacement, Home
  Return/Resume, exact route retention, and shared feedback are source-connected.
  Native Tauri workflow acceptance remains absent.

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
- `src/presets/discPresetDefinition.ts`
- `src/presets/discPresetResolution.ts`
- `src/presets/discPresetOwnerPlacement.ts`
- `src/presets/discPresetPlacementAdapters.ts`
- `src/presets/discPresetApplication.ts`
- `src/presets/discPresetTargetedApplication.ts`
- `src/presets/fitVisualBoundsToDiscPresetRegion.ts`
- `src/presets/adapters/discPointPresetAdapters.ts`
- `src/presets/adapters/discTextPresetAdapters.ts`
- `src/presets/adapters/discBackgroundPresetAdapter.ts`
- `src/presets/adapters/discPlatformMarksPresetAdapter.ts`
- `src/presets/discPresetProductionAdapterRegistry.ts`
- `src/presets/discPresetRegistry.ts`
- `src/presets/builtins/classicTopTitleDiscPreset.ts`
- `src/guidedPresets/discGuidedLayouts.ts`
- `src/guidedPresets/discGuidedCompletion.ts`
- `src/guidedPresets/discGuidedSlotState.ts`
- `src/guidedPresets/discGuidedRestoreItems.ts`
- `src/guidedPresets/discGuidedWorkflow.ts`
- `src/hooks/useDiscGuidedPlaceholderPreview.ts`
- `src/project/projectGuidedWorkflow.ts`
- `src/project/projectGuidedRestoreLayout.ts`
- `src/app/appRegisteredDiscPresetApplication.ts`
- `src/app/appProjectRestore.ts`
- `src/app/appDiscRolePresetApplication.ts`
- `src/app/appActiveDiscPresetBackground.ts`
- `src/app/appActiveDiscPresetPointOwners.ts`
- `src/app/appActiveDiscPresetTitleText.ts`
- `src/app/appActiveDiscPresetPlatformMarks.ts`
- `src/app/appActiveDiscPresetLegalText.ts`
- `src/hooks/useActiveDiscPreset.ts`
- `src/render/ratingBadgeRenderModel.ts`
- `src/render/mediaMarkRenderModel.ts`
- `src/project/projectTitleArtwork.ts`
- `src/project/projectLogoAssets.ts`

Source-of-truth state:

- Runtime state is split between `App.tsx` and disc feature hooks.
- Persisted state is `SavedDiscProject` in `src/project/projectTypes.ts`.
- Reusable Disc preset layout contracts are immutable, JSON-compatible
  definitions under `src/presets/`; they contain no project content or enabled
  state. Template resolution produces transient nominal/resolved slot geometry
  with structured warnings. A trusted semantic adapter registry and pure
  application-plan builder provide deterministic partial/rejected planning
  without dynamic state paths or runtime side effects. Focused concrete adapters
  emit placement-only typed updates for point, straight-text, and centered
  Background targets while preserving owner enablement and payload. The strict
  size-policy parser accepts fixed scale or one JSON-compatible
  `contain-region` contract and rejects unknown fields, invalid optionals, the
  retired `fit-region` spelling, and unsupported future modes.
  `fitVisualBoundsToDiscPresetRegion.ts` owns the pure normalized
  aspect-preserving calculations. Its rectangle helper owns the Classic
  limiting-axis/cap classification, anchor-offset compensation, exact fitted
  bounds, and full resolved-rectangle containment; Classic adapters do not apply
  a second safe-annulus/center-hole shrink or post-fit clamp. Its older region
  composition remains as a separately tested legacy-compatible
  annulus/inner-hole calculation. Focused providers in
  `projectTitleArtwork.ts`, `projectLogoAssets.ts`,
  `ratingBadgeRenderModel.ts`, and `mediaMarkRenderModel.ts` expose the same
  canonical bounds used by preview/export truth. Supplemental
  USK and additional logos are excluded; primary Developer/Publisher built-in
  fallback placeholders supply renderable manifest bounds and follow the same
  fit. Truly dimensionless point owners seed the resolved center while
  preserving scale and fit on the first valid bounds. The OS group adapter
  delegates resolved-region geometry to
  `src/layout/groupedPlatformMarkPlacement.ts` and emits stable
  platform-mark-identity layout updates without replacing owner state. Preset
  contain mode evaluates centered one/two-row candidates and selects the largest
  valid common scale after reserving fixed gaps, with rectangle-boundary and
  no-overlap safety. The resolved preset rectangle is authoritative and the
  legacy non-preset annulus-aware offset path remains available. The production
  registry covers all Classic targets. Classic guided geometry and real owner
  placement now derive from the same canonical built-in definition.
  `appRegisteredDiscPresetApplication.ts` owns the focused immutable owner
  snapshot, generic resolution/planning call, exhaustive typed update
  translation, and updated-owner list. `appDiscRolePresetApplication.ts`
  dispatches each touched owner family once without Classic's legacy broad
  post-clamp behavior. `discPresetTargetedApplication.ts` owns exact
  ID/revision and one-target resolution with structured fail-closed outcomes.
  Content-aware adapters may return one validated resolved-slot patch;
  application merges it without changing nominal geometry or slot order.
  Title and Legal fitting use app-injected browser-canvas measurement while the
  pure engine remains browser-free. Title uses canonical straight-SVG paint
  bounds whose shared stroke, directional-shadow, italic-overhang, and box
  constants also drive rendering. It persists a paint-safe wrap width and
  compensating anchor so painted content remains centered, and paint-geometry
  style changes target-refit it. Title otherwise retains its template-aware
  preferred size, 8pt minimum, and 0.25pt steps without border-seeking
  enlargement. Legal retains its 7pt/3pt/0.25pt policy while containing its
  complete rendered box and paint bounds. Both text fits use the exact resolved rectangle and receive no second
  annulus/hole reduction. Classic Background derives content-aware full-disc
  source draw bounds at scale one, then uses the shared rectangular contain
  primitive and zero pixel offset; it stops at the first limiting X or Y edge
  rather than covering/cropping the resolved slot. Legacy cover intents remain
  supported for other presets.
  `useActiveDiscPreset.ts` owns the non-persisted canonical active ID/revision
  and latest resolved runtime definition. Guided projection consumes that
  resolved definition and suppresses unsupported slots.
  `discGuidedWorkflow.ts` separately owns active guided layout identity/version
  and independent canonical omission/completion transitions. Schema `0.2.0`
  snapshots only that compact workflow through `projectGuidedWorkflow.ts`;
  progress controls never mutate feature owners. The focused completion service
  records slot IDs only from explicit owner actions, while new/different layout
  activation seeds currently satisfied slots once; no reactive effect watches
  owner state. The Layout Presets panel projects canonical Removed and Completed
  item view models plus one reset action with deterministic focus restoration.
  Contain-fit never reads or mutates completion, omission, or navigation state;
  Guided Progress and focus actions never mutate fitted owner placement.
  Disc project restoration reconstructs the transient canonical active preset
  from the explicit layout-to-preset mapping after restored template and owner
  state are available. It resolves/refines geometry without dispatching owner
  updates, keeping late point-owner/Title fitting, OS grouping, and Legal
  refitting active after load.
  `appActiveDiscPresetBackground.ts` and `useBackgroundImage.ts` compose a first
  or replacement image and retained-image enablement with the exact Background
  adapter before one owner-state commit; direct scale/offset edits stay manual.
  `appActiveDiscPresetPointOwners.ts` and the affected feature hooks compose
  first/replacement assets and semantic bounds changes with one exact targeted
  contain application before one owner-state commit. Direct x/y/scale edits do
  not refit. `appActiveDiscPresetTitleText.ts` and `useDiscTextState.ts` apply
  the same boundary to canonical Title content and fit-geometry-relevant style
  changes while leaving direct layout edits alone.
  `appActiveDiscPresetPlatformMarks.ts` and `usePlatformMarksState.ts` compose
  late OS eligibility/bounds changes with only the production OS adapter before
  the final owner-state commit; layout x/y/scale updates do not recurse.
  `appActiveDiscPresetLegalText.ts` and `useDiscTextState.ts` do the same for
  Legal enablement, canonical content, and fit-geometry-relevant styles while
  leaving direct Legal layout edits alone.
  `discRolePresets.ts` retains Classic menu metadata only; Centered Logo Archive
  and Clean Metadata Footer remain on the transitional legacy path.

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
- Open staging: `parseSavedProjectContents`, project routing, and
  `restoreSavedProjectState`.

Export path:

- Preflight: `buildExportPreflightSummary` and `buildDiscExportWarnings`.
- Design check: `buildDiscDesignCheckSummary`.
- PNG: `exportDiscLabelPngBytes`, with canvas drawing helpers for each visual layer and optional guide drawing.

Tests:

- `src/presets/discPresetDefinition.test.ts` covers strict `contain-region`
  parsing/round trips and rejection of malformed, unknown, and retired policy
  shapes.
- `src/presets/fitVisualBoundsToDiscPresetRegion.test.ts` covers wide, tall,
  square, capped/inset, anchor-offset, determinism, immutability, and
  limiting-axis rectangular cases plus retained legacy annulus/inner-hole cases.
- `src/presets/adapters/discPointPresetAdapters.test.ts` and
  `src/app/appActiveDiscPresetPointOwners.test.ts` cover focused canonical
  point-owner updates, dormant seeding, semantic targeted refits, and
  non-placement preservation; `src/app/appRegisteredDiscPresetApplication.test.ts`
  covers Classic integration.
- `src/project/projectTitleArtwork.test.ts`,
  `src/project/projectLogoAssets.test.ts`,
  `src/project/projectRatingBadge.test.ts`, and
  `src/project/projectMediaMark.test.ts` cover the target-specific canonical
  bounds inputs and primary/supplemental exclusions.
- `src/presets/adapters/discBackgroundPresetAdapter.test.ts` and
  `src/app/appActiveDiscPresetBackground.test.ts` cover Classic rectangular
  contain, retained legacy cover, and focused semantic Background refitting.
- `src/layout/groupedPlatformMarkPlacement.test.ts` covers strict centered
  contain grouping separately from the retained legacy non-preset behavior.
- `src/presets/adapters/discTextPresetAdapters.test.ts` and
  `src/app/appActiveDiscPresetTitleText.test.ts` cover template-aware Title
  fitting and Legal regression behavior.
- `src/hooks/activeDiscPresetSemanticRefitWiring.test.ts` guards semantic
  point/text trigger routing, manual-layout bypasses, supplemental/additional
  exclusions, and effect-loop isolation.
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
- Focused cover/tray action modules own image-slot, logo, Steam banner, and
  text-list transitions. Focused spine action modules own spine image-slot,
  logo, Steam banner, and text transitions.

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
- Presentational template/spine control files render grouped sidebar sections
  and call hook/domain callbacks. They do not own source-slot meaning, layout
  math, save/load behavior, or export behavior.
- Preview dragging flows through `useCaseInsertPreviewPointerDrag`.

Save/load path:

- Save: `createCaseInsertProjectSnapshot`.
- Open staging: `normalizeSavedCaseInsertProject` and
  `restoreCaseInsertProjectState`.
- Normalization fills sparse or legacy-shaped case insert state.

Export path:

- Preflight: `buildCaseInsertExportPreflightSummary` and `buildCaseInsertExportWarnings`.
- Design check: `buildCaseInsertDesignCheckSummary`.
- PNG: `exportCaseInsertPngBytes`, which draws surface base, backgrounds, artwork, Steam banner, slot groups, text, spine content, and export guides.
  Template layer drawing, image-slot drawing, and text drawing are delegated to
  `caseInsertTemplateExportLayers.ts`, `caseInsertPngImage.ts`, and
  `caseInsertPngText.ts`.

Tests:

- `src/caseInsert/*.test.ts`
- `src/export/caseInsertDesignCheck.test.ts`
- `src/export/caseInsertExportPreflight.test.ts`
- `src/export/drawCaseInsertSteamBanner.test.ts`
- `src/layout/caseInsertPreviewLayout.test.ts`
- `src/layout/caseInsertPreviewGuideLayout.test.ts`
- `src/layout/caseInsertTextVisualLayout.test.ts`
- `src/layout/caseInsertTextBounds.test.ts`
- `src/layout/caseInsertTextMeasurement.test.ts`
- `src/layout/caseInsertTextSegments.test.ts`
- `src/layout/caseInsertTextWrapping.test.ts`
- `src/layout/caseInsertTextRichWrapping.test.ts`
- `src/layout/jewelCaseBackLayout.test.ts`
- `src/layout/jewelCaseBackTextLayout.test.ts`
- `src/layout/jewelCaseBackTextAvoidanceLayout.test.ts`
- `src/layout/jewelCaseLayout.test.ts`
- `src/layout/jewelCaseSpineLayout.test.ts`
- `src/layout/jewelCaseSpineTextLayout.test.ts`
- `src/layout/jewelCaseSpineTransform.test.ts`
- `src/layout/jewelCaseSteamBannerLayout.test.ts`
- Focused action tests under `src/caseInsert/templateSurface*.test.ts` and
  `src/caseInsert/jewelCaseSpine*.test.ts`.

Risks:

- `useCaseInsertTemplateEditor.ts`, `useJewelCaseSpineEditor.ts`, and
  `useCaseInsertBrandingMarkSync.ts` remain central, but the current measured
  sizes are about 1013, 950, and 1124 lines respectively after helper
  extraction.
- `exportCaseInsertPng.ts` is around 332 lines after delegating template layer,
  image, and text drawing helpers. It remains layer-order sensitive.
- Open issues `#126` and `#149` indicate case insert parity and structured layout work is still active.

## Text Systems

Purpose: manage disc text, case insert text, metadata-bound values, inline preview editing, readability, and canvas/SVG export.

Key files:

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
- `src/caseInsert/previewTextRichText.ts`
- `src/text/contextualTextControlViewModel.ts`
- `src/text/htmlText.ts`
- `src/text/htmlEntities.ts`
- `src/text/htmlInlineStyles.ts`
- `src/text/htmlTags.ts`
- `src/text/richTextRunRanges.ts`
- `src/text/richTextSelectionRanges.ts`
- `src/text/richTextListKeyboard.ts`
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
- `InlinePreviewTextEditor.tsx` remains the stateful editor shell. Extracted
  preview-owned modules own text geometry, selection frames, canvas overlays,
  move ring presentation, native textarea presentation, ribbon presentation,
  menu content, and point/color control rendering.
- `richTextCommands.ts` remains command orchestration. Text-owned helpers own
  run-range transforms, selection ranges, list keyboard behavior, and HTML
  entity/style/tag parsing. These helpers are not broad string utilities.

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
  Its controls preserve fixed row heights instead of wrapping downward and
  moving the editable surface; horizontal sizing is handled by semantic-card
  sizing and compact affordances, not by reintroducing the old floating-menu
  layout behavior. Ribbon semantic boxes are packed column-first, and every box
  in one column must match the widest box in that column. Column-first packing
  fills available lower fixed-row slots before opening a new column; a later
  one-row box must not move to the next column while usable space remains below
  the previous one-row box. Utilities uses this same ownership split: Position
  and Layout render as semantic cards in the ribbon, while their values and
  handlers remain owned by the active case/disc adapter. The ribbon must not
  take ownership of text
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
  sidebar retains setup/type controls. Metadata/default status and manual
  override restoration are exposed by the contextual ribbon Utilities `Source`
  card for selected metadata-backed text.
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
- `src/components/preview/discInlineTextEditorCurvedControls.test.ts`
- `src/components/preview/inlinePreviewTextEditor*.test.ts`
- `src/text/contextualTextControlViewModel.test.ts`
- `src/text/richTextRunStyle.test.ts`
- `src/text/richTextRunRanges.test.ts`
- `src/text/richTextSelectionRanges.test.ts`
- `src/text/richTextListKeyboard.test.ts`
- `src/text/htmlEntities.test.ts`
- `src/text/htmlInlineStyles.test.ts`
- `src/text/htmlTags.test.ts`
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
- `src/render/artworkFrameTestGeometry.ts`
- `src/components/preview/ContentBoundedImage.tsx`
- `src/components/preview/ArtworkFrameOverlay.tsx`
- `src/export/drawTitleArtwork.ts`
- `src/export/drawAdditionalArtwork.ts`
- `src/export/drawArtworkFrame.ts`
- `src/caseInsert/imageSlotTransitions.ts`
- `src/caseInsert/imageSlotSourceImport.ts`
- `src/caseInsert/imageSlotSourceApply.ts`
- `src/steam/steamLogoCandidates.ts`
- `src/steam/steamLogoCandidateTypes.ts`
- `src/steam/steamLogoCandidateUrls.ts`
- `src/steam/steamLogoCandidateRouting.ts`
- `src/steam/steamLogoCandidateSignals.ts`
- `src/steam/steamLogoCandidateScoring.ts`
- `src/steam/steamOfficialSiteCss.ts`
- `src/steam/steamOfficialSiteHtml.ts`

Source-of-truth state:

- Disc background, title, and additional artwork each have focused hook/domain state.
- Case insert image slots are nested in `ProjectJewelCaseState` and updated through case insert transition helpers.
- Asset provenance and source labels are centralized in `src/project/projectAssetStatus.ts`.

Render path:

- Preview components render content-bounded image layers and optional frames.
- Case insert preview renders image slots through template and spine layers.

Edit/interaction path:

- Upload, Steam artwork, local Steam screenshots, web artwork, reset, clear, fit, layout, and frame controls call hook or transition helpers.
- Steam and official-site logo/artwork candidate discovery routes through
  Steam-owned URL, routing, signal, scoring, CSS, and HTML helper modules while
  `steamLogoCandidates.ts` remains the public orchestration entry.
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
- `src/steam/steamLogoCandidateRouting.test.ts`
- `src/steam/steamLogoCandidateSignals.test.ts`
- `src/steam/steamOfficialSiteCss.test.ts`
- `src/steam/steamOfficialSiteHtml.test.ts`
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
- `src/caseInsert/brandingMarkTargetSources.ts`
- `src/caseInsert/brandingMarkTargetSourcesFixtures.ts`
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
- `brandingMarkTargetSources.ts` owns target-source projection helpers for
  mark families. Primary/additional assets and mark-family identities remain
  explicit rather than collapsed into one generic slot model.
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
- `src/project/projectPlatformMarks.test.ts`
- `src/project/projectTechnicalMarks.test.ts`
- `src/render/platformMarkRenderModel.test.ts`
- `src/render/technicalMarkRenderModel.test.ts`
- `src/caseInsert/brandingLogoSlots.test.ts`
- `src/caseInsert/brandingMarkTargetSources.test.ts`
- `src/caseInsert/brandingTargetMarkSlots.test.ts`
- `src/caseInsert/brandingSupplementalUsk.test.ts`
- `src/caseInsert/brandingCustomImageSync.test.ts`
- `src/caseInsert/brandingCustomImageRestore.test.ts`
- `src/caseInsert/brandingTechnicalCustomImageSync.test.ts`
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
  minimum 48px width for Fit calculations, normally collapses to a slim
  right-edge hover/focus handle, and expands its full control panel only while
  hovered or keyboard-focused. Its controls may grow continuously from 24px to
  48px only into residual unused horizontal gutter. The expanded rail width is
  not fed back into the same Fit calculation pass, so rail growth or collapse
  cannot reduce the fit scale or move the fitted surface. The viewport spans
  behind the preview header so zoomed/panned content can use empty header space,
  but the fitted stage keeps the header-height top inset and the header/ribbon
  controls remain above the transformed preview. Design Check and Guide Legend
  controls remain outside the transformed stage. The
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
- `src/export/caseInsertPreflightImageWarnings.ts`
- `src/export/caseInsertPreflightVisibility.ts`
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
- `src/export/caseInsertPreflightImageWarnings.test.ts`
- `src/export/caseInsertPreflightVisibility.test.ts`
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
- `src/export/caseInsertTemplateExportLayers.ts`
- `src/export/caseInsertPngImage.ts`
- `src/export/caseInsertPngText.ts`
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
  Template surface layers, image drawing, and text drawing are delegated to
  focused case-insert export helpers.

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
- `src/export/caseInsertPreflightImageWarnings.test.ts`
- `src/export/caseInsertPreflightVisibility.test.ts`

Risks:

- DOM preview and canvas export are distinct renderers.
- Case insert export is smaller after helper extraction, but it remains tightly
  coupled to text, slot, branding, and spine layer order.
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
- Case insert branding slots/visibility, target-source projection, custom image
  sync/restore, export guide options, Steam back-cover import, image-slot
  source import/application, text readability, title artwork, sidebar workflow,
  action modules, and back-cover copy fitting.
- Export preflight, design checks, canvas image helpers, Steam banner drawing, rating/mark drawing, and warning helpers.
- Drag geometry.
- Disc and jewel-case layout helpers.
- Strict Disc preset size-policy parsing, canonical point-owner contain fitting,
  rectangle-authoritative Classic placement, retained legacy
  safe-annulus/inner-hole geometry, semantic targeted refits, centered OS
  fixed-gap common-scale grouping, and template-aware Title/Legal text fitting.
- Project schema, routing, restoration, normalization, and feature-specific serialization helpers.
- The runtime-connected application lifecycle composition root, state store,
  command registry/dispatcher, busy coordinator, typed command ports,
  implementation-aware capabilities, complete Disc/Case synchronization,
  canonical dirty derivation, lifecycle-owned Save adoption, shared replacement
  guard, New owners, two-phase Open staging, CAS, atomic editor application,
  exact session-only route synchronization, Return/Resume owners, shared
  command feedback, dependency freshness, and current lifecycle-control
  routing; plus the runtime-disconnected application
  menu descriptor, semantic-target, platform/capability projection, and
  in-memory port boundary.
- The dormant binary project-file TypeScript port's raw-byte transport,
  canonical path header, exact byte cap, structured error preservation, and
  negative production-wiring boundary.
- The production recognition/package command/port/staging path's native-owned
  bounded inspection/read/decode, exhaustive recognition/file/package DTO
  validation, raw hydrated-response ownership, strict UTF-8, content-based
  dispatch, shared Disc/Case staging, immutability, and lifecycle identity.
- Shared project parity harness diagnostics for representative disc and case
  insert runtime/saved/restored/export inputs, including split disc and case
  insert parity suites.
- Render models for artwork frames, image render artifacts, platform marks, and technical marks.
- Template models and case insert templates.

Unknowns:

- There is no evidence in `package.json` of an end-to-end Playwright test command.
- Runtime Tauri behavior, file dialogs, native network commands, drag behavior, and actual PNG pixel output were not verified here.

## Known Fragile Areas Visible From Code, Tests, Docs, and Issues

- `App.tsx` remains a large orchestration component and owns many cross-feature flows.
- Case insert editor hooks and export are large and centralize many behaviors.
- Project schema migration support currently contains only the explicit
  `0.1.0` to `0.2.0` compatibility step.
- Preview and export rendering are separate paths for both disc and case insert editors.
- Inline preview text editing depends on DOM measurement, caret math, wrapped text behavior, and CSS.
- Case insert parity is active work, especially tray/spine structured layout and alpha finish-line work.
- CSS ownership remains a known risk, with open issue `#46`.
- Optional visual feature behavior must preserve disabled state without rendering/exporting disabled features.
- Built-in mark/logo/rating catalogs are centralized but incomplete by open issue.
- Current documentation refresh began from a clean `main` checkout at
  `6feb262bed2abd36b1371e5c0674013018132d16`; any later dirty worktree state
  should be reviewed before release claims.

## Validation

No docs-specific validation command is defined. Documentation-only changes
should still run the normal validation set when practical:

- `npm run check:cycles`
- `npm run lint`
- `npm run test`
- `npm run build`

Package-codec and native project-file changes additionally use the
workspace-aware Rust checks:

- `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`
- `cargo check --manifest-path src-tauri/Cargo.toml --workspace --all-targets --locked`
- `cargo test --manifest-path src-tauri/Cargo.toml --workspace --locked --jobs 1`
- `cargo clippy --manifest-path src-tauri/Cargo.toml --workspace --all-targets --locked -- -D warnings`
