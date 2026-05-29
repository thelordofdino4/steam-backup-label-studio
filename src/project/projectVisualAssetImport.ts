import {
  clampLogoAssetLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampProjectPlatformMarksToSafeZone,
  clampProjectTechnicalMarksToSafeZone,
  clampRatingBadgeLayoutToSafeZone,
} from '../layout/discElementSafeZone.ts'
import type { DiscTemplate } from '../types/template'
import type { ImportedImageAsset } from '../utils/importedImageAsset'
import {
  getLogoAssetLayout,
  getLogoAssetSize,
  setLogoAssetImage,
  setLogoAssetLayout,
  type LogoAssetKey,
} from './projectLogoAssets.ts'
import { setMediaMarkCustomImage, setPlatformMarkCustomImage } from './projectMediaMark.ts'
import { setRatingBadgeCustomImage } from './projectRatingBadge.ts'
import { setTechnicalMarkCustomImage } from './projectTechnicalMarks.ts'
import type {
  PlatformMarkValue,
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
  additionalLogoId?: string,
): ProjectLogoAssets {
  const nextLogoAssets = setLogoAssetImage(
    logoAssets,
    logoKey,
    importedImage.imageDataUrl,
    importedImage.imageSize,
    additionalLogoId,
  )
  const nextLayout = clampLogoAssetLayoutToSafeZone(
    getLogoAssetLayout(nextLogoAssets, logoKey, additionalLogoId),
    selectedDiscTemplate,
    getLogoAssetSize(nextLogoAssets, logoKey, additionalLogoId),
  )

  return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout, additionalLogoId)
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

  return {
    ...nextBadge,
    layout: clampRatingBadgeLayoutToSafeZone(nextBadge, selectedDiscTemplate),
  }
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
): ProjectTechnicalMarks {
  return clampProjectTechnicalMarksToSafeZone(
    setTechnicalMarkCustomImage(
      technicalMarks,
      value,
      importedImage.imageDataUrl,
      importedImage.imageSize,
      selectedDiscTemplate,
    ),
    selectedDiscTemplate,
  )
}
