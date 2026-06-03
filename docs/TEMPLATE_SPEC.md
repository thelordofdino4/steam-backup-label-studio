# Template Specification

Last refreshed: 2026-06-03.

## Purpose

Templates define the physical print area and editable regions for each label or case type.

The app should treat templates as real-world print layouts, not just screen-sized images.

## Units

Templates store measurements in millimeters.

Pixel dimensions are calculated during export based on the chosen DPI.

Current export DPI:

- 300 DPI for normal print output.

Possible future export DPI:

- 600 DPI as a future high-resolution option.

## Template Categories

Current functional category:

- Disc label.

Planned case insert categories:

- Jewel case.
- DVD/Amaray case.
- Blu-ray case.

Do not present future categories as available until their editors can export usable files.

The top-level project/editor type remains separate from the concrete template or case variant. Disc projects use disc templates. Case insert projects use case insert templates such as jewel case.

## Shared Template Model

The shared template model is owned by `src/types/template.ts`.

The model now distinguishes:

- `DiscTemplate` for circular disc labels.
- `RectangularPrintTemplate` for rectangular case insert layouts.
- `PrintTemplate` as the union for shared helpers.

Shared template helpers live in `src/templates/templateModel.ts`.

Those helpers can:

- Distinguish disc templates from rectangular templates.
- Resolve physical width and height in millimeters.
- Look up named rectangular regions and guides.
- Validate that rectangular regions and guide lines stay inside the template canvas.

Disc-specific circular geometry remains owned by `src/disc/geometry.ts` and `src/layout/discElementSafeZone.ts`.

## Current Disc Template Data

The current disc template shape is owned by `src/types/template.ts` and built-in options live in `src/templates/discTemplates.ts`.

A disc template currently defines:

- `id`
- `name`
- `type: 'disc'`
- `outerDiameterMm`
- `physicalCenterHoleDiameterMm`
- `innerHoleDiameterMm`
- `printableDiameterMm`
- `safeDiameterMm`
- optional `geometryNote`

The app supports built-in disc templates and a custom dimensions option.

## Rectangular Case Template Model

Rectangular templates can describe:

- Physical `widthMm` and `heightMm`.
- Named regions such as front, back, spine, trim, bleed, safe, and printable areas.
- Region parent relationships, for example a front safe area inside the front cover region.
- Guide definitions for trim bounds, safe bounds, bleed bounds, fold lines, and spine boundaries.

## Jewel Case Template Data

The first concrete case insert template is `jewelCase`, owned by `src/templates/caseInsertTemplates.ts`.

It follows the measured Steam Game Covers 2018 PSD layout as two fixed print surfaces:

- Front surface: 1414 px x 1414 px at 300 DPI, about 119.72 mm x 119.72 mm.
- Back tray surface: 1780 px x 1390 px at 300 DPI, about 150.71 mm x 117.69 mm.
- The back tray surface already includes both spine strips.
- Left spine region: 75 px x 1390 px, about 6.35 mm x 117.69 mm.
- Center back panel region: 1630 px x 1390 px, about 138.01 mm x 117.69 mm.
- Right spine region: 75 px x 1390 px, about 6.35 mm x 117.69 mm.

The original PSD canvases are larger than these measured regions. The template module uses the measured cut/export regions, not the full mock-up canvas. Because the current measured surfaces are already the cut-size regions, the initial bleed and trim bounds share the same surface bounds. Future dedicated print-bleed variants can add external bleed once the editor/export path has guardrails for that.

This template is intentionally fixed during normal editing. Artwork should be cropped, contained, or scaled inside the named regions; artwork should not resize or distort the template.

Reference context:

- User-provided `SGC_JEWEL_FRONT_2018.psd`: 1800 px canvas at 300 DPI, with a measured 1414 px x 1414 px front region after excluding guide stroke bounds.
- User-provided `SGC_JEWEL_BACK_2018.psd`: 1950 px canvas at 300 DPI, with a measured 1780 px x 1390 px back tray region after excluding guide stroke bounds.
- The 1780 px x 1390 px back tray region includes two 75 px x 1390 px spine strips.
- Common CD jewel front cover templates use about 120 mm x 120 mm: https://www.printdvdcover.com/cd-jewel-case-cover-layout.php
- Common tray/back inlay templates use about 151 mm x 118 mm with spine folds: https://www.printdvdcover.com/cd-jewel-case-cover-layout.php and https://cq.co.nz/wp-content/uploads/2024/06/CD_Jewel-Case-Back-Insert.pdf
- Steam Game Covers' template guidance expects 300 DPI artwork and warns against resizing the template: https://www.steamgamecovers.com/template.php

One-piece front/spine/back wraps are not the current jewel case baseline. They may become separate future template variants if user testing shows they are useful.

## Current Geometry Meaning

- Outer diameter: the physical outside edge of the disc.
- Physical center hole: the actual cut-out center hole that is blanked during export.
- Inner print boundary: the inside boundary of the printable region.
- Printable diameter: the outside boundary of the printable region.
- Safe zone: the advisory boundary for keeping important text, logos, and marks away from edge drift.

The live preview displays these guides. Clean PNG export hides guides unless the user enables exported guide marks in Export Options.

## Default Layouts

Default layouts for real-disc-art elements should derive from template geometry instead of hardcoded assumptions where practical.

Current default layout helpers live under `src/layout/`, especially:

- `discTemplateLayoutDefaults.ts`
- `discElementSafeZone.ts`
- `discTemplateGeometryGuardrail.ts`

Current movable visual elements should use shared safe-zone clamp/range helpers where safe-zone enforcement is required.

## Future Template Features

- User-created templates.
- Import/export template files.
- Template calibration.
- Manufacturer presets.
- Avery-style label sheet support.
- Printer alignment offsets.
- Shared template model for future case editors.
