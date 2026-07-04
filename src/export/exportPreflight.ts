import { EXPORT_DPI, mmToPixels } from '../disc/geometry.ts'
import {
  DISC_TEXT_KEYS,
  getDiscTextLabel,
  type DiscTextSettings,
  type SteamLogoPlacement,
} from '../discText/index.ts'
import type { ExportGuideKey, ExportGuideSelection } from './exportGuides.ts'
import {
  createMediaMarkRenderModel,
} from '../render/mediaMarkRenderModel.ts'
import { createPlatformMarkRenderModels } from '../render/platformMarkRenderModel.ts'
import { canUseTitleArtwork } from '../project/projectTitleArtwork.ts'
import type {
  BackgroundImageSize,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
  SelectedDiscTemplateId,
} from '../project/projectTypes.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import { createTechnicalMarkRenderModels } from '../render/technicalMarkRenderModel.ts'
import {
  normalizeSteamBannerFallbackText,
  shouldRenderSteamBannerTextFallback,
} from '../branding/steamBannerDefaults.ts'
import {
  isOptionalLayoutFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  getMarkImageSourceStatus,
} from '../editor/markImageSource.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  buildGuideExportWarnings,
  createCustomMarkMissingImageWarning,
  createMissingBackgroundWarning,
  createMissingImageWarning,
  formatMillimeters,
} from './preflightWarnings.ts'

const EXPORT_OUTLINE_WIDTH_PX = 3

const GUIDE_LABELS: Record<ExportGuideKey, string> = {
  centerHole: 'Center hole',
  outerEdge: 'Outer edge',
  printableArea: 'Printable area',
  safeZone: 'Safe zone',
}

const BRANDING_LABELS: Record<SteamLogoPlacement, string> = {
  top: 'Top',
  bottom: 'Bottom',
  none: 'None',
}

export type ExportPreflightSummary = {
  message: string
  hasWarnings: boolean
  warnings: string[]
}

export function buildExportPreflightSummary(params: {
  selectedDiscTemplateId: SelectedDiscTemplateId
  selectedDiscTemplate: DiscTemplate
  backgroundImageUrl: string | null
  backgroundImageSize: BackgroundImageSize | null
  selectedSteamGame: SteamImportedGame | null
  manualGameTitle: string
  steamLogoPlacement: SteamLogoPlacement
  steamBannerUseTextFallback: boolean
  steamBannerFallbackText: string
  steamBannerLockupImageUrl: string | null
  discTextSettings: DiscTextSettings
  projectLogoAssets: ProjectLogoAssets
  projectTitleArtwork: ProjectTitleArtwork
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
  exportGuides: ExportGuideSelection
}): ExportPreflightSummary {
  const exportSize =
    mmToPixels(params.selectedDiscTemplate.outerDiameterMm) + EXPORT_OUTLINE_WIDTH_PX * 2
  const enabledGuideLabels = getEnabledGuideLabels(params.exportGuides)
  const enabledTextLabels = DISC_TEXT_KEYS.filter((key) => params.discTextSettings[key]).map(
    getDiscTextLabel,
  )
  const warnings = buildDiscExportWarnings(
    params.selectedDiscTemplateId,
    params.selectedDiscTemplate,
    params.backgroundImageUrl,
    enabledGuideLabels,
    params.projectLogoAssets,
    params.projectTitleArtwork,
    params.projectMetadata,
    params.projectRatingBadge,
    params.projectMediaMark,
    params.projectPlatformMarks,
    params.projectTechnicalMarks,
  )

  const summaryLines = [
    `Template: ${params.selectedDiscTemplate.name}`,
    `Physical size: ${formatMillimeters(params.selectedDiscTemplate.outerDiameterMm)} mm outer, ${formatMillimeters(params.selectedDiscTemplate.printableDiameterMm)} mm printable, ${formatMillimeters(params.selectedDiscTemplate.physicalCenterHoleDiameterMm)} mm center hole, ${formatMillimeters(params.selectedDiscTemplate.safeDiameterMm)} mm safe zone`,
    `PNG output: ${exportSize} x ${exportSize} px at ${EXPORT_DPI} DPI`,
    'Center hole cutout: Yes',
    `${EXPORT_OUTLINE_WIDTH_PX} px outer outline: Included`,
    `Guide marks: ${enabledGuideLabels.length ? enabledGuideLabels.join(', ') : 'None'}`,
    `Background image: ${formatBackgroundStatus(params.backgroundImageUrl, params.backgroundImageSize)}`,
    `Metadata: ${formatMetadataStatus(params.selectedSteamGame, params.manualGameTitle)}`,
    `Steam Backup branding: ${formatBrandingStatus(
      params.steamLogoPlacement,
      params.steamBannerUseTextFallback,
      params.steamBannerLockupImageUrl,
      params.steamBannerFallbackText,
    )}`,
    `Optional text: ${enabledTextLabels.length ? enabledTextLabels.join(', ') : 'None'}`,
  ]

  const message = [
    'Review this export before writing the PNG.',
    '',
    ...summaryLines,
    ...(warnings.length ? ['', 'Warnings:', ...warnings.map((warning) => `- ${warning}`)] : []),
    '',
    'Continue with export?',
  ].join('\n')

  return {
    message,
    hasWarnings: warnings.length > 0,
    warnings,
  }
}

function formatBrandingStatus(
  placement: SteamLogoPlacement,
  useTextFallback: boolean,
  lockupImageUrl: string | null,
  fallbackText: string,
) {
  if (placement === 'none') {
    return BRANDING_LABELS.none
  }

  const lockupMode = shouldRenderSteamBannerTextFallback(useTextFallback, lockupImageUrl)
    ? `text lockup "${normalizeSteamBannerFallbackText(fallbackText)}"`
    : 'image lockup'

  return `${BRANDING_LABELS[placement]}, ${lockupMode}`
}

function getEnabledGuideLabels(exportGuides: ExportGuideSelection) {
  return Object.entries(exportGuides)
    .filter(([, isEnabled]) => isEnabled)
    .map(([guideKey]) => GUIDE_LABELS[guideKey as ExportGuideKey])
}

export function buildDiscExportWarnings(
  selectedDiscTemplateId: SelectedDiscTemplateId,
  selectedDiscTemplate: DiscTemplate,
  backgroundImageUrl: string | null,
  enabledGuideLabels: string[],
  _projectLogoAssets: ProjectLogoAssets,
  projectTitleArtwork: ProjectTitleArtwork,
  projectMetadata: ProjectMetadata,
  projectRatingBadge: ProjectRatingBadge,
  projectMediaMark: ProjectMediaMark,
  projectPlatformMarks: ProjectPlatformMarks,
  projectTechnicalMarks: ProjectTechnicalMarks,
) {
  const warnings: string[] = []

  warnings.push(...buildGuideExportWarnings(enabledGuideLabels.length > 0))

  if (!backgroundImageUrl) {
    warnings.push(
      createMissingBackgroundWarning(
        null,
        'the export will use the default blank disc fill',
      ),
    )
  }

  if (selectedDiscTemplateId === 'custom') {
    warnings.push(...getCustomDimensionWarnings(selectedDiscTemplate))
  }

  warnings.push(...getTitleArtworkWarnings(projectTitleArtwork))
  warnings.push(...getRatingBadgeWarnings(projectMetadata, projectRatingBadge))
  warnings.push(...getMediaMarkWarnings(projectMediaMark))
  warnings.push(...getPlatformMarkWarnings(projectPlatformMarks))
  warnings.push(...getTechnicalMarkWarnings(projectTechnicalMarks))

  return warnings
}

function getTitleArtworkWarnings(titleArtwork: ProjectTitleArtwork) {
  if (
    !isOptionalLayoutFeatureEnabled(titleArtwork) ||
    canUseTitleArtwork(titleArtwork)
  ) {
    return []
  }

  return [
    createMissingImageWarning('Title/logo artwork', {
      imageDescription: 'Steam or custom title artwork image',
      exportTarget: 'exported PNG',
    }),
  ]
}

function getRatingBadgeWarnings(
  metadata: ProjectMetadata,
  ratingBadge: ProjectRatingBadge,
) {
  const warnings: string[] = []

  if (!isOptionalLayoutFeatureEnabled(ratingBadge)) {
    return warnings
  }

  if (metadata.ratingSystem === 'none') {
    warnings.push('Rating badge is enabled, but the rating system is set to none.')
  } else if (!metadata.ratingValue.trim()) {
    warnings.push('Rating badge is enabled, but no rating value is set.')
  }

  const sourceStatus = getMarkImageSourceStatus(ratingBadge)

  if (sourceStatus.isCustomSource && !sourceStatus.hasCustomImage) {
    warnings.push(
      createCustomMarkMissingImageWarning('rating badge', 'ratingBadge'),
    )
  }

  return warnings
}

function getMediaMarkWarnings(mediaMark: ProjectMediaMark) {
  const model = createMediaMarkRenderModel(mediaMark)

  if (!model) {
    return []
  }

  const sourceStatus = getMarkImageSourceStatus(mediaMark)

  if (sourceStatus.isCustomSource && !sourceStatus.hasCustomImage) {
    return [
      createCustomMarkMissingImageWarning(model.label, 'mediaMark'),
    ]
  }

  return []
}

function getPlatformMarkWarnings(platformMarks: ProjectPlatformMarks) {
  return createPlatformMarkRenderModels(platformMarks).flatMap((model) => {
    const sourceStatus = getMarkImageSourceStatus(model.asset)

    if (sourceStatus.isCustomSource && !sourceStatus.hasCustomImage) {
      return [
        createCustomMarkMissingImageWarning(
          model.label,
          'operatingSystemMark',
        ),
      ]
    }

    return []
  })
}

function getTechnicalMarkWarnings(technicalMarks: ProjectTechnicalMarks) {
  return createTechnicalMarkRenderModels(technicalMarks).flatMap((model) => {
    const sourceStatus = getMarkImageSourceStatus(model.asset)

    if (sourceStatus.isCustomSource && !sourceStatus.hasCustomImage) {
      return [
        createCustomMarkMissingImageWarning(model.label, 'technicalMark'),
      ]
    }

    return []
  })
}

function getCustomDimensionWarnings(template: DiscTemplate) {
  const warnings: string[] = []

  if (template.outerDiameterMm < 110 || template.outerDiameterMm > 125) {
    warnings.push('Custom outer diameter is outside the common 110-125 mm disc-label range.')
  }

  if (template.physicalCenterHoleDiameterMm < 10 || template.physicalCenterHoleDiameterMm > 25) {
    warnings.push('Custom physical center hole is outside the common spindle-hole range.')
  }

  if (template.innerHoleDiameterMm < template.physicalCenterHoleDiameterMm) {
    warnings.push('Custom inner printable boundary is smaller than the physical center hole.')
  }

  if (template.printableDiameterMm > template.outerDiameterMm) {
    warnings.push('Custom printable diameter is larger than the outer disc diameter.')
  }

  if (template.safeDiameterMm > template.printableDiameterMm) {
    warnings.push('Custom safe zone is larger than the printable area.')
  }

  return warnings
}

function formatBackgroundStatus(
  backgroundImageUrl: string | null,
  backgroundImageSize: BackgroundImageSize | null,
) {
  if (!backgroundImageUrl) return 'None'
  if (!backgroundImageSize) return 'Present'

  return `Present (${backgroundImageSize.width} x ${backgroundImageSize.height} px)`
}

function formatMetadataStatus(selectedSteamGame: SteamImportedGame | null, manualGameTitle: string) {
  if (selectedSteamGame) {
    return `Steam metadata for ${selectedSteamGame.title} (App ID ${selectedSteamGame.appId})`
  }

  return `Manual/blank project (${manualGameTitle || 'Untitled'})`
}
