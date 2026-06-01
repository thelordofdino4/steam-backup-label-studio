import { EXPORT_DPI, mmToPixels } from '../discGeometry.ts'
import {
  DISC_TEXT_KEYS,
  getDiscTextLabel,
  type DiscTextSettings,
  type SteamLogoPlacement,
} from '../discText.ts'
import type { ExportGuideKey, ExportGuideSelection } from '../exportGuides.ts'
import {
  createMediaMarkRenderModel,
  createPlatformMarkRenderModels,
} from '../mediaMarkRenderModel.ts'
import { shouldRenderSupplementalUskRatingBadge } from '../project/projectRatingBadge.ts'
import { canUseTitleArtwork } from '../project/projectTitleArtwork.ts'
import { createLogoAssetRenderItems } from '../project/projectLogoAssets.ts'
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
import { createTechnicalMarkRenderModels } from '../technicalMarkRenderModel.ts'
import {
  normalizeSteamBannerFallbackText,
  shouldRenderSteamBannerTextFallback,
} from '../steamBannerDefaults.ts'
import type { DiscTemplate } from '../types/template.ts'

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
  const warnings = buildExportWarnings(
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
    `Physical size: ${formatMm(params.selectedDiscTemplate.outerDiameterMm)} mm outer, ${formatMm(params.selectedDiscTemplate.printableDiameterMm)} mm printable, ${formatMm(params.selectedDiscTemplate.physicalCenterHoleDiameterMm)} mm center hole, ${formatMm(params.selectedDiscTemplate.safeDiameterMm)} mm safe zone`,
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

function buildExportWarnings(
  selectedDiscTemplateId: SelectedDiscTemplateId,
  selectedDiscTemplate: DiscTemplate,
  backgroundImageUrl: string | null,
  enabledGuideLabels: string[],
  projectLogoAssets: ProjectLogoAssets,
  projectTitleArtwork: ProjectTitleArtwork,
  projectMetadata: ProjectMetadata,
  projectRatingBadge: ProjectRatingBadge,
  projectMediaMark: ProjectMediaMark,
  projectPlatformMarks: ProjectPlatformMarks,
  projectTechnicalMarks: ProjectTechnicalMarks,
) {
  const warnings: string[] = []

  if (enabledGuideLabels.length > 0) {
    warnings.push('Guide marks are enabled and will appear in the exported PNG.')
  }

  if (!backgroundImageUrl) {
    warnings.push('No background image is selected; the export will use the default blank disc fill.')
  }

  if (selectedDiscTemplateId === 'custom') {
    warnings.push(...getCustomDimensionWarnings(selectedDiscTemplate))
  }

  warnings.push(...getTitleArtworkWarnings(projectTitleArtwork))
  warnings.push(...getLogoAssetWarnings(projectLogoAssets))
  warnings.push(...getRatingBadgeWarnings(projectMetadata, projectRatingBadge))
  warnings.push(...getMediaMarkWarnings(projectMediaMark))
  warnings.push(...getPlatformMarkWarnings(projectPlatformMarks))
  warnings.push(...getTechnicalMarkWarnings(projectTechnicalMarks))

  return warnings
}

function getLogoAssetWarnings(logoAssets: ProjectLogoAssets) {
  const warnings: string[] = []

  for (const logoAsset of createLogoAssetRenderItems(logoAssets)) {
    if (!logoAsset.imageDataUrl) {
      const logoLabel = /\blogo\b/i.test(logoAsset.label)
        ? logoAsset.label
        : `${logoAsset.label} logo`

      warnings.push(
        `${logoLabel} is enabled, but no image is uploaded; the bundled generic logo will export.`,
      )
    }
  }

  return warnings
}

function getTitleArtworkWarnings(titleArtwork: ProjectTitleArtwork) {
  if (!titleArtwork.layout.enabled || canUseTitleArtwork(titleArtwork)) {
    return []
  }

  return [
    'Title/logo artwork is enabled, but no Steam or custom title artwork image is selected; it will not render in the exported PNG.',
  ]
}

function getRatingBadgeWarnings(
  metadata: ProjectMetadata,
  ratingBadge: ProjectRatingBadge,
) {
  const warnings: string[] = []

  if (!ratingBadge.layout.enabled) {
    return warnings
  }

  if (metadata.ratingSystem === 'none') {
    warnings.push('Rating badge is enabled, but the rating system is set to none.')
  } else if (!metadata.ratingValue.trim()) {
    warnings.push('Rating badge is enabled, but no rating value is set.')
  }

  if (ratingBadge.source === 'custom' && !ratingBadge.customImageDataUrl) {
    warnings.push('Custom rating badge is selected, but no custom image is uploaded; bundled rating artwork will export when rating metadata is renderable.')
  }

  if (
    ratingBadge.source === 'placeholder' &&
    metadata.ratingSystem !== 'none' &&
    metadata.ratingValue.trim()
  ) {
    warnings.push('Rating badge uses bundled rating artwork.')
  }

  if (shouldRenderSupplementalUskRatingBadge(metadata, ratingBadge)) {
    warnings.push('Additional USK rating badge uses bundled rating artwork.')
  }

  return warnings
}

function getMediaMarkWarnings(mediaMark: ProjectMediaMark) {
  const model = createMediaMarkRenderModel(mediaMark)

  if (!model) {
    return []
  }

  if (mediaMark.source === 'custom' && !mediaMark.customImageDataUrl) {
    return [
      `Custom ${model.label} media mark is selected, but no custom image is uploaded; the bundled generic artwork will export.`,
    ]
  }

  if (model.isPlaceholderImage) {
    return [`${model.label} media mark uses bundled generic artwork.`]
  }

  return []
}

function getPlatformMarkWarnings(platformMarks: ProjectPlatformMarks) {
  return createPlatformMarkRenderModels(platformMarks).flatMap((model) => {
    if (model.asset.source === 'custom' && !model.asset.customImageDataUrl) {
      return [
        `Custom ${model.label} operating system mark is selected, but no custom image is uploaded; the bundled generic artwork will export.`,
      ]
    }

    if (model.isPlaceholderImage) {
      return [`${model.label} operating system mark uses bundled generic artwork.`]
    }

    return []
  })
}

function getTechnicalMarkWarnings(technicalMarks: ProjectTechnicalMarks) {
  return createTechnicalMarkRenderModels(technicalMarks).flatMap((model) => {
    if (model.asset.source === 'custom' && !model.asset.customImageDataUrl) {
      return [
        `Custom ${model.label} technical mark is selected, but no custom image is uploaded; the bundled generic artwork will export.`,
      ]
    }

    if (model.isPlaceholderImage) {
      return [`${model.label} technical mark uses bundled generic artwork.`]
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

function formatMm(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
