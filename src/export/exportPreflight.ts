import { EXPORT_DPI, mmToPixels } from '../discGeometry'
import {
  DISC_TEXT_KEYS,
  getDiscTextLabel,
  type DiscTextSettings,
  type SteamLogoPlacement,
} from '../discText'
import type { ExportGuideKey, ExportGuideSelection } from '../exportGuides'
import type {
  BackgroundImageSize,
  ProjectLogoAssets,
  ProjectMetadata,
  ProjectRatingBadge,
  SelectedDiscTemplateId,
} from '../project/projectTypes'
import type { SteamImportedGame } from '../steam/steamApi'
import type { DiscTemplate } from '../types/template'

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
}

export function buildExportPreflightSummary(params: {
  selectedDiscTemplateId: SelectedDiscTemplateId
  selectedDiscTemplate: DiscTemplate
  backgroundImageUrl: string | null
  backgroundImageSize: BackgroundImageSize | null
  selectedSteamGame: SteamImportedGame | null
  manualGameTitle: string
  steamLogoPlacement: SteamLogoPlacement
  discTextSettings: DiscTextSettings
  projectLogoAssets: ProjectLogoAssets
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
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
    params.projectMetadata,
    params.projectRatingBadge,
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
    `Steam Backup branding: ${BRANDING_LABELS[params.steamLogoPlacement]}`,
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
  }
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
  projectMetadata: ProjectMetadata,
  projectRatingBadge: ProjectRatingBadge,
) {
  const warnings: string[] = []

  if (enabledGuideLabels.length > 0) {
    warnings.push('Guide marks are enabled and will appear in the exported PNG.')
  }

  if (!backgroundImageUrl) {
    warnings.push('No background image is selected; the export will use the default dark disc fill.')
  }

  if (selectedDiscTemplateId === 'custom') {
    warnings.push(...getCustomDimensionWarnings(selectedDiscTemplate))
  }

  warnings.push(...getLogoAssetWarnings(projectLogoAssets))
  warnings.push(...getRatingBadgeWarnings(projectMetadata, projectRatingBadge))

  return warnings
}

function getLogoAssetWarnings(logoAssets: ProjectLogoAssets) {
  const warnings: string[] = []

  if (logoAssets.developerLogoLayout.enabled && !logoAssets.developerLogoDataUrl) {
    warnings.push('Developer logo is enabled, but no developer logo image is uploaded.')
  }

  if (logoAssets.publisherLogoLayout.enabled && !logoAssets.publisherLogoDataUrl) {
    warnings.push('Publisher logo is enabled, but no publisher logo image is uploaded.')
  }

  return warnings
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
    warnings.push('Custom rating badge is selected, but no custom image is uploaded.')
  }

  if (
    ratingBadge.source === 'placeholder' &&
    metadata.ratingSystem !== 'none' &&
    metadata.ratingValue.trim()
  ) {
    warnings.push('Rating badge uses bundled placeholder artwork.')
  }

  return warnings
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
