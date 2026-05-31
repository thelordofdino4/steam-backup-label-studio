# Template Specification

Last refreshed: 2026-05-31.

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

Future categories:

- Jewel case.
- DVD/Amaray case.
- Blu-ray case.

Do not present future categories as available until their editors can export usable files.

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
