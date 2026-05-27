# Preview/Export Rendering Architecture Audit

This audit is the first refactor-first deliverable for issue #82. It records where the current disc editor architecture is still safe, where ownership is unclear, and where future parity fixes should land. It should be updated as the emergency regressions in #83, #84, and #85 are addressed.

## Scope and Related Issues

- Primary issue: #82, preview/export rendering architecture and 1:1 parity.
- Related regressions: #83, straight text safe-zone bounds; #84, movable element drag interactions; #85, media/platform mark manual controls and custom image upload.
- Related planning context: #60 layer order, #68 metadata-to-rendered-text behavior, #69 disc-editor alpha finish line.

This document is not a close-out for #82. It is an ownership map and risk register so fixes happen in the right modules instead of being patched back into `App.tsx`.

## Current App.tsx Responsibilities Still Needing Extraction

`App.tsx` remains an orchestration file with several feature domains still embedded in it.

| Domain | Current owner | Target owner |
| --- | --- | --- |
| Disc template state and custom dimension transitions | `App.tsx` with geometry helpers in `src/discGeometry.ts` | `useDiscTemplate` or a disc-template domain module |
| Background upload, image size lookup, drag offset, scale, reset | `App.tsx` plus `src/local/localArtwork.ts` and `src/export/exportPng.ts` | `useBackgroundImage` plus shared asset/image helpers |
| Steam search/import and imported artwork selection | `App.tsx`, `src/steam/steamApi.ts`, `src/local/localArtwork.ts` | `useSteamImport`, `useLocalSteamScreenshots`, and a project asset library |
| Steam banner state, upload, layout, and color transitions | `App.tsx`, `SteamBannerPreview`, `drawSteamBanner` | Steam banner domain module/hook plus shared artifact decisions |
| Developer/publisher logo state transitions and upload | `App.tsx`, `projectLogoAssets`, `LogoAssetLayer`, `drawLogoAssets` | `useLogoAssets` and logo layout/render modules |
| Rating badge state transitions and upload | `App.tsx`, `projectRatingBadge`, `RatingBadgeLayer`, `drawRatingBadge` | `useRatingBadge` and rating badge layout/render modules |
| Media mark state transitions and upload | `App.tsx`, `projectMediaMark`, `MediaMarkLayer`, `drawMediaMark` | `useMediaMark` and media mark layout/render modules |
| Platform mark state transitions and upload | `App.tsx`, `projectMediaMark`, `MediaMarkLayer`, `drawMediaMark` | `usePlatformMarks` and platform mark layout/render modules |
| Disc text state transitions and pointer movement | `App.tsx`, `discText.ts`, `discTextRenderLayout.ts`, `discTextSvgLayer.ts` | `useDiscTextEditor`, with layout math kept in text modules |
| Save/load snapshot construction and restoration | `App.tsx`, `src/project/*` | project snapshot and restoration module |
| Export preflight orchestration | `App.tsx`, `src/export/exportPreflight.ts` | export orchestration module or hook |
| Pointer/drag interaction math | `App.tsx` | focused interaction helpers or feature hooks |

First extraction made during this audit pass: current safe-zone clamping for logos, rating badge, media mark, platform marks, and straight disc text now lives in `src/layout/discElementSafeZone.ts` instead of `App.tsx`.

## Preview/Export Render Paths

| Layer | Preview path | Export path | Coordinate system | Current parity risk |
| --- | --- | --- | --- | --- |
| Disc base fill | CSS background on `.disc-preview` | canvas fill in `exportPng.ts` | preview CSS pixels vs export pixels | Low; visual intent is simple, but not a shared artifact |
| Background artwork | `BackgroundLayer` DOM image | canvas `drawImage` in `exportPng.ts` | preview pixel offsets scaled into export pixels | Medium; export depends on `previewSize` offset scaling |
| Steam banner | `SteamBannerPreview` DOM/CSS/image | `drawSteamBanner.ts` canvas/image | percent-like placement converted independently | Medium; two implementations must stay aligned |
| Developer/publisher logos | `LogoAssetLayer` DOM images | `drawLogoAssets.ts` canvas images | percent center coordinates and shared base ratios | Medium; sizing math is mostly shared via geometry helpers, but renderers are separate |
| Rating badge | `RatingBadgeLayer` image-backed SVG/custom image | `drawRatingBadge.ts` canvas raster of SVG/custom image | percent center coordinates and shared base ratios | Medium; placeholder SVG is shared, but preview/export image sizing is still implemented separately |
| Media mark | `MediaMarkLayer` image-backed SVG/custom image | `drawMediaMark.ts` canvas raster of SVG/custom image | percent center coordinates and shared base ratios | Medium; placeholder SVG is shared, but preview/export image sizing is still implemented separately |
| Platform marks | `PlatformMarksLayer` image-backed SVG/custom images | `drawPlatformMarks` in `drawMediaMark.ts` | percent center coordinates and shared base ratios | High; multiple per-platform assets increase state, upload, drag, and control coupling |
| Disc text | `DiscTextLayer` shared SVG data URL plus separate SVG hit target | `drawDiscText.ts` rasterizes `discTextSvgLayer.ts` | 100x100 SVG viewBox over disc content | High; shared artifact exists, but font measurement, safe bounds, hit-target behavior, and stale CSS still need verification |
| Editor guide overlay | `DiscGuideOverlay` DOM/CSS | not exported unless export guide options are enabled | percent diameters | Low for preview-only guides; medium if confused with export guide layers |
| Export outline and center hole cutout | not preview layers | canvas post-clip export layers | export pixel canvas | Low if kept post-content; must not affect content coordinate math |
| Optional export guides | not regular preview layers | `drawExportGuides.ts` canvas | export pixel canvas | Low; should remain clearly export-only |

## Layer-Order Ownership

Layer order is centralized in `src/layerOrder.ts`, and both `DiscPreview.tsx` and `exportPng.ts` iterate the shared layer arrays. That is good architecture.

The current risk is CSS still assigning hardcoded `z-index` values to preview layers. These values can override React render order and recreate the mismatch described in #82:

- `.background-image-layer`
- `.steam-brand-banner`
- `.disc-logo-asset-layer`
- `.disc-rating-badge-layer`
- `.disc-media-mark-layer`
- `.disc-platform-mark-layer`
- `.disc-text-layer`
- guide overlays and center-hole classes
- stale `.disc-straight-text-svg` and `.disc-curved-text-svg` rules in `layoutFix.css` / `App.css`

Target owner: `src/layerOrder.ts` should remain the semantic owner. Preview z-index should either be generated from that module or removed where DOM order is sufficient. CSS should not silently invent another stack.

## Coordinate-System Ownership

Current coordinate systems in play:

- Physical millimeters in `DiscTemplate`.
- Export pixels derived by `mmToPixels` at 300 DPI.
- Export outline padding via `discOrigin`.
- Preview CSS pixels through `previewSize` and measured preview dimensions.
- Percent coordinates for most visual element centers.
- SVG `viewBox="0 0 100 100"` for disc text and placeholder artifacts.
- CSS container query units in stale text rules.

Target owners:

- Physical/export geometry: `src/discGeometry.ts`.
- Feature-level safe-zone clamping: `src/layout/discElementSafeZone.ts`.
- Shared content-layer render sizing: future layer layout/render artifact modules.
- Export outline padding: `src/export/exportPng.ts` post-content export layers only.

Risk to fix later: background artwork still uses preview pixel offsets as source-of-truth, then scales them for export. That behavior should be documented or moved to a background image domain module before major editor work builds on it.

## Drag/Interaction Ownership

Pointer state and drag math currently live in `App.tsx` for:

- background artwork
- straight/curved disc text hit targets
- developer/publisher logos
- rating badge
- media mark
- platform marks

`DiscTextLayer` already separates the visual SVG image from an invisible hit-target SVG. That separation is directionally correct, but it needs explicit ownership and testing because it can block or swallow pointer events.

Target owner: each movable feature should expose interaction handlers from a focused hook or interaction module. Visual artifact components should not be the hidden owner of pointer math.

Immediate risk: #84 suggests image/SVG-backed preview layers or pointer-event changes broke drag hit targets. Do not fix that by undoing shared render artifacts; fix it by making hit targets intentional.

## Upload/Import Ownership

Upload/import logic is still spread across `App.tsx` handlers:

- local background upload
- Steam banner lockup upload
- developer/publisher logo uploads
- rating badge upload
- media mark upload
- platform mark uploads
- Steam artwork and local Steam screenshot imports

Shared lower-level helpers exist in `src/local/localArtwork.ts`, `src/steam/steamApi.ts`, and `src/utils/bytesToBase64.ts`, but feature-specific update behavior remains in `App.tsx`.

Target owner: an asset/image helper should own file reading and natural-size lookup, while feature hooks own how uploaded data changes feature state. #85 should be fixed after platform mark upload ownership is explicit.

## Safe-Zone/Clamp Ownership

Low-level geometry helpers already live in `src/discGeometry.ts`.

Before this pass, feature-specific safe-zone clamping for logos, rating badges, media marks, platform marks, and straight disc text lived in `App.tsx`. That made regressions like #83 harder to diagnose because layout policy was mixed with app orchestration.

After this pass:

- low-level circle/rect math remains in `src/discGeometry.ts`
- current feature-level clamp policy lives in `src/layout/discElementSafeZone.ts`
- `App.tsx` only calls the clamp helpers while applying state transitions

Remaining risk: straight text safe-zone behavior is still likely incorrect per #83. This extraction intentionally preserves behavior and creates the correct owner for the later fix.

## Stale CSS Risks

CSS remains a major parity risk.

High-risk selectors:

- `.disc-text-line`, `.disc-text-title`, `.disc-text-discNumber`, `.disc-text-backupDate`, `.disc-text-appId`, `.disc-text-customNote`, `.disc-text-copyright`
- `.disc-straight-text-svg`, `.disc-straight-text`
- `.disc-curved-text-svg`, `.disc-curved-text`
- `.rating-badge-placeholder`, `.disc-media-mark-placeholder`, `.disc-platform-mark-placeholder`
- hardcoded layer `z-index` values in preview CSS
- `layoutFix.css` overrides using `!important`

Some of these selectors appear to describe older DOM/CSS text or placeholder renderers that have since moved to image-backed SVG artifacts. They should be removed only after verifying they are unused, because stale selector cleanup can accidentally affect current hit targets or preview layout.

## Forward Ownership Map

| Domain | State/defaults | State transitions | Layout/clamp | Preview artifact | Export artifact | Interaction | Upload/import | Save/load |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Template geometry | `templates`, `projectTypes` | future `useDiscTemplate` | `discGeometry` | `DiscGuideOverlay` | `drawExportGuides`, `exportPng` | none | none | project schema |
| Background artwork | `App.tsx` today | future `useBackgroundImage` | future background layout module | `BackgroundLayer` | `exportPng` background draw | future background interaction module | future asset helper | project schema |
| Steam banner | `App.tsx` today | future banner hook/module | future banner layout module | `SteamBannerPreview` | `drawSteamBanner` | none | future asset helper | project schema |
| Logos | `projectLogoAssets` | future `useLogoAssets` | `discElementSafeZone` | `LogoAssetLayer` | `drawLogoAssets` | future logo interaction module | future asset helper | `normalizeProjectLogoAssets` |
| Rating badge | `projectRatingBadge` | future `useRatingBadge` | `discElementSafeZone` | `RatingBadgeLayer` | `drawRatingBadge` | future rating interaction module | future asset helper | `normalizeProjectRatingBadge` |
| Media mark | `projectMediaMark` | future `useMediaMark` | `discElementSafeZone` | `MediaMarkLayer` | `drawMediaMark` | future media interaction module | future asset helper | `normalizeProjectMediaMark` |
| Platform marks | `projectMediaMark` | future `usePlatformMarks` | `discElementSafeZone` | `PlatformMarksLayer` | `drawPlatformMarks` | future platform interaction module | future asset helper | `normalizeProjectPlatformMarks` |
| Disc text | `discText.ts` plus `App.tsx` state | future `useDiscTextEditor` | `discElementSafeZone`, `discTextRenderLayout` | `DiscTextLayer`, `discTextSvgLayer` | `drawDiscText`, `discTextSvgLayer` | future text interaction module | metadata binding in `metadataDiscText` | project schema |
| Layer order | `layerOrder.ts` | same | same | `DiscPreview` iteration | `exportPng` iteration | none | none | none |
| Export preflight | `exportPreflight` | `App.tsx` today | future preflight modules | none | export preflight dialog | none | none | none |

## Fixture Strategy Note

The untracked `fixtures/projects/steam-backup-label.png` file was present before this audit pass. It should not be committed unless it becomes part of an intentional, documented parity fixture strategy that explains source project data, expected output, and how the fixture is validated.
