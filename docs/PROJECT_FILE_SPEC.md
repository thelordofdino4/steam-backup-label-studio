# Project File Specification

Last refreshed: 2026-05-31.

## Purpose

Project files let users save and reopen disc-label designs.

A project file should store enough state to restore the current disc-label editor without depending on the original local files after reload when assets have been embedded.

## Current Format

The current implementation saves plain JSON project files. User-facing filenames are commonly named `.sbls.json`.

The current source-of-truth type is `SavedProject` in `src/project/projectTypes.ts`. Snapshot creation lives in `src/project/createProjectSnapshot.ts`, and restoration/normalization lives in `src/project/restoreProjectState.ts` plus related project modules.

The future `.sbls` package/container format is not implemented yet. Documentation and UI should not imply that zipped/package `.sbls` support exists today.

The future package format should not block disc-editor alpha unless a specific save/load limitation appears.

## Current Saved State

Current project files use schema version `0.1.0` and include:

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

## Current Schema Sketch

This sketch is intentionally descriptive. `src/project/projectTypes.ts` remains the exact source of truth.

```ts
type SavedProject = {
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

## Normalization Rules

Loader normalization should:

- tolerate sparse legacy `0.1.0` project data
- apply safe defaults for missing current fields
- preserve user-provided assets and layout state where possible
- clamp visual element layouts to the selected template safe zone where required
- infer legacy embedded asset provenance safely
- avoid treating missing future fields as fatal

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
- Avoid claiming case-template project support until case editors can save, load, and export usable files.
