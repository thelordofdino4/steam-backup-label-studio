import {
  clampLogoAssetLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampProjectPlatformMarksToSafeZone,
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
import type {
  PlatformMarkValue,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectPlatformMarks,
  ProjectRatingBadge,
} from './projectTypes'

export function applyImportedLogoAsset(
  logoAssets: ProjectLogoAssets,
  logoKey: LogoAssetKey,
  importedImage: ImportedImageAsset,
  selectedDiscTemplate: DiscTemplate,
): ProjectLogoAssets {
  const nextLogoAssets = setLogoAssetImage(
    logoAssets,
    logoKey,
    importedImage.imageDataUrl,
    importedImage.imageSize,
  )
  const nextLayout = clampLogoAssetLayoutToSafeZone(
    getLogoAssetLayout(nextLogoAssets, logoKey),
    selectedDiscTemplate,
    getLogoAssetSize(nextLogoAssets, logoKey),
  )

  return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout)
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
