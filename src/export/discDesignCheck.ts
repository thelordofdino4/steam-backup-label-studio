import {
  DISC_LAYOUT_CENTER_PERCENT,
  doesRectFitSafeAnnulus,
  doesRectFitTemplateSafeAnnulus,
  getInnerNoPrintRadiusPercent,
  getLogoAssetBoundsPercent,
  getSafeZoneRadiusPercent,
  getStraightDiscTextBoundsPercent,
  mmToPixels,
} from '../disc/geometry.ts'
import {
  DISC_TEXT_KEYS,
  getDiscTextContent,
  getDiscTextLabel,
  getReadableCurvedTextScale,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../discText/index.ts'
import {
  createDiscNumberBadgeRenderModel,
  getEffectiveDiscTextSettingsForDiscNumberArtwork,
} from '../discText/discNumberArtwork.ts'
import { DISC_TEXT_RENDER_STYLES, type DiscTextStyleSettings } from '../discText/styles.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'
import { createAdditionalArtworkRenderItems } from '../project/projectAdditionalArtwork.ts'
import {
  createLogoAssetRenderItems,
  getLogoAssetRenderSize,
} from '../project/projectLogoAssets.ts'
import {
  shouldRenderRatingBadge,
  shouldRenderSupplementalUskRatingBadge,
} from '../project/projectRatingBadge.ts'
import { createTitleArtworkRenderItem } from '../project/projectTitleArtwork.ts'
import type {
  BackgroundImageSize,
  ProjectAdditionalArtwork,
  ProjectDiscNumberArtwork,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
  SelectedDiscTemplateId,
} from '../project/projectTypes.ts'
import { createMediaMarkRenderModel } from '../render/mediaMarkRenderModel.ts'
import { createPlatformMarkRenderModels } from '../render/platformMarkRenderModel.ts'
import { createTechnicalMarkRenderModels } from '../render/technicalMarkRenderModel.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  createDesignCheckItem,
  getDesignCheckItemNotes,
  getDesignCheckItemWarnings,
  mergeUniqueWarnings,
  type DesignCheckItem,
  type DesignCheckSummary,
} from './designChecklist.ts'
import { buildDiscExportWarnings } from './exportPreflight.ts'
import {
  buildUpscaleWarnings,
  createMissingImageSizeWarning,
} from './preflightWarnings.ts'

const SAFE_EDGE_WARNING_MARGIN_PERCENT = 1.2
const MIN_PRINT_TEXT_SIZE_PX = 10
const MIN_CURVED_PRINT_TEXT_SIZE_PX = 9

export type DiscDesignCheckSummary = DesignCheckSummary

export function buildDiscDesignCheckSummary(params: {
  selectedDiscTemplateId: SelectedDiscTemplateId
  selectedDiscTemplate: DiscTemplate
  backgroundImageUrl: string | null
  backgroundImageSize: BackgroundImageSize | null
  backgroundScale: number
  steamLogoPlacement: SteamLogoPlacement
  projectLogoAssets: ProjectLogoAssets
  projectTitleArtwork: ProjectTitleArtwork
  projectAdditionalArtwork: ProjectAdditionalArtwork
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
  manualGameTitle: string
}): DiscDesignCheckSummary {
  const discContentSize = mmToPixels(params.selectedDiscTemplate.outerDiameterMm)
  const exportWarnings = buildDiscExportWarnings(
    params.selectedDiscTemplateId,
    params.selectedDiscTemplate,
    params.backgroundImageUrl,
    [],
    params.projectLogoAssets,
    params.projectTitleArtwork,
    params.projectMetadata,
    params.projectRatingBadge,
    params.projectMediaMark,
    params.projectPlatformMarks,
    params.projectTechnicalMarks,
  )
  const qualityWarnings = [
    ...getDiscImageQualityWarnings(params, discContentSize),
    ...getDiscTextQualityWarnings(params, discContentSize),
    ...getEmptyDiscWarnings(params),
  ]
  const checklistItems = getDiscGuideChecklistItems(params)
  const warnings = getDesignCheckItemWarnings(checklistItems)
  const notes = mergeUniqueWarnings(
    getDesignCheckItemNotes(checklistItems),
    exportWarnings,
    qualityWarnings,
  )

  const message = [
    warnings.length
      ? 'Review these disc design warnings before export.'
      : 'No disc design warnings found.',
    ...(warnings.length
      ? ['', 'Warnings:', ...warnings.map((warning) => `- ${warning}`)]
      : []),
    ...(notes.length ? ['', 'Notes:', ...notes.map((note) => `- ${note}`)] : []),
  ].join('\n')

  return {
    message,
    hasWarnings: warnings.length > 0,
    warnings,
    notes,
    items: checklistItems,
  }
}

function getDiscGuideChecklistItems(
  params: Parameters<typeof buildDiscDesignCheckSummary>[0],
): DesignCheckItem[] {
  const hasTitleArtwork = Boolean(
    createTitleArtworkRenderItem(params.projectTitleArtwork),
  )
  const hasVisibleTitleText = isDiscTextVisible('title', params)
  const hasVisibleLegalText = isDiscTextVisible('copyright', params)
  const hasGameInfoMark = hasVisibleDiscGameInfoMark(params)

  return [
    createDesignCheckItem({
      id: 'disc-background',
      label: 'Background artwork',
      passes: Boolean(params.backgroundImageUrl),
      passDetail: 'Background artwork is in place.',
      warningDetail:
        'Add background artwork so the disc does not print as a mostly blank label.',
    }),
    createDesignCheckItem({
      id: 'disc-title',
      label: 'Game title',
      passes: hasTitleArtwork || hasVisibleTitleText,
      passDetail: hasTitleArtwork
        ? 'Title/logo artwork is visible.'
        : 'Game title text is visible.',
      warningDetail:
        'Add a visible game title or title/logo artwork so the disc is identifiable at a glance.',
    }),
    createDesignCheckItem({
      id: 'disc-game-info-marks',
      label: 'Info marks',
      passes: hasGameInfoMark,
      passDetail:
        'A rating, media, platform, or technical mark is visible.',
      warningDetail:
        'Add at least one rating badge, media format mark, platform mark, or technical logo.',
    }),
    createDesignCheckItem({
      id: 'disc-company-logos',
      label: 'Company logos',
      passes: createLogoAssetRenderItems(params.projectLogoAssets).length > 0,
      passDetail: 'A developer, publisher, or related company logo is visible.',
      warningDetail:
        "Add a developer, publisher, or related company logo to anchor the label's branding.",
    }),
    createDesignCheckItem({
      id: 'disc-legal-text',
      label: 'Legal text',
      passes: hasVisibleLegalText,
      passDetail: 'Copyright/legal text is visible.',
      warningDetail:
        'Add copyright/legal text for attribution and usage context.',
    }),
    createDesignCheckItem({
      id: 'disc-title-overlap-risk',
      label: 'Title overlap',
      passes: !(hasTitleArtwork && hasVisibleTitleText),
      passDetail: 'Only one main title treatment is visible.',
      warningDetail:
        'Title/logo artwork and game title text are both visible; make sure they are not competing for the same space.',
      warningStatus: 'note',
    }),
  ]
}

function getDiscImageQualityWarnings(
  params: Parameters<typeof buildDiscDesignCheckSummary>[0],
  discContentSize: number,
) {
  const warnings: string[] = []

  warnings.push(
    ...getBackgroundResolutionWarnings(
      params.backgroundImageUrl,
      params.backgroundImageSize,
      params.backgroundScale,
      discContentSize,
    ),
  )

  const titleArtwork = createTitleArtworkRenderItem(params.projectTitleArtwork)

  if (params.projectTitleArtwork.imageDataUrl && !params.projectTitleArtwork.imageSize) {
    warnings.push(createMissingImageSizeWarning('Title/logo artwork'))
  }

  if (titleArtwork) {
    warnings.push(
      ...getPercentImageResolutionWarnings(
        titleArtwork.label,
        titleArtwork.imageSize,
        titleArtwork.scaledBounds,
        discContentSize,
      ),
    )
  }

  for (const artwork of createAdditionalArtworkRenderItems(params.projectAdditionalArtwork)) {
    warnings.push(
      ...getPercentImageResolutionWarnings(
        artwork.label,
        artwork.imageSize,
        artwork.scaledBounds,
        discContentSize,
      ),
    )
  }

  for (const element of params.projectAdditionalArtwork.elements) {
    if (element.imageDataUrl && !element.imageSize) {
      warnings.push(createMissingImageSizeWarning(element.label))
    }
  }

  for (const logoAsset of createLogoAssetRenderItems(params.projectLogoAssets)) {
    if (logoAsset.imageDataUrl && !logoAsset.imageSize) {
      warnings.push(createMissingImageSizeWarning(`${logoAsset.label} logo`))
      continue
    }

    if (!logoAsset.imageDataUrl || !logoAsset.imageSize) {
      continue
    }

    warnings.push(
      ...getPercentImageResolutionWarnings(
        `${logoAsset.label} logo`,
        logoAsset.imageSize,
        getLogoAssetBoundsPercent(
          getLogoAssetRenderSize(logoAsset.imageSize),
          logoAsset.layout.scale,
        ),
        discContentSize,
      ),
    )
  }

  return warnings
}

function getBackgroundResolutionWarnings(
  backgroundImageUrl: string | null,
  backgroundImageSize: BackgroundImageSize | null,
  backgroundScale: number,
  discContentSize: number,
) {
  if (!backgroundImageUrl) {
    return []
  }

  if (!backgroundImageSize) {
    return [createMissingImageSizeWarning('Background artwork')]
  }

  const contentSize = getImageContentSize(backgroundImageSize)

  if (!contentSize) {
    return [createMissingImageSizeWarning('Background artwork')]
  }

  const coverScale = Math.max(
    discContentSize / contentSize.width,
    discContentSize / contentSize.height,
  )
  const drawScale = coverScale * backgroundScale

  return buildUpscaleWarnings(
    'Background artwork',
    contentSize,
    {
      width: contentSize.width * drawScale,
      height: contentSize.height * drawScale,
    },
    1.15,
  )
}

function getPercentImageResolutionWarnings(
  label: string,
  imageSize: BackgroundImageSize,
  bounds: { halfWidth: number; halfHeight: number },
  discContentSize: number,
) {
  const contentSize = getImageContentSize(imageSize)

  if (!contentSize) {
    return [createMissingImageSizeWarning(label)]
  }

  return buildUpscaleWarnings(label, contentSize, {
    width: discContentSize * ((bounds.halfWidth * 2) / 100),
    height: discContentSize * ((bounds.halfHeight * 2) / 100),
  })
}

function getDiscTextQualityWarnings(
  params: Parameters<typeof buildDiscDesignCheckSummary>[0],
  discContentSize: number,
) {
  const warnings: string[] = []
  const discNumberBadge = createDiscNumberBadgeRenderModel(
    params.projectDiscNumberArtwork,
    params.discTextSettings,
    params.discTextValues,
    params.discTextLayout,
  )
  const effectiveSettings = getEffectiveDiscTextSettingsForDiscNumberArtwork(
    params.discTextSettings,
    params.projectDiscNumberArtwork,
  )

  for (const key of DISC_TEXT_KEYS) {
    if (!effectiveSettings[key]) {
      continue
    }

    const label = getDiscTextLabel(key)
    const text = getDiscTextContent(
      key,
      params.discTextValues,
      params.manualGameTitle,
    ).trim()

    if (!text) {
      warnings.push(`${label} is enabled, but empty; it will not render.`)
      continue
    }

    if (discNumberBadge && key === 'discNumber') {
      continue
    }

    const layout = params.discTextLayout[key]

    if (key === 'copyright' && layout.mode === 'curved') {
      warnings.push(
        ...getCurvedTextQualityWarnings(
          label,
          layout.scale,
          discContentSize,
        ),
      )
      continue
    }

    const bounds = getStraightDiscTextBoundsPercent(key, layout)
    const point = {
      x: DISC_LAYOUT_CENTER_PERCENT + layout.x,
      y: layout.y,
    }
    const fontSizePx =
      (DISC_TEXT_RENDER_STYLES[key].fontSizePercent *
        Math.max(0, layout.scale) *
        discContentSize) /
      100

    if (fontSizePx < MIN_PRINT_TEXT_SIZE_PX) {
      warnings.push(
        `${label} uses about ${Math.round(fontSizePx)}px text in the export and may be hard to read in print.`,
      )
    }

    warnings.push(
      ...getTextSafeZoneWarnings(label, point, bounds, params.selectedDiscTemplate),
    )
  }

  return warnings
}

function getCurvedTextQualityWarnings(
  label: string,
  scale: number,
  discContentSize: number,
) {
  const fontSizePx =
    (1.55 * getReadableCurvedTextScale(scale) * discContentSize) / 100

  return fontSizePx < MIN_CURVED_PRINT_TEXT_SIZE_PX
    ? [
        `${label} uses about ${Math.round(fontSizePx)}px curved text in the export and may be hard to read in print.`,
      ]
    : []
}

function getTextSafeZoneWarnings(
  label: string,
  point: { x: number; y: number },
  bounds: { halfWidth: number; halfHeight: number },
  template: DiscTemplate,
) {
  const innerRadius = getInnerNoPrintRadiusPercent(template)
  const safeRadius = getSafeZoneRadiusPercent(template)

  if (!doesRectFitTemplateSafeAnnulus(point, template, bounds)) {
    return [
      `${label} may sit outside the safe print zone or too close to the center hole.`,
    ]
  }

  const insetInnerRadius = Math.min(
    safeRadius,
    innerRadius + SAFE_EDGE_WARNING_MARGIN_PERCENT,
  )
  const insetSafeRadius = Math.max(
    insetInnerRadius,
    safeRadius - SAFE_EDGE_WARNING_MARGIN_PERCENT,
  )

  return doesRectFitSafeAnnulus(point, insetInnerRadius, insetSafeRadius, bounds)
    ? []
    : [`${label} is close to the safe-zone edge.`]
}

function getEmptyDiscWarnings(params: Parameters<typeof buildDiscDesignCheckSummary>[0]) {
  const hasTextContent = DISC_TEXT_KEYS.some((key) =>
    params.discTextSettings[key] &&
    getDiscTextContent(key, params.discTextValues, params.manualGameTitle).trim())
  const hasVisibleContent =
    Boolean(params.backgroundImageUrl) ||
    params.steamLogoPlacement !== 'none' ||
    Boolean(createTitleArtworkRenderItem(params.projectTitleArtwork)) ||
    createAdditionalArtworkRenderItems(params.projectAdditionalArtwork).length > 0 ||
    createLogoAssetRenderItems(params.projectLogoAssets).length > 0 ||
    shouldRenderRatingBadge(params.projectMetadata, params.projectRatingBadge) ||
    shouldRenderSupplementalUskRatingBadge(
      params.projectMetadata,
      params.projectRatingBadge,
    ) ||
    Boolean(createMediaMarkRenderModel(params.projectMediaMark)) ||
    createPlatformMarkRenderModels(params.projectPlatformMarks).length > 0 ||
    createTechnicalMarkRenderModels(params.projectTechnicalMarks).length > 0 ||
    hasTextContent

  return hasVisibleContent
    ? []
    : ['No visible disc design content is enabled; the exported label may be blank.']
}

function isDiscTextVisible(
  key: 'title' | 'copyright',
  params: Parameters<typeof buildDiscDesignCheckSummary>[0],
) {
  return Boolean(
    params.discTextSettings[key] &&
      getDiscTextContent(
        key,
        params.discTextValues,
        params.manualGameTitle,
      ).trim(),
  )
}

function hasVisibleDiscGameInfoMark(
  params: Parameters<typeof buildDiscDesignCheckSummary>[0],
) {
  return (
    shouldRenderRatingBadge(params.projectMetadata, params.projectRatingBadge) ||
    shouldRenderSupplementalUskRatingBadge(
      params.projectMetadata,
      params.projectRatingBadge,
    ) ||
    Boolean(createMediaMarkRenderModel(params.projectMediaMark)) ||
    createPlatformMarkRenderModels(params.projectPlatformMarks).length > 0 ||
    createTechnicalMarkRenderModels(params.projectTechnicalMarks).length > 0
  )
}
