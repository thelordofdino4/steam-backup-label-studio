import {
  getLogoAssetBoundsPercent,
  getRatingBadgeBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
} from '../discGeometry.ts'
import {
  DISC_TEXT_KEYS,
  getDiscTextContent,
  getDiscTextLabel,
  type DiscTextKey,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
} from '../discText.ts'
import {
  createDiscTextAvoidanceRegionFromBounds,
  type DiscTextAvoidanceRegion,
} from '../discTextAvoidance.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from '../discTextRenderLayout.ts'
import type { DiscTextStyleSettings } from '../discTextStyles.ts'
import { createDiscNumberBadgeRenderModel } from '../discNumberArtwork.ts'
import { createMediaMarkRenderModel, createPlatformMarkRenderModels } from '../mediaMarkRenderModel.ts'
import { createAdditionalArtworkRenderItems } from '../project/projectAdditionalArtwork.ts'
import { createLogoAssetRenderItems, getLogoAssetRenderSize } from '../project/projectLogoAssets.ts'
import { shouldRenderRatingBadge, shouldUseCustomRatingBadgeImage } from '../project/projectRatingBadge.ts'
import { createTitleArtworkRenderItem } from '../project/projectTitleArtwork.ts'
import type {
  ProjectAdditionalArtwork,
  ProjectDiscNumberArtwork,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
} from '../project/projectTypes.ts'
import { createTechnicalMarkRenderModels } from '../technicalMarkRenderModel.ts'

const DISC_TEXT_TO_TEXT_AVOIDANCE_GAP_PERCENT = 0.8

export type DiscTextOccupiedRegionParams = {
  projectTitleArtwork: ProjectTitleArtwork
  projectLogoAssets: ProjectLogoAssets
  projectAdditionalArtwork: ProjectAdditionalArtwork
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
  discTextTitle: string
  measureText: TextMeasureFunction
}

function createDiscTextRegion(
  key: DiscTextKey,
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
): DiscTextAvoidanceRegion {
  return {
    ...createDiscTextAvoidanceRegionFromBounds(
      `disc-text-${key}`,
      getDiscTextLabel(key),
      centerX,
      centerY,
      { halfWidth, halfHeight },
      DISC_TEXT_TO_TEXT_AVOIDANCE_GAP_PERCENT,
    ),
    sourceDiscTextKey: key,
  }
}

export function createDiscTextOccupiedRegions({
  projectTitleArtwork,
  projectLogoAssets,
  projectAdditionalArtwork,
  projectMetadata,
  projectRatingBadge,
  projectMediaMark,
  projectPlatformMarks,
  projectTechnicalMarks,
  projectDiscNumberArtwork,
  discTextSettings,
  discTextValues,
  discTextLayout,
  discTextStyles,
  discTextTitle,
  measureText,
}: DiscTextOccupiedRegionParams): DiscTextAvoidanceRegion[] {
  const regions: DiscTextAvoidanceRegion[] = []
  const titleArtwork = createTitleArtworkRenderItem(projectTitleArtwork)

  if (titleArtwork) {
    regions.push(
      createDiscTextAvoidanceRegionFromBounds(
        'title-artwork',
        'Title artwork',
        titleArtwork.layout.x,
        titleArtwork.layout.y,
        titleArtwork.scaledBounds,
      ),
    )
  }

  for (const logoAsset of createLogoAssetRenderItems(projectLogoAssets)) {
    const renderSize = getLogoAssetRenderSize(logoAsset.imageSize)

    regions.push(
      createDiscTextAvoidanceRegionFromBounds(
        `logo-${logoAsset.additionalLogoId ?? logoAsset.logoKey}`,
        logoAsset.label,
        logoAsset.layout.x,
        logoAsset.layout.y,
        getLogoAssetBoundsPercent(renderSize, logoAsset.layout.scale),
      ),
    )
  }

  for (const artwork of createAdditionalArtworkRenderItems(projectAdditionalArtwork)) {
    regions.push(
      createDiscTextAvoidanceRegionFromBounds(
        `additional-artwork-${artwork.id}`,
        artwork.label,
        artwork.layout.x,
        artwork.layout.y,
        artwork.scaledBounds,
      ),
    )
  }

  if (shouldRenderRatingBadge(projectMetadata, projectRatingBadge)) {
    const ratingBounds =
      shouldUseCustomRatingBadgeImage(projectRatingBadge) &&
      projectRatingBadge.customImageSize
        ? getRatingBadgeBoundsPercent(
            projectRatingBadge.customImageSize,
            projectRatingBadge.layout.scale,
          )
        : getRatingBadgePlaceholderBoundsPercent(projectRatingBadge.layout.scale)

    regions.push(
      createDiscTextAvoidanceRegionFromBounds(
        'rating-badge',
        'Rating badge',
        projectRatingBadge.layout.x,
        projectRatingBadge.layout.y,
        ratingBounds,
      ),
    )
  }

  const mediaMark = createMediaMarkRenderModel(projectMediaMark)

  if (mediaMark) {
    regions.push(
      createDiscTextAvoidanceRegionFromBounds(
        'media-mark',
        mediaMark.label,
        mediaMark.layout.x,
        mediaMark.layout.y,
        mediaMark.scaledBounds,
      ),
    )
  }

  for (const platformMark of createPlatformMarkRenderModels(projectPlatformMarks)) {
    regions.push(
      createDiscTextAvoidanceRegionFromBounds(
        `platform-mark-${platformMark.value}`,
        platformMark.label,
        platformMark.layout.x,
        platformMark.layout.y,
        platformMark.scaledBounds,
      ),
    )
  }

  for (const technicalMark of createTechnicalMarkRenderModels(projectTechnicalMarks)) {
    regions.push(
      createDiscTextAvoidanceRegionFromBounds(
        `technical-mark-${technicalMark.value}`,
        technicalMark.label,
        technicalMark.layout.x,
        technicalMark.layout.y,
        technicalMark.scaledBounds,
      ),
    )
  }

  const discNumberBadge = createDiscNumberBadgeRenderModel(
    projectDiscNumberArtwork,
    discTextSettings,
    discTextValues,
    discTextLayout,
  )

  if (discNumberBadge) {
    regions.push({
      id: 'disc-number-badge',
      label: discNumberBadge.label,
      left: Math.max(
        0,
        discNumberBadge.layout.x -
          (discNumberBadge.widthPercent * discNumberBadge.layout.scale) / 2,
      ),
      right: Math.min(
        100,
        discNumberBadge.layout.x +
          (discNumberBadge.widthPercent * discNumberBadge.layout.scale) / 2,
      ),
      top: Math.max(
        0,
        discNumberBadge.layout.y -
          (discNumberBadge.heightPercent * discNumberBadge.layout.scale) / 2,
      ),
      bottom: Math.min(
        100,
        discNumberBadge.layout.y +
          (discNumberBadge.heightPercent * discNumberBadge.layout.scale) / 2,
      ),
    })
  }

  for (const key of DISC_TEXT_KEYS) {
    if (!discTextSettings[key]) continue

    const layout = discTextLayout[key]
    if (layout.mode !== 'straight') continue

    const text = getDiscTextContent(key, discTextValues, discTextTitle).trim()
    if (!text) continue

    const renderLayout = getStraightDiscTextRenderLayout(
      key,
      text,
      {
        ...layout,
        avoidVisualElements: false,
      },
      measureText,
      discTextStyles,
    )
    const bounds = getStraightDiscTextVisualBounds(renderLayout, measureText)

    if (bounds.halfWidth <= 0 || bounds.halfHeight <= 0) continue

    regions.push(
      createDiscTextRegion(
        key,
        bounds.centerX,
        bounds.centerY,
        bounds.halfWidth,
        bounds.halfHeight,
      ),
    )
  }

  return regions
}
