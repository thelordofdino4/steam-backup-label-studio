# Resolved Layout Inputs

> Status: Implemented Disc background slice and current-owner inventory; native acceptance pending.
> Purpose: Track #371's shared physical-layout boundary without introducing a universal renderer.
> Authority: The SDD owns architecture; source owns current behavior. This document does not complete #363/#365 or change saved schemas.

## Owner inventory

| Element / concern | Existing authoritative inputs | Adapters and remaining boundary |
| --- | --- | --- |
| Disc background | `image/backgroundImage.ts`: active-content cover fit, resolved content/interaction rectangles, disc clip, offset limits | `useBackgroundImage`, `BackgroundLayer`, `drawBackgroundArtwork`, pointer clamps and measured selection outlines now share this geometry. The old CSS-percent size derivation and canvas centering/offset formulas are removed. |
| Other Disc images and marks | `render/imageRenderArtifact.ts`, mark render models, `layout/discElementSafeZone*`, focused project image owners | Percent bounds/source visibility are shared; individual JSX and canvas adapters remain. Future migrations must inventory each owner rather than infer that every image already uses the background contract. |
| Adopted Case artwork viewports | `caseInsert/artworkViewportRenderArtifact.ts`, exposed through the `render/` facade | Already resolves basis, transformed box, source crop, destination/clip rectangles and content visibility for preview/export/interaction. Preserve this owner and its existing integration contracts; do not add a competing Case geometry model. |
| Legacy Case images / physical regions | `layout/jewelCaseLayout.ts`, `jewelCaseFrontLayout.ts`, `jewelCaseBackLayout.ts`, `jewelCaseSpineLayout.ts`, Case safe-zone helpers | Shared millimetre regions and fitting remain authoritative. Legacy and adopted viewport paths are intentionally distinct compatibility cases. |
| Disc text | `discText` layout/SVG owners and `layout/discTextOccupiedRegions.ts` | Visible SVG remains authoritative for straight/curved content and caret/selection adapters. No text, hidden-input, or measurement replacement in this slice. |
| Case text / rotated spines | `jewelCaseBackLayout.ts`, `jewelCaseSpineLayout.ts`, `jewelCaseSpineTransform.ts`, existing text render/input adapters | Retain rich runs, wrapping and transformed caret semantics. Separate DOM/Canvas painting is allowed; final resolved-input parity still requires its focused evidence. |
| Layer order | `editor/layerOrder.ts` | Existing Disc and Case preview/export arrays remain the only semantic ordering policy. No background slice reordering. |
| Viewport / selection | `PreviewViewport`, pointer adapters, `editor/previewElementOverlay.ts` | Pan/zoom is transient. Selection measures the visible registered element and removes viewport scale. It does not invent an independent image-fit rectangle. |

## Disc background contract

`resolveBackgroundImageLayout` returns a frozen numeric artifact in local Disc
preview pixels. It carries the active-content destination rectangle, the full
Disc interaction rectangle, and the circular surface clip. It does not contain
React state, viewport pan/zoom, image bytes, or serialized project fields.
`projectBackgroundImageLayout` converts that artifact uniformly into output
pixels plus the export outline origin; it does not refit the image.

The existing background owner still chooses enabled state, image metadata,
scale and offset. `getBackgroundDrawSize` remains the sole active-pixel cover
fit calculation. Offset limits derive from the resolved content/interaction
extents, with the existing 0.1-step rounding and final-edge travel preserved.
Background artwork intentionally is not safe-zone-clamped like a logo: its
image can travel until its last edge touches the opposite disc edge.

The preview hook derives the artifact; `BackgroundLayer` only maps its numeric
fields to CSS. The parent Disc surface clips the preview layer stack once;
the PNG adapter likewise preserves the existing stack clip without applying
its antialiased edge twice. Standalone background drawing consumes the
artifact's circle. The registered editable element remains the full disc surface,
including empty space around a scaled-down image. Dragging and selection must
not silently shrink to the visible image bounds. Disabled and fully transparent
backgrounds expose neither a rendered image nor an image hit target.

`getDiscPreviewCoordinateSize` reads the untransformed local border-box width,
matching the existing pixel drag basis. The sizing hook and PNG invocation use
this same boundary. Previously they read `getBoundingClientRect().width`, which
includes viewport zoom, while drag removed that zoom. The viewport must never
alter saved offsets or exported content coordinates. This change does not
redefine the legacy offset field or convert stored offsets to percentages.

The canvas adapter continues to use `drawImageContent` for source bounds,
including exact uncropped images and proportional stored-to-loaded crop
mapping. It must not introduce a second alpha-bound detector. Physical hole,
guide, outline and other layer behavior stays in the existing Disc exporter.

Legacy missing image metadata remains a compatibility boundary: preview keeps
its square/cover fallback; export retains its loaded-image-size fallback. The
resolved owner is reused for both, but they cannot share identical source
evidence until metadata is available. This slice does not silently change that
legacy behavior or claim its full parity. Empty explicit bounds still mean no
content, not missing metadata.

## Evidence and acceptance gates

- `backgroundImage.test.ts` checks explicit numeric fit, crop, projection,
  immutability, edge limits and viewport-independent coordinate measurement.
- `backgroundLayout.integration.test.mjs` mounts the real background painter,
  sizing hook, pointer hook and selection overlay, and exercises the real
  canvas painter. It checks active source crop/color/clip output, fitted DOM
  rectangles, transformed pointer deltas, disabled/empty handling, legacy
  fallback, and PNG byte equality across viewport zoom/pan settings.
- Classic Background preset behavioral assertions remain, including the
  limiting 92% contain boundary and alpha-content fit. Its old JSX/CSS/source
  spelling checks are replaced by the mounted consumer tests above.
- Run the complete discovered suite, build, lint and cycle checks for this
  slice. Existing curved text, rotated spine, image-source, preset and
  save/load tests must remain passing; unchanged code alone is not acceptance.

The headless browser tests are adapter diagnostics. Native Tauri checks for
background placement, zoom/drag/selection, export comparison, disabled-state
restoration and curved/rotated text remain required under AGENTS.md. No native
window is launched without explicit authorization. #371 remains open pending
integration/native evidence and the remaining representative boundaries;
#363/#365 migration and deletion gates are unchanged.
