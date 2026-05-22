# Template Specification

## Purpose

Templates define the physical print area and editable regions for each label or case type.

The app should treat templates as real-world print layouts, not just screen-sized images.

## Units

Templates should store measurements in millimeters.

Pixel dimensions should be calculated during preview and export based on the chosen DPI.

Recommended export DPI:

- 300 DPI for normal print output
- 600 DPI as a future high-resolution option

## Template Categories

Initial category:

- Disc label

Future categories:

- Jewel case
- DVD/Amaray case
- Blu-ray case

## Disc Template Data

A disc template should define:

- Outer diameter
- Inner hole diameter
- Printable diameter
- Safe diameter
- Bleed diameter
- Center point
- Non-printable masks
- Default placement zones

Example TypeScript shape:

```ts
export interface DiscTemplate {
  id: string;
  name: string;
  type: 'disc';
  units: 'mm';
  outerDiameterMm: number;
  innerHoleDiameterMm: number;
  printableDiameterMm: number;
  safeDiameterMm: number;
  bleedDiameterMm?: number;
  defaultZones: TemplateZone[];
}
```

## Template Zones

Zones are named placement areas that help the app position layers automatically.

Examples:

- top-center
- bottom-center
- center-left
- center-right
- bottom-left
- bottom-right
- manual

Example TypeScript shape:

```ts
export interface TemplateZone {
  id: string;
  name: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  anchor: 'center' | 'top-left';
}
```

## Guides

Guides are visible editor overlays that should not print by default.

Guide types:

- Outer edge
- Center hole
- Safe zone
- Bleed zone
- Fold line
- Spine line
- Text safe area

## Masks

Masks represent areas where artwork should not appear or should be clipped.

For disc labels, the most important mask is the center hole.

Future masks may include:

- Non-printable hub region
- Case fold areas
- Spine boundaries

## Standard Printable Disc MVP

The first built-in disc template should represent a common printable disc layout.

Exact dimensions should be verified before implementation and should be user-adjustable later.

For MVP, the template only needs:

- Outer circle
- Center hole circle
- Safe zone circle
- A usable design region

## Future Template Features

- User-created templates
- Import/export template files
- Template calibration
- Manufacturer presets
- Avery-style label sheet support
- Printer alignment offsets
