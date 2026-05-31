# Preview/Export Rendering Architecture Audit

Last refreshed: 2026-05-31.

This document began as the issue #82 ownership audit. Issue #82 and related regressions #83, #84, and #85 are now closed. Keep this document as the current preview/export ownership map, not as evidence that those closed issues are still active.

## Scope

This audit records where preview/export parity is protected, where ownership is clear, and where future parity fixes should land.

Related current source-of-truth docs:

- `docs/ARCHITECTURE_GUARDRAILS.md`
- `docs/DISC_EDITOR_LAYER_ORDER.md`
- `docs/METADATA_DISC_TEXT_BINDING.md`
- `docs/PROJECT_FILE_SPEC.md`

## Current Layer Order

Layer order is centralized in `src/layerOrder.ts`.

Preview uses `DISC_EDITOR_PREVIEW_LAYER_ORDER`.

PNG export uses:

- `DISC_EDITOR_CLIPPED_EXPORT_LAYER_ORDER`
- `DISC_EDITOR_POST_CLIP_EXPORT_LAYER_ORDER`

Current user-visible order:

1. Background artwork.
2. Additional artwork.
3. Steam Backup banner.
4. Game title/logo artwork.
5. Developer, publisher, and additional logos.
6. Rating badge.
7. Media format mark.
8. Operating-system marks.
9. Technical/audio/codec marks.
10. Disc text.

## Preview/Export Render Paths

| Layer | Preview path | Export path | Notes |
| --- | --- | --- | --- |
| Disc base fill | CSS background on `.disc-preview` | canvas fill in `exportPng.ts` | Simple intent; not a shared artifact. |
| Background artwork | `BackgroundLayer` | background draw in `exportPng.ts` | Uses preview offset/scaling state; keep documented before changing. |
| Additional artwork | `AdditionalArtworkLayer` | `drawAdditionalArtwork.ts` | Uses shared project render items. |
| Steam banner | `SteamBannerPreview` | `drawSteamBanner.ts` | Keep placement/color/lockup math aligned. |
| Title artwork | `TitleArtworkLayer` | `drawTitleArtwork.ts` | Uses `projectTitleArtwork` domain state. |
| Logo assets | `LogoAssetLayer` | `drawLogoAssets.ts` | Covers primary and additional developer/publisher logos. |
| Rating badge | `RatingBadgeLayer` | `drawRatingBadge.ts` | Generic/custom image behavior must stay matched. |
| Media mark | `MediaMarkLayer` | `drawMediaMark.ts` | Generic/custom image behavior must stay matched. |
| Operating-system marks | `PlatformMarksLayer` | `drawPlatformMarks` in `drawMediaMark.ts` | Per-mark assets/layouts. |
| Technical marks | `TechnicalMarksLayer` | `drawTechnicalMarks.ts` | Per-mark assets/layouts. |
| Disc text | `DiscTextLayer` and `discTextSvgLayer.ts` | `drawDiscText.ts` and `discTextSvgLayer.ts` | Shared SVG/data and metadata-bound value resolution. |
| Editor guide overlay | `DiscGuideOverlay` | not exported unless export guide options are enabled | Preview-only guide layer. |
| Export outline/hole/guides | not preview layers | `drawExportGuides.ts` / `exportPng.ts` | Post-clip export operations. |

## Current Ownership Map

| Domain | State/defaults | Layout/clamp | Preview artifact | Export artifact | Save/load |
| --- | --- | --- | --- | --- | --- |
| Template geometry | `templates`, `discGeometry` | `discGeometry`, `discElementSafeZone` | `DiscGuideOverlay` | `drawExportGuides`, `exportPng` | project schema/restoration |
| Background artwork | `backgroundImage`, `backgroundArtworkSource`, `App.tsx` wiring | background helpers | `BackgroundLayer` | `exportPng` background draw | project snapshot/restoration |
| Additional artwork | `useAdditionalArtwork`, `projectAdditionalArtwork` | `discElementSafeZone` | `AdditionalArtworkLayer` | `drawAdditionalArtwork` | `normalizeProjectAdditionalArtwork` |
| Title artwork | `useTitleArtwork`, `projectTitleArtwork`, `steamTitleArtworkImport` | `discElementSafeZone` | `TitleArtworkLayer` | `drawTitleArtwork` | `normalizeProjectTitleArtwork` |
| Steam banner | `steamBanner`, `steamBannerDefaults`, `App.tsx` wiring | banner layout helpers | `SteamBannerPreview` | `drawSteamBanner` | project snapshot/restoration |
| Logos | `projectLogoAssets`, `useLogoAssetDiscovery` | `discElementSafeZone` | `LogoAssetLayer` | `drawLogoAssets` | `normalizeProjectLogoAssets` |
| Rating badge | `projectRatingBadge`, `projectMetadata` | `discElementSafeZone` | `RatingBadgeLayer` | `drawRatingBadge` | `normalizeProjectRatingBadge` |
| Media/OS marks | `projectMediaMark`, `steamPlatformMarks` | `discElementSafeZone` | `MediaMarkLayer`, `PlatformMarksLayer` | `drawMediaMark` | normalization helpers |
| Technical marks | `useTechnicalMarks`, `projectTechnicalMarks` | `discElementSafeZone` | `TechnicalMarksLayer` | `drawTechnicalMarks` | `normalizeProjectTechnicalMarks` |
| Disc text | `discText`, `discTextStyles`, `metadataDiscText` | `discElementSafeZone`, `discTextRenderLayout`, `discTextOccupiedRegions` | `DiscTextLayer` | `drawDiscText` | project schema/restoration |
| Export preflight | `exportPreflight` | validation helpers | none | pre-export dialog | none |
| Asset provenance/status | `projectAssetStatus` | none | sidebar/status copy | preflight/status copy | project schema/restoration |

## Remaining Risks

- `App.tsx` still owns enough wiring and state transitions that future feature work should search for focused owners before adding more logic.
- Some preview/export layers have separate DOM/canvas renderers. This is acceptable when documented, but changes must keep parity.
- CSS can still create hidden layer-order or layout behavior. Keep `src/layerOrder.ts` semantic order authoritative.
- Background artwork still uses preview offset/scaling state as source of truth and scales that for export.
- Fixtures do not yet cover every recently added layer, especially title artwork, additional artwork, technical marks, and newer text/preflight behavior.

## Validation Notes

Non-interactive checks such as `npm run lint`, `npm run build`, and relevant tests validate source health. They do not prove live editor behavior.

Manual runtime verification should check:

- Preview/export parity.
- Save/load behavior.
- Drag behavior.
- Slider/manual controls.
- Upload/custom image behavior.
- Optional visual disabled-state behavior.
- Export preflight warnings.

Do not claim native/Tauri manual smoke unless `npm run tauri dev` was explicitly run and checked.
