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

Disc-specific circular geometry remains owned by `src/discGeometry.ts` and `src/layout/discElementSafeZone.ts`.

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

#130 owns the first real jewel case physical template definition. #129 only establishes the shared model and validation helpers needed for that data.

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
