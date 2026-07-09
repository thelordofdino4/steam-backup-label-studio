# Project File Specification
> Status: Authoritative save/load schema reference.
> Purpose: Project JSON format, compatibility behavior, and future package notes.
> Read when: Save/load, schema, migration, project-file, or package-format work.
> Authoritative source: This document for saved-project schema; SDD for architecture boundaries.
> Last reviewed against commit: `6feb262bed2abd36b1371e5c0674013018132d16`.


Last refreshed: 2026-07-04.

## Purpose

Project files let users save and reopen disc-label designs. The same JSON
project format also stores active jewel case insert projects for the current
case insert editor surface.

A project file should store enough state to restore the current editor state
without depending on the original local files after reload when assets have been
embedded.

## Current Format

The current implementation saves plain JSON project files. User-facing filenames are commonly named `.sbls.json`.

The current source-of-truth type is `SavedProject` in `src/project/projectTypes.ts`.
It is a union of `SavedDiscProject` and `SavedCaseInsertProject`.

Schema/version constants and JSON parsing live in
`src/project/projectSchema.ts`. The older `src/project/normalizeProject.ts`
entry point remains as a compatibility adapter for callers that already import
`normalizeParsedProject`.

Disc snapshot creation lives in `src/project/createProjectSnapshot.ts`, and disc
restoration/normalization lives in `src/project/restoreProjectState.ts` plus
related project modules. Case insert saved-project adapters remain available
through `src/project/projectCaseInsert.ts`, while case-owned defaults,
normalization, state transitions, source helpers, and focused action modules
live under `src/caseInsert/`.

The future `.sbls` package/container format is not implemented yet. Documentation and UI should not imply that zipped/package `.sbls` support exists today. The package-format direction is recorded in `docs/PROJECT_PACKAGE_FORMAT_DECISION.md`.

The future package format should not block disc-editor alpha unless a specific save/load limitation appears.

## Current Saved State

Current disc project files use schema version `0.1.0` and include:

- top-level title and saved timestamp
- selected Steam game data and manual title
- project-owned metadata
- background artwork enabled state, embedded image data, source/provenance, size, scale, and offset
- template type, selected built-in template, or custom disc dimensions
- Steam banner placement, colors, lockup image data/source/size, lockup layout, and optional text fallback
- export guide settings
- developer/publisher/additional logo assets
- title/logo artwork state
- disc-number artwork state
- additional artwork elements
- rating badge state
- media mark state, including the built-in light/dark theme where supported
- operating-system mark state, including platform-specific built-in styles where supported, and inference metadata
- technical mark state
- disc text enabled state, values, metadata/manual value sources, title override, layout, and styles

## Asset Embedding And Provenance

Current saved projects generally embed image data as data URLs for assets that need to reload without the original source file.

Where supported, image assets also store provenance/status metadata:

- source kind, such as built-in, placeholder/generic, Steam artwork, web artwork, logo candidate, local Steam screenshot, uploaded, custom, or embedded
- source ID where safe/useful
- sanitized source label
- source URL for remote candidates where safe/useful

Local path details should not be stored as the durable identity for uploaded/local Steam screenshot assets. The project should be reloadable from embedded data without requiring the original local path.

## Current Disc Schema Sketch

This sketch is intentionally descriptive. `src/project/projectTypes.ts` remains the exact source of truth.

```ts
type SavedDiscProject = {
  schemaVersion: '0.1.0'
  title: string
  savedAt: string
  game: {
    manualTitle: string
    selectedSteamGame: SteamImportedGame | null
  }
  metadata?: ProjectMetadata
  logoAssets?: ProjectLogoAssetsInput
  titleArtwork?: Partial<ProjectTitleArtwork>
  discNumberArtwork?: Partial<ProjectDiscNumberArtwork>
  additionalArtwork?: ProjectAdditionalArtworkInput
  ratingBadge?: ProjectRatingBadge
  mediaMark?: ProjectMediaMark
  platformMarks?: ProjectPlatformMarks
  technicalMarks?: ProjectTechnicalMarksInput
  template: {
    type: 'disc'
    variant: SelectedDiscTemplateId
    customDimensions?: DiscTemplate | null
  }
  steamBackupLogo: {
    placement: SteamLogoPlacement
    bannerColors?: SteamBannerColors
    lockupImageDataUrl?: string | null
    lockupImageSource?: ProjectImageAssetProvenance | null
    lockupImageSize?: BackgroundImageSize | null
    lockupLayout?: SteamBannerLockupLayout
    useTextFallback?: boolean
    fallbackText?: string
  }
  export?: {
    guideMode?: ExportGuideMode
    guides?: ExportGuideSelection
  }
  background: {
    enabled?: boolean
    scale: number
    offset: BackgroundOffset
    imageDataUrl: string | null
    imageSource?: ProjectImageAssetProvenance | null
    imageSize?: BackgroundImageSize | null
    note: string
  }
  discText?: {
    settings?: Partial<DiscTextSettings>
    values?: Partial<DiscTextValues>
    valueSources?: Partial<DiscTextValueSources>
    titleValue?: string
    layout?: Partial<Record<DiscTextKey, Partial<DiscTextLayout>>>
    styles?: Partial<Record<DiscTextKey, Partial<DiscTextStyle>>>
  }
}
```

## Current Case Insert State

Jewel case projects are active current JSON projects in the same `0.1.0`
project family. The case insert editor supports cover, tray, left spine, and
right spine state, preview, save/load, guide settings, and PNG export paths.
This does not mean jewel case alpha is complete; #126 and #149 still track the
broader finish-line and structured layout work.

Current case insert project files use `projectType: 'caseInsert'` and normalize
to `template.type: 'caseInsert'` plus `template.variant: 'jewelCase'`. Older
or sparse shells that used `template.type: 'jewelCase'` are routed and
normalized as jewel case projects.

The jewel case state stores:

- front surface background, title artwork, artwork slots, callout text, logo slots, mark slots, and text blocks
- back surface background, title artwork, additional artwork slots, description, feature bullets, minimum/recommended requirements, legal text, logo slots, mark slots, and text blocks
- left and right spine settings, including background, title text, logo slots, and mark slots
- case export settings, including selected surfaces and guide IDs
- editor-only state, including the active case insert pane, so reopening returns
  to Cover Sheet or Tray Card without changing saved design content
- image asset data, image size, fit/layout settings, and provenance where present
- update helpers that can disable optional visual/text elements without dropping their remembered values or uploaded assets
- focused cover/tray/spine action state covered by
  `src/project/projectCaseInsert*.test.ts`,
  `src/project/restoreProject*.test.ts`, and
  `src/diagnostics/projectParityHarness*.test.ts`

The current descriptive shape is:

```ts
type SavedCaseInsertProject = {
  schemaVersion: '0.1.0'
  projectType: 'caseInsert'
  title: string
  savedAt: string
  game: {
    manualTitle: string
    selectedSteamGame: SteamImportedGame | null
  }
  metadata?: ProjectMetadata
  template: {
    type: 'caseInsert'
    variant: 'jewelCase'
  }
  editor?: {
    activeCaseInsertTemplatePane?: 'cover' | 'tray'
  }
  caseInsert: {
    templateType: 'jewelCase'
    front: ProjectJewelCaseFrontState
    back: ProjectJewelCaseBackState
    spine: ProjectJewelCaseSpineState
    export: ProjectJewelCaseExportSettings
  }
}
```

## Normalization Rules

Project loading now has a small schema validation and migration gate before
editor restoration. The parser checks that the file is valid JSON, that the root
is an object, that the schema version is either current or has a registered
migration path to the current version, and that the top-level saved project shape
has the required current sections for its editor type. It remains intentionally
shallow; feature-specific normalization still belongs to the existing
project/domain modules so sparse `0.1.0` data can be restored safely.

Loader normalization should:

- tolerate sparse legacy `0.1.0` project data
- apply safe defaults for missing current fields
- preserve user-provided assets and layout state where possible
- clamp visual element layouts to the selected template safe zone where required
- infer legacy embedded asset provenance safely
- avoid treating missing future fields as fatal
- route case insert projects away from the disc restore path
- normalize sparse jewel case data to safe front/back/spine defaults
- preserve case image asset provenance and embedded data where present
- preserve optional case image, text, artwork, logo, mark, and export state when controls are toggled off

## Future Package Direction

A future version should use a ZIP-compatible packaged project format that bundles JSON plus local assets:

```text
project.sbls
  manifest.json
  project.json
  assets/
    asset-0001.png
    asset-0002.jpg
    asset-0003.webp
```

This keeps projects portable as one file, avoids a custom binary container, and may reduce large JSON files. Existing `.sbls.json` data-URL projects remain the compatibility baseline. Package read/write behavior is future work tracked separately from the current disc-editor alpha unless a concrete limitation appears.

See `docs/PROJECT_PACKAGE_FORMAT_DECISION.md` for the #56 decision record.

## Future Schema Work

- The semantic packaging role taxonomy is documented in [`PACKAGING_ROLE_MODEL.md`](PACKAGING_ROLE_MODEL.md), and the role-based preset model is documented in [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md). These documents do not add current saved-project fields; any future role, preset identity, or role-layout schema must go through explicit schema and migration work in this spec.
- Register focused project schema migrations in `src/project/projectSchema.ts`
  before changing saved-project semantics.
- Keep migrations one version step at a time and make each migration produce the
  declared target `schemaVersion`; the loader rejects missing, looping, or
  mismatched migration chains before editor restoration.
- Keep explicit schema validation limited to raw JSON safety and current
  top-level saved-project contracts. Feature-specific defaults, sparse restore
  behavior, and layout clamping should remain in the existing project/domain
  normalizers.
- Keep backward compatibility for current fixed systems during any future flexible visual-element migration.
- Keep user-facing documentation clear that the active jewel case project path
  exists, while jewel case alpha remains incomplete until #126/#149 finish-line
  work is explicitly completed.
