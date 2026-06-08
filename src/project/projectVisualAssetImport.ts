import {
  clampAdditionalArtworkElementLayoutToSafeZone,
  clampLogoAssetLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampProjectPlatformMarksToSafeZone,
  clampProjectRatingBadgeToSafeZone,
  clampProjectTechnicalMarksToSafeZone,
} from '../layout/discElementSafeZone.ts'
import type { DiscTemplate } from '../types/template'
import type { ImportedImageAsset } from '../utils/importedImageAsset'
import {
  setAdditionalArtworkElementImage,
  setAdditionalArtworkElementLayout,
  type AdditionalArtworkImportSource,
} from './projectAdditionalArtwork.ts'
import {
  getLogoAssetLayout,
  getLogoAssetSize,
  setLogoAssetImage,
  setLogoAssetLayout,
  type LogoAssetKey,
} from './projectLogoAssets.ts'
import { setMediaMarkCustomImage } from './projectMediaMark.ts'
import { setPlatformMarkCustomImage } from './projectPlatformMarks.ts'
import { setRatingBadgeCustomImage } from './projectRatingBadge.ts'
import { setTechnicalMarkCustomImage } from './projectTechnicalMarks.ts'
import type {
  ProjectImageAssetProvenance,
  PlatformMarkValue,
  ProjectAdditionalArtwork,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  TechnicalMarkValue,
} from './projectTypes'

export function applyImportedLogoAsset(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  importedImage: ImportedImageAsset,
  selectedDiscTemplate: DiscTemplate,
  imageSource: ProjectImageAssetProvenance | null = null,
  additionalLogoId?: string,
): ProjectLogoAssets {
  const nextLogoAssets = setLogoAssetImage(
    logoAssets,
    logoKey,
    importedImage.imageDataUrl,
    importedImage.imageSize,
    imageSource,
    additionalLogoId,
  )
  const nextLayout = clampLogoAssetLayoutToSafeZone(
    getLogoAssetLayout(nextLogoAssets, logoKey, additionalLogoId),
    selectedDiscTemplate,
    getLogoAssetSize(nextLogoAssets, logoKey, additionalLogoId),
  )

  return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout, additionalLogoId)
}

export function applyImportedAdditionalArtwork(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
  importedImage: ImportedImageAsset,
  selectedDiscTemplate: DiscTemplate,
  importSource: AdditionalArtworkImportSource,
): ProjectAdditionalArtwork {
  const nextAdditionalArtwork = setAdditionalArtworkElementImage(
    additionalArtwork,
    elementId,
    importedImage,
    importSource,
  )
  const nextElement = nextAdditionalArtwork.elements.find(
    (element) => element.id === elementId,
  )

  if (!nextElement) {
    return additionalArtwork
  }

  const nextLayout = clampAdditionalArtworkElementLayoutToSafeZone(
    nextElement.layout,
    selectedDiscTemplate,
    nextElement.imageSize,
  )

  return setAdditionalArtworkElementLayout(
    nextAdditionalArtwork,
    elementId,
    nextLayout,
  )
}

export function applyImportedRatingBadge(
  ratingBadge: ProjectRatingBadge,
  importedImage: ImportedImageAsset,
  selectedDiscTemplate: DiscTemplate,
): ProjectRatingBadge {
  const nextBadge = setRatingBadgeCustomImage(
    ratingBadge,
    importedImage.imageDataUrl,
    importedImage.imageSize,
  )

  return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
}

export function applyImportedMediaMark(
  mediaMark: ProjectMediaMark,
  importedImage: ImportedImageAsset,
  selectedDiscTemplate: DiscTemplate,
): ProjectMediaMark {
  const nextMark = setMediaMarkCustomImage(
    mediaMark,
    importedImage.imageDataUrl,
    importedImage.imageSize,
  )

  return {
    ...nextMark,
    layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
  }
}

export function applyImportedPlatformMark(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  importedImage: ImportedImageAsset,
  selectedDiscTemplate: DiscTemplate,
): ProjectPlatformMarks {
  return clampProjectPlatformMarksToSafeZone(
    setPlatformMarkCustomImage(
      platformMarks,
      value,
      importedImage.imageDataUrl,
      importedImage.imageSize,
      selectedDiscTemplate,
    ),
    selectedDiscTemplate,
  )
}

export function applyImportedTechnicalMark(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  importedImage: ImportedImageAsset,
  selectedDiscTemplate: DiscTemplate,
  assetId?: string | null,
): ProjectTechnicalMarks {
  return clampProjectTechnicalMarksToSafeZone(
    setTechnicalMarkCustomImage(
      technicalMarks,
      value,
      importedImage.imageDataUrl,
      importedImage.imageSize,
      selectedDiscTemplate,
      assetId,
    ),
    selectedDiscTemplate,
  )
}
