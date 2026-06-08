# Final Editor Unification Audit

Last refreshed: 2026-06-08.

Issue context: #153.

This is a no-surprises audit of the staged editor unification work. It records
what is now shared source-of-truth code, what remains editor-specific, what
duplication remains, and which GitHub issues should stay open. It does not claim
the jewel case editor or all unification work is complete.

## Summary

The staged unification passes created real shared owners for neutral editor
behavior: panel shells, range fields, image-source controls, optional visual
feature gates, repeated artwork naming, image asset transitions, render artifact
shapes, common preflight warning copy, project normalization primitives, layer
category declarations, and pointer-drag geometry.

The staged work intentionally did not merge circular disc geometry with
rectangular case insert geometry, and it did not flatten case insert surface or
spine hierarchy into the disc editor sidebar model. Disc-only features, case
insert templates, and rotated spine behavior remain in editor-specific adapters.

Issue #149, structured tray/spine layouts, remains the next case insert feature
issue. Issue #126 remains the parent jewel case alpha finish line. This audit
should close #153 only after source validation passes and manual runtime smoke
is requested, not claimed.

## Shared Source Of Truth

| Area | Shared owner | Current consumers | Contract |
| --- | --- | --- | --- |
| Collapsible panel shells | `src/components/editor/EditorPanel.tsx`, `src/components/editor/editorPanelClasses.ts` | Disc sidebar panels and case insert nested panels | Neutral workflow/feature/branding panel styling without knowing editor type or surface structure. |
| Primitive range controls | `src/components/editor/EditorRangeField.tsx`, `src/components/editor/editorRangeFieldModel.ts` | Disc controls and case insert controls | Render label/value/range UI only. Meaning of scale, x, y, width, cross, length, or rotation stays in adapters. |
| Image-source and status controls | `src/components/editor/EditorImageSourceControls.tsx`, `EditorImageAssetStatusCard.tsx`, `EditorMarkImageSourceControls.tsx`, `EditorLogoAssetControls.tsx`, `EditorLogoCandidateControls.tsx`, `EditorSteamBannerControls.tsx` | Disc artwork/branding controls and case insert artwork/branding controls | Reusable UI for source choice, upload/status, candidate selection, lockup controls, and shared styling. Source catalogs remain feature/domain owned. |
| Optional visual feature gates | `src/editor/optionalVisualFeature.ts` | Disc and case insert optional artwork/branding/text features where applicable | Enabled state decides dependent-control visibility and preview/export participation while preserving stored state. |
| Repeated artwork behavior | `src/editor/repeatedArtwork.ts` | Disc additional artwork and case insert additional artwork | Shared "Artwork N" labels, slot numbering, visibility gates, frame summary text, and repeated-item summaries. |
| Image asset transitions | `src/editor/imageAssetTransitions.ts` | Shared visual features that set, clear, or replace image-backed state | Neutral image/image-source state updates. Feature-specific defaults and source interpretation stay outside this helper. |
| Logo and mark source helpers | `src/editor/logoAsset.ts`, `src/editor/markImageSource.ts` | Developer/publisher/additional logo paths and rating/media/platform/technical mark paths | Shared source labels, built-in/custom source behavior, and reset/clear semantics where the product behavior is equivalent. |
| Render artifact shapes | `src/render/imageRenderArtifact.ts`, `src/render/mediaMarkRenderModel.ts`, `src/render/platformMarkRenderModel.ts`, `src/render/technicalMarkRenderModel.ts` | Preview layers and export helpers where practical | Neutral image artifact records carry resolved image visibility and placement; geometry-specific coordinate resolution remains in adapters. |
| Layer category policy | `src/editor/layerOrder.ts`, `docs/DISC_EDITOR_LAYER_ORDER.md`, `docs/CASE_INSERT_EDITOR_LAYER_ORDER.md` | Disc preview/export and case insert preview/export | Shared file owns explicit disc and case insert layer stacks. Category names are parallel without implying every surface supports every feature. |
| Pointer drag primitives | `src/interaction/dragGeometry.ts`, `src/interaction/usePointerDrag.ts`, `src/interaction/usePointerDragAdapters.ts` | Disc and case insert preview pointer-drag hooks | Shared pointer lifecycle and percent/pixel drag math. Disc safe-zone, case rectangle, and spine rotation clamps remain adapter-owned. |
| Export warning copy | `src/export/preflightWarnings.ts` | Disc export preflight and case insert export preflight | Shared warning builders for guide export, missing images, bundled assets, layout values, unresolved fit/placement, and upscaling. |
| Canvas/image primitives | `src/export/canvasImage.ts`, shared draw helpers such as mark/image draw utilities | Disc PNG export and case insert PNG export where the artifact is neutral | Image loading and neutral drawing helpers. Export adapters still decide target geometry, masks, guides, and layer inclusion. |
| Saved project normalization primitives | `src/project/savedProjectNormalization.ts`, `src/project/projectAssetStatus.ts` | Disc and case insert save/load adapters | Primitive sparse restore helpers, asset status/provenance normalization, and common JSON safety checks. Editor project schemas remain separate. |
| Physical template primitives | `src/types/template.ts`, `src/templates/templateModel.ts` | Disc template state and case insert template state | Neutral dimensions/template metadata. Disc-only and case-only editing rules stay out of template primitives. |
| Shared editor CSS | `src/styles/app-editor-controls.css` plus `docs/CSS_STYLE_OWNERSHIP.md` | Shared panel/control/card/source/status UI | Styling for neutral editor controls after component boundaries exist. Surface geometry and preview layout styles stay editor-specific. |

## Editor-Specific Owners

| Area | Owner examples | Why it remains separate |
| --- | --- | --- |
| Disc geometry and clamps | `src/disc/geometry.ts`, `src/layout/discElementSafeZone.ts`, disc template guardrails | Circular media, physical center hole, hub avoidance, and disc safe-zone math are not rectangular case math. |
| Disc text behavior | `src/discText/*`, `src/components/sidebar/DiscTextControl.tsx`, `src/components/preview/DiscTextLayer.tsx`, `src/export/drawDiscText.ts` | Curved text, disc-number artwork, circular safe-zone behavior, and disc metadata text remain disc-specific. |
| Disc preview/export adapters | `src/components/preview/DiscPreview.tsx`, `src/export/exportPng.ts`, disc draw helpers | Disc export needs clipping, center-hole cutout, and circular print geometry. |
| Disc feature hooks | `src/hooks/useTitleArtwork.ts`, `useAdditionalArtwork.ts`, `useRatingBadgeState.ts`, `useMediaMarkState.ts`, `usePlatformMarksState.ts`, `useTechnicalMarks.ts`, `useDiscPreviewPointerDrag.ts` | These hooks still adapt shared concepts to disc template geometry and disc preview interactions. |
| Case insert project/domain state | `src/caseInsert/*`, `src/project/caseInsertProjectAdapters.ts`, `src/project/projectCaseInsert.ts` | Case insert needs surface-specific defaults, normalization, image slots, text blocks, export settings, and template capabilities. `projectCaseInsert.ts` should stay a compatibility barrel. |
| Jewel case layout | `src/layout/jewelCaseLayout.ts`, `jewelCaseBackLayout.ts`, `jewelCaseSpineLayout.ts`, `caseInsertPreviewLayout.ts`, `caseInsertTextVisualLayout.ts` | Cover/tray/spine use rectangular print regions and rotated spine coordinates, not disc center/radius math. |
| Case insert UI composition | `src/components/caseInsert/*`, `src/components/preview/CaseInsertPreview.tsx`, case insert preview layers | Case insert must preserve surface panels and Left/Right Spine nesting before exposing Artwork, Branding, and Text. |
| Case insert export/preflight adapters | `src/export/exportCaseInsertPng.ts`, `src/export/caseInsertExportPreflight.ts`, `src/export/drawCaseInsertGuides.ts`, `src/export/drawCaseInsertSteamBanner.ts` | Case export owns rectangular template dimensions, pure paper background, template guide choices, and spine-aware rendering. |
| Spine controls and hooks | `src/hooks/useJewelCaseSpineEditor.ts`, `src/components/caseInsert/CaseInsertSpineControls.tsx`, spine layout helpers | Spine uses side-specific state, cross/length/orientation controls, and rotated coordinate transforms. |

## Remaining Duplication

| Duplication | Status | Follow-up |
| --- | --- | --- |
| Preview DOM layers and canvas export drawers are still separate in several feature families. | Intentional adapter duplication. The render artifact boundary now reduces divergence, but DOM and canvas cannot always share the same primitive directly. | Keep preview/export parity tests and layer-order docs current. Create focused issues only when a specific feature diverges. |
| Disc feature hooks and case insert hooks still have parallel source, layout, and drag adapters. | Intentional. The shared code owns neutral contracts; adapters own geometry and target-slot mapping. | Continue #44 only where active feature work exposes oversized hooks or App orchestration. |
| Disc text and case insert text remain separate in several places. | Partly intentional, partly future cleanup. Straight text shares more behavior now, but curved disc text and rotated spine text require separate layout. | Do not force curved text or spine text into a generic helper. Extract more neutral straight-text helpers only after both editors consume them. |
| Case insert surface and spine control components still repeat some panel assembly. | Temporary but acceptable. The hierarchy is product-specific and should not be flattened into disc-style top-level panels. | #149 can improve structured tray/spine layouts without redesigning shared panel shells. |
| Project schemas and normalization adapters remain separate. | Intentional. Saved project type is a real product boundary. | #48 should add validation and migrations without collapsing disc and case project types. |
| CSS remains split across shared and editor-specific files. | Intentional. Shared control styles are neutral; surface and preview styles are editor-specific. | #46 remains open for stale selector cleanup and future CSS organization. |
| Mark/logo catalogs and official asset expansion remain incomplete. | Intentional future expansion, not unification debt. | #125 tracks historical mark catalog expansion and missing mark families. |
| Guide Legend remains in the sidebar. | Intentional current UI state. | #124 tracks moving Guide Legend into the live preview. |
| Future `.sbls` package/container behavior is not implemented. | Intentional future file-format work. | #56 remains open. |

## Open Issue Disposition

| Issue | Keep open? | Reason |
| --- | --- | --- |
| #153 Final editor unification audit and documentation update | Close after this audit, docs updates, validation, commit, and push. | This issue only tracks the no-code audit and documentation refresh. |
| #149 Case inserts: structured tray/spine layouts | Yes. | Best next implementation issue. Shared controls are stable enough, but tray/spine content layouts still need product work. |
| #126 Jewel case editor alpha finish line | Yes. | Parent milestone remains open until case insert editor is alpha-ready. |
| #125 Mark catalog expansion | Yes. | Catalog/content expansion, not structural unification. |
| #124 Move Guide Legend into preview | Yes. | UI polish/follow-up, not part of this audit. |
| #56 `.sbls` package format | Yes. | Future portability/package work. |
| #48 Project schema validation and migrations | Yes. | Needed before heavier persisted-shape changes. |
| #47 Rust command organization | Yes. | Low-risk cleanup unless Rust command complexity becomes active pain. |
| #46 CSS organization | Yes. | Shared CSS ownership exists, but future stale-selector cleanup remains useful. |
| #44 Remaining hook/state extraction | Yes. | Continue only when it supports active implementation risk. |
| #17 Guided Start | Yes. | Future workflow after editor feature sets stabilize. |

## Validation Expectations

For this documentation issue, source validation is:

- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run check:cycles`

Do not claim live editor behavior was manually verified unless a human runs the
Tauri app from the primary checkout. For manual runtime coverage after this
audit, use `docs/MANUAL_SMOKE_CHECKLISTS.md` and record:

- checkout SHA and dirty state
- stale dev-server check
- disc editor panel/source/drag/save/load/export smoke
- case insert cover/tray/spine panel/source/drag/save/load/export smoke
- preview/export guide parity
- whether any section was skipped

## Guardrail Conclusions

- A shared module should be renamed to a neutral name only after both editors
  consume it as source-of-truth behavior.
- Shared panel shells must stay hierarchy-neutral. Disc workflow panels and
  case insert surface/spine panels are different compositions.
- Shared controls must receive values and handlers; they must not decide what a
  layout field means.
- Shared render/preflight/project helpers should describe common contracts, not
  target geometry.
- Any remaining parity bug should start with a source-of-truth audit and end
  with either fixed behavior, documented intentional divergence, or a concrete
  follow-up issue.
