# Test discovery and migration oracles

> Status: Current validation reference for #370.
> Scope: Automatically discovered Node tests and native application/codec tests.
> Baseline: canonical main `2dd921ea`, plus #305 and this focused test-infrastructure change.
> Runtime evidence: none; browser component tests are diagnostic contract checks.

## Authoritative commands

- `npm test`: discovers every supported `*.test.{js,mjs,cjs,ts,mts,cts}` under `scripts/` and `src/`, runs sorted batches of 40 with Node type stripping, then the native commands in `scripts/test-file-list.mjs`. Failed batches do not suppress later batches. Any failing phase makes the command fail.
- `node scripts/run-tests.mjs --node-only`: the same complete discovered Node suite.
- `node scripts/run-tests.mjs --rust-only`: the registered native commands.
- `node scripts/run-tests.mjs --list`: exact selected Node files, one per line.
- `node --test scripts/test-discovery.test.mjs`: discovery/runner agreement, new nested tests, unsupported extensions, and invocation from another directory.

The discovery owner is `scripts/discover-tests.mjs`. It scans only the two source/test roots, does not follow symlinks, and fails on unsupported test extensions rather than silently omitting them. All paths are repository-relative and sorted; execution uses the repository root. There is no hand-maintained Node test registry. New test locations outside these roots need a deliberate discovery-contract update.

The prior registry had 346 entries and omitted `src/steam/steamMetadataCandidates.test.ts`. Those nine tests now run by construction. The checkout-path-dependent Case aggregate golden fixture now pins four banner image data URLs. The existing exact digest grammar, clone/order equivalence, immutability and active-viewport tests remain; production digest code is unchanged.

A fresh Windows checkout also revealed 14 built-in SVG byte mismatches caused by
Git CRLF conversion. `.gitattributes` now preserves the published LF asset bytes
on every platform. Registry digests and checked-in artwork content are unchanged;
the existing raw-byte registry oracle continues to verify them.

## Behavioral oracles to preserve during migration

| Contract | Existing test owners | What must remain true |
| --- | --- | --- |
| Schema and legacy compatibility | `src/project/projectSchema*.test.ts`, `projectCaseInsert*.test.ts`, `restoreProject*.test.ts`, `src/diagnostics/projectParityHarness*.test.ts` | Legacy normalization, disabled state and uploaded assets survive round trips. |
| Session/revision/dirty semantics | `src/lifecycle/projectSession*.test.ts`, `canonicalProject*.test.ts`, `applicationLifecycleStateStore*.test.ts` | One authoritative session; saved revision R never marks R+1 clean. |
| Open/Save/replacement isolation | `src/app/appProject*Command.test.ts`, `appProjectLoad.test.ts`, `appProjectPackageLoad.test.ts`, `appProjectReplacementGuard.test.ts`, `appWorkspaceNavigationCommand.test.ts` | Cancel/failure does not partially adopt data; staged Open and Save identity remain checked. |
| Package codec and native destination safety | `src-tauri/crates/sbls-package-codec` tests, `src-tauri/src/project_file.rs` tests, `src/tauri/*test.ts`, built-in registry tests | Exact archive/image budgets, hostile-input rejection, binary portability and failure-safe replacement. The native runner tests the full workspace, including Windows filesystem cases. |
| Render inputs and export parity | `src/render/caseInsertArtworkViewportRenderArtifact.test.ts`, `src/export/*test.ts`, project parity harnesses | Shared resolved geometry, clipping, visibility and layer order; native image comparison remains necessary. |
| Text and selection | `src/text/*test.ts`, `src/discText/*test.ts`, `src/components/preview/inlinePreviewTextEditor*.test.ts` | Rich runs, whitespace, lists, caret/selection, curved text and rotated spines survive. |
| Geometry and viewport | `src/templates/*test.ts`, `src/layout/*test.ts`, `src/interaction/*test.ts`, `previewViewportModel.test.ts` | Physical bounds/clamping and transformed pointer math stay equivalent; viewport never changes export coordinates. |
| Active-pixel images | `src/image/imageContentBounds.test.ts`, `imageContentShape.test.ts`, `src/export/canvasImage.test.ts` | Exact uncropped bounds, proportional explicit crops, transparent padding and empty content. |
| Preset transactions/identity | `src/presets/*test.ts`, `src/caseInsert/presetAggregateIdentity.test.ts`, `src/lifecycle/caseInsertPresetSession*.test.ts` | Checked atomic adoption, complete-domain identity, compatibility and deterministic field ownership. |
| Continuous edits (preserved local stack) | `src/interaction/caseInsertContinuousEdit*.test.ts`, command flush tests in local `86c2342b` | Draft scheduling plus final complete commit before Save/replacement/Home/export. These local tests are not yet on canonical main and must be discovered when that stack is integrated. |

Use the full discovered suite for migration slices; a narrow rerun is diagnostic, not a replacement for the full gate. GUI/window, OS focus/DPI, physical printing and packaged-platform acceptance remain outside these automated oracles. AGENTS.md controls explicit native authorization.

## File-reading test inventory

This inventory covers all **98** discovered tests importing/using `readFile` or `readFileSync` at this baseline, including five fixture/asset readers that are not source-string checks. Classification applies to their file-reading assertions; mixed files retain all their behavioral tests too.

- **BEHAVIORAL_ORACLE**: reads input/output fixture or asset bytes and checks observable results.
- **ARCHITECTURE_BOUNDARY**: intentionally retains static checks for domain ownership, adapter wiring, transaction purity, renderer authority, bounded allocation, or native-port separation. Update spelling when an approved ownership boundary moves; preserve the boundary.
- **STRUCTURAL_IMPLEMENTATION_CHECK**: temporary JSX/CSS/import/file-shape checks. Keep them now; when their owner is refactored, replace them with mounted behavior or an explicit boundary assertion before removing the old spelling assertion. They do not certify visual correctness.

No test is deleted or disabled in this change. A change to a structural assertion requires evidence for the behavior it protected; a passing regex is not runtime acceptance.

| Test file | File-reading assertion class |
| --- | --- |
| `scripts/text-editor-smoke-geometry.test.mjs` | `BEHAVIORAL_ORACLE` |
| `src/app/appActiveDiscPresetLegalText.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/app/appActiveDiscPresetPlatformMarks.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/app/appActiveDiscPresetPointOwners.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/app/appActiveDiscPresetTitleText.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/app/appCaseInsertPresetWorkflow.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/app/appDiscRolePresetApplication.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/app/appProjectLoad.test.ts` | `BEHAVIORAL_ORACLE` |
| `src/app/appProjectPackageLoad.test.ts` | `BEHAVIORAL_ORACLE` |
| `src/app/appRegisteredDiscPresetApplication.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/app/applicationProjectOpenWiring.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/applicationMenu/applicationMenuWorkflowRouting.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/caseInsert/presetAggregateIdentity.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/caseInsert/textSidebarMigration.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/caseInsert/CaseInsertEditorShell.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/caseInsert/CaseInsertLayoutPresetsPanel.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/editor/ApplicationWorkflowHost.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/DiscAdditionalArtworkItemControls.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/DiscAdditionalArtworkRoleControls.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/DiscBackgroundArtworkRoleControls.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/DiscCompanyLogosRoleControls.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/DiscEditorNavigationRolePanel.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/DiscFixedTextRoleControls.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/DiscGameInfoLogoRoleControls.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/DiscGameTitleRoleControls.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/EditorNavigationShell.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/editor/EditorPanel.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/editor/EditorRoleFocusProvider.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/editor/editorNavigationShellViewModel.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/editor/editorPanelClasses.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/preview/DiscGuidedPlaceholderActions.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/preview/DiscGuidedPlaceholderOverlay.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/preview/DiscGuidedPlaceholderStyling.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/preview/contextualTextRibbonHtmlTab.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/preview/contextualTextRibbonLayout.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/preview/contextualTextRibbonModel.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/preview/contextualTextRibbonSizing.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/preview/contextualTextRibbonTabs.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/preview/contextualTextRibbonTextControls.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/preview/contextualTextRibbonVisualControls.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/preview/inlinePreviewTextEditorRendererContract.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/preview/previewViewportModel.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/project/ProjectReplacementDialog.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/components/sidebar/DiscLayoutPresetsPanel.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/components/sidebar/ImageCandidatePicker.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/diagnostics/textEditorContract.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/discText/textSidebarMigration.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/editor/discPresetScaleControlRange.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/editor/editorNavigationShell.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/editor/editorRoleFocus.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/editor/editorRoleFocusController.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/editor/editorRoleFocusScrollAlignment.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/editor/optionalVisualShellAdoption.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/export/drawRatingBadge.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/guidedPresets/discGuidedCompletion.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/guidedPresets/discGuidedLayouts.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/guidedPresets/discGuidedPlaceholderSetup.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/guidedPresets/discGuidedPlaceholderViewModel.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/guidedPresets/discGuidedRestoreItems.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/guidedPresets/discGuidedSlots.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/guidedPresets/discGuidedWorkflow.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/hooks/activeDiscPresetSemanticRefitWiring.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/hooks/useDiscGuidedPlaceholderPreview.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/interaction/textMoveHandleDrag.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/layout/groupedPlatformMarkPlacement.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/lifecycle/caseInsertPresetSessionApplication.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/lifecycle/caseInsertPresetSessionApplicationCommand.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/lifecycle/caseInsertPresetSessionApplicationCommit.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/package/projectPackageBuiltInRegistryV1.test.ts` | `BEHAVIORAL_ORACLE` |
| `src/presets/adapters/discBackgroundPresetAdapter.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/adapters/discPlatformMarksPresetAdapter.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/builtins/classicTopTitleDiscPreset.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/presets/caseInsertPresetApplicationAdoptionTransition.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetAppliedConfiguration.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetApplyPlanning.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetApplyTransition.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetAssignmentResolution.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetCatalog.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/presets/caseInsertPresetCompatibility.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetConfigurationAdoptionModel.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetDefinition.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetDetachPlanning.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetDetachTransition.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetReapplyPlanning.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/caseInsertPresetReapplyTransition.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/discPresetApplication.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/discPresetDefinition.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/discPresetProductionAdapterRegistry.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/discPresetRegistry.test.ts` | `STRUCTURAL_IMPLEMENTATION_CHECK` |
| `src/presets/discPresetTargetedApplication.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/presets/fitVisualBoundsToDiscPresetRegion.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/project/caseInsertPresetProjectPersistence.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/project/projectGuidedWorkflow.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/project/restoreProjectState.test.ts` | `BEHAVIORAL_ORACLE` |
| `src/render/caseInsertArtworkViewportRenderArtifact.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/tauri/binaryProjectFile.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/tauri/packageProjectFile.test.ts` | `ARCHITECTURE_BOUNDARY` |
| `src/tauri/projectPackageWrite.test.ts` | `ARCHITECTURE_BOUNDARY` |

To refresh the inventory, scan the automatically discovered suite for `readFile`/`readFileSync`, inspect new readers, and classify their assertions using the rules above. This classification is documentation, never a test inclusion/exclusion list. Future tests run whether or not a documentation row has been added.

## CI boundary

#361 consumes this exact runner, not a copied test list. Every push to main and
every pull request (including stacked branches) runs these jobs:

| Required green job | Checks |
| --- | --- |
| Frontend build | Node 24, locked `npm ci`, lint, dependency cycles, TypeScript/Vite production build. |
| Node behavioral and boundary tests | Node 24, locked `npm ci`, pinned Playwright Chromium plus Linux browser dependencies, discovery agreement, complete `npm run test:node`. |
| Tauri Rust check | Windows, locked workspace Cargo check, then `npm run test:rust`: application and package codec unit/conformance tests, one build job and one test thread. |

The existing build/check job identities are retained for review/status consumers;
the Node test job is an additional required review signal. All three must pass.
Failures and job timeouts fail CI. Superseded runs are cancelled; a cancelled run
is not a passing result. Timeouts are 15/20/30 minutes respectively. The Rust
toolchain remains the existing stable channel; reproducible toolchain/version
provenance is separate #377 work. Branch protection must include all three checks
when enforced; this change does not modify repository access/ruleset settings.

Green certifies only automated contracts on the tested commit. Headless component
tests are browser diagnostics; they do not certify native Tauri visuals, OS focus,
file-dialog interactions, DPI, physical print calibration, signing, installers,
or Linux/macOS packaged support. Those acceptance obligations remain explicit.
Until this workflow is integrated, older build/check-only green is insufficient.
