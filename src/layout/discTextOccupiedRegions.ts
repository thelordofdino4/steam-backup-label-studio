import {
  getLogoAssetBoundsPercent,
  getRatingBadgeBoundsPercent,
} from '../disc/geometry.ts'
import { getRatingBadgePlaceholderImageSize } from '../assets/assetManifest.ts'
import { DISC_TEXT_KEYS } from '../discText/constants.ts'
import {
  getDiscTextContent,
  getDiscTextHtmlSource,
  getDiscTextLabel,
  isDiscTextHtmlEnabled,
} from '../discText/index.ts'
import type {
  DiscTextKey,
  DiscTextLayoutSettings,
  DiscTextHtmlSources,
  DiscTextSettings,
  DiscTextValues,
} from '../discText/types'
import {
  createDiscTextAvoidanceRegionFromBounds,
  type DiscTextAvoidanceRegion,
} from '../discText/avoidance.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from '../discText/renderLayout.ts'
import type { DiscTextStyleSettings } from '../discText/styles.ts'
import { createDiscNumberBadgeRenderModel } from '../discText/discNumberArtwork.ts'
import { createMediaMarkRenderModel } from '../render/mediaMarkRenderModel.ts'
import { createPlatformMarkRenderModels } from '../render/platformMarkRenderModel.ts'
import { createAdditionalArtworkRenderItems } from '../project/projectAdditionalArtwork.ts'
import { createLogoAssetRenderItems, getLogoAssetRenderSize } from '../project/projectLogoAssets.ts'
import {
  shouldRenderRatingBadge,
  shouldRenderSupplementalUskRatingBadge,
  shouldUseCustomRatingBadgeImage,
} from '../project/projectRatingBadge.ts'
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
import { createTechnicalMarkRenderModels } from '../render/technicalMarkRenderModel.ts'
import { parseHtmlText } from '../text/htmlText.ts'
import type { DiscTemplate } from '../types/template.ts'

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
  discTextHtmlSources?: DiscTextHtmlSources
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
  discTextTitle: string
  measureText: TextMeasureFunction
  selectedDiscTemplate: DiscTemplate
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
  discTextHtmlSources = {},
  discTextLayout,
  discTextStyles,
  discTextTitle,
  measureText,
  selectedDiscTemplate,
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
    const ratingImageSize =
      shouldUseCustomRatingBadgeImage(projectRatingBadge) &&
      projectRatingBadge.customImageSize
        ? projectRatingBadge.customImageSize
        : getRatingBadgePlaceholderImageSize(projectMetadata)
    const ratingBounds =
      getRatingBadgeBoundsPercent(
        ratingImageSize,
        projectRatingBadge.layout.scale,
      )

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

  if (shouldRenderSupplementalUskRatingBadge(projectMetadata, projectRatingBadge)) {
    const uskBadgeImageSize = getRatingBadgePlaceholderImageSize({
      ratingSystem: 'USK',
      ratingValue: projectRatingBadge.uskBadge.ratingValue,
    })

    regions.push(
      createDiscTextAvoidanceRegionFromBounds(
        'rating-badge-usk',
        'Additional USK rating badge',
        projectRatingBadge.uskBadge.layout.x,
        projectRatingBadge.uskBadge.layout.y,
        getRatingBadgeBoundsPercent(
          uskBadgeImageSize,
          projectRatingBadge.uskBadge.layout.scale,
        ),
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

    const fallbackText = getDiscTextContent(key, discTextValues, discTextTitle)
    const htmlDocument = isDiscTextHtmlEnabled(
      discTextHtmlSources,
      key,
    )
      ? parseHtmlText(
          getDiscTextHtmlSource(discTextHtmlSources, key, fallbackText),
        )
      : null
    const text = (htmlDocument?.plainText ?? fallbackText).trim()
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
      htmlDocument
        ? { richText: htmlDocument, template: selectedDiscTemplate }
        : { template: selectedDiscTemplate },
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
