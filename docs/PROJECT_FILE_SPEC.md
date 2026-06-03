# Project File Specification

Last refreshed: 2026-06-03.

## Purpose

Project files let users save and reopen disc-label designs. The same JSON
project format now also has groundwork for future case insert projects, starting
with jewel case inserts.

A project file should store enough state to restore the current editor state
without depending on the original local files after reload when assets have been
embedded.

## Current Format

The current implementation saves plain JSON project files. User-facing filenames are commonly named `.sbls.json`.

The current source-of-truth type is `SavedProject` in `src/project/projectTypes.ts`.
It is a union of `SavedDiscProject` and `SavedCaseInsertProject`.

Disc snapshot creation lives in `src/project/createProjectSnapshot.ts`, and disc
restoration/normalization lives in `src/project/restoreProjectState.ts` plus
related project modules. Case insert snapshot/default creation and normalization
live in `src/project/projectCaseInsert.ts`.

The future `.sbls` package/container format is not implemented yet. Documentation and UI should not imply that zipped/package `.sbls` support exists today.

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

## Case Insert Groundwork

Issues #131 and #132 add a normalized case insert branch and focused jewel case
domain state to the same `0.1.0` JSON project family. This is background schema
and state-management work for the future editor; it does not mean the full jewel
case editor/export workflow is implemented.

Current case insert project files use `projectType: 'caseInsert'` and normalize
to `template.type: 'caseInsert'` plus `template.variant: 'jewelCase'`. Older
or sparse shells that used `template.type: 'jewelCase'` are routed and
normalized as jewel case projects.

The jewel case state stores:

- front surface background, title artwork, callout artwork/text, extra artwork slots, logo slots, mark slots, and text blocks
- back surface background, title artwork, screenshots, description, feature bullets, minimum/recommended requirements, legal text, extra artwork slots, logo slots, mark slots, and text blocks
- left and right spine settings, including background, title text, Steam Backup branding slot, and logo slot
- case export settings, including selected surfaces and guide IDs
- image asset data, image size, fit/layout settings, and provenance where present
- update helpers that can disable optional visual/text elements without dropping their remembered values or uploaded assets

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
- preserve optional case image, text, screenshot, logo, mark, and export state when controls are toggled off

## Future Format

A future version may use a packaged project format that bundles JSON plus local assets:

```text
project.sbls
  project.json
  assets/
    background-001.png
    logo-001.png
    screenshot-001.jpg
```

This would make projects more portable between machines and may reduce large JSON files. That package/container format is future work tracked separately from the current disc-editor alpha unless a concrete limitation appears.

## Future Schema Work

- Add explicit project schema validation and migration support (#48).
- Document migration behavior before changing schema semantics.
- Keep backward compatibility for current fixed systems during any future flexible visual-element migration.
- Keep user-facing documentation clear that case insert project schema groundwork
  exists, while full case editor save/load/export workflows are still future
  work until the editor modules land.
