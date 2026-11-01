# PNG physical output and calibration

> Status: Current encoding contract; native and physical-print acceptance pending (#359).
> Purpose: Bind template dimensions, raster dimensions, PNG density metadata and print calibration without changing renderer geometry.
> Read when: Changing PNG encoding, DPI, output dimensions, export success copy or release print acceptance.
> Authority: Physical PNG encoding rules here; template geometry remains owned by `TEMPLATE_SPEC.md` and template/domain source, workflow by `EXPORT_WORKFLOW_CONTRACT.md`, and preview/export parity by the SDD.

## Encoding contract

Disc uses `EXPORT_DPI` (300); Case uses its explicit exporter DPI or
`DEFAULT_TEMPLATE_EXPORT_DPI` (300). The same value that sizes the canvas is
passed to `canvasToPngBytes`. That existing serializer uses
`pngPhysicalResolution.ts` to set exactly one `pHYs` chunk immediately after
`IHDR`, before `IDAT`, with equal X/Y integer pixels per metre and unit 1.
The value is `round(dpi / 0.0254)`: 300 DPI becomes **11811 pixels/metre**
(299.9994 DPI), and 600 DPI becomes 23622. Integer unit conversion is expected;
the maximum density quantization error is 0.0127 DPI.

The encoder checks signature, chunk bounds/order, CRCs, required header/image/end
chunks and exact IHDR-versus-canvas dimensions before returning bytes. It
replaces existing density metadata, including unspecified units, and leaves
all other chunk bytes untouched. It does not decode/recompress image data,
change pixels/alpha/color profiles, resize the canvas, move guides, or change
the destination workflow. This is a canvas-output adapter, not a general image
import validator. Failed encoding returns no success bytes and happens before
native destination writing. Existing success text reports requested DPI only
after the checked bytes have been written; it does not certify a printer.

The [PNG specification](https://www.w3.org/TR/png-3/#11pHYs) defines `pHYs`
units and physical pixel dimensions. Absent metadata does not establish
physical size. Browser/WebView encoding defaults are not relied on. No claim
is made about pre-change native WebView bytes: their capture remains pending.

## Raster dimensions and nominal geometry

Existing rounding and geometry are preserved. Disc content diameter is
`round(outerDiameterMm / 25.4 * 300)`. Its existing outline margin adds 3 pixels
on each side, so canvas size is content diameter plus 6 pixels. At 300 DPI the
full canvas is about 0.508 mm larger than its circular content. Do not size the
full canvas to the nominal disc diameter: that would shrink the design.

Case uses `createCaseInsertPngExportLayout`; Cover Sheet is one physical output,
and Tray Card includes the back and both spines. Current template dimensions
are derived from the established 300-DPI pixel catalog. They are not silently
rounded to nominal retail-case dimensions by the metadata adapter.

| Current default output | Raster at 300 DPI | Canvas size from 11811 px/m |
| --- | --- | --- |
| Standard printable Disc (120 mm nominal circle) | 1423 x 1423 px; circle 1417 px | 120.4809 x 120.4809 mm; circle 119.9729 mm |
| Jewel Cover Sheet | 1414 x 1414 px | 119.7189 x 119.7189 mm |
| Jewel Tray Card including both spines | 1780 x 1390 px | 150.7070 x 117.6869 mm |

Disc pixel rounding is at most half a pixel (about 0.04234 mm at 300 DPI).
Density quantization adds less than 0.001 mm for these templates. Guides and
outlines alter rendered marks, not the density or canvas dimensions. #305's
Case exact-bound work is independent of density metadata and is preserved.

## Native and calibration acceptance

Automated coverage includes independent byte/CRC fixtures, malformed input and
failure cases, explicit DPI overrides, and headless real Disc/Cover/Tray
exporter diagnostics with guides off/on. The diagnostics compare every
non-`pHYs` byte and independently decode pixels before/after metadata encoding.
They do not establish native WebView behavior, visual acceptance or physical
printer accuracy.

For each supported native platform, record the app commit, OS/WebView version,
fixture, filename/hash, IHDR dimensions, all `pHYs` values/units, print software,
printer/driver, scale settings and measured dimensions. Windows acceptance is
pending; coordinate Linux #333 and macOS #334 independently.

1. From the primary native Tauri application, export a standard Disc, Jewel
   Cover and complete Tray, each with guides off and on. Inspect actual saved
   PNG bytes: expected raster dimensions, exactly one `pHYs`, 11811 on both
   axes, unit 1, and valid CRCs. Compare preview/export content and selected
   guides. A browser-only run is insufficient.
2. Open the PNGs in print software that honors embedded physical resolution.
   Select actual size/100%; disable fit-to-page, shrink-to-fit, borderless
   enlargement and driver scaling. Use paper large enough for the complete
   image. If the software ignores density, enter the table's full canvas size
   explicitly and record that fallback; do not equate this with metadata being
   honored.
3. Print the guide-enabled outputs on ordinary paper. Measure both axes of the
   Cover/Tray bounds and the Disc circle's outline centerline (not the outer
   canvas or stroke edge). Also check the Tray fold spacing against the template.
   Release calibration passes when each measured size is within **0.5 mm** of
   the pixel/density-derived size and no clipping or unequal axis scaling is
   present. Record the actual values, not just pass/fail.
4. If outside tolerance, check application/driver scaling and repeat. Record
   unresolved deviation as a release blocker for that tested print path. Do
   not alter template geometry or renderer pixels to hide driver scaling.

No native launch, saved native PNG inspection, calibration print or release
acceptance has been performed for this source checkpoint. #359 remains open.
