import { DISC_TEXT_KEYS } from '../discText/constants.ts'
import type { DiscTextLayout } from '../discText/types.ts'
import type { CommittedDiscProject } from '../lifecycle/canonicalProject.ts'
import type { RatingBadgeLayout } from '../project/projectTypes.ts'
import type {
  RunCaseInsertPngExportParams,
  RunDiscPngExportParams,
} from './appPngExport.ts'

export type CaseInsertPngExportInput = Pick<
  RunCaseInsertPngExportParams,
  'activeTemplatePane' | 'brandingSources' | 'caseInsert'
>

export type CreateCaseInsertPngExportInputParams = {
  activeTemplatePane: CaseInsertPngExportInput['activeTemplatePane']
  caseInsert: CaseInsertPngExportInput['caseInsert']
  projectMetadata: CaseInsertPngExportInput['brandingSources']['projectMetadata']
  projectLogoAssets: CaseInsertPngExportInput['brandingSources']['projectLogoAssets']
  projectRatingBadge: CaseInsertPngExportInput['brandingSources']['projectRatingBadge']
  projectMediaMark: CaseInsertPngExportInput['brandingSources']['projectMediaMark']
  projectPlatformMarks: CaseInsertPngExportInput['brandingSources']['projectPlatformMarks']
  projectTechnicalMarks: CaseInsertPngExportInput['brandingSources']['projectTechnicalMarks']
}

type DiscPngExportPreflight = RunDiscPngExportParams['preflight']
type DiscPngExportRendererInput = RunDiscPngExportParams['exportInput']

export type DiscPngExportInput = Pick<
  RunDiscPngExportParams,
  'exportInput' | 'preflight'
>

export function getDiscPngExportPreviewWidth(
  preview: Pick<HTMLElement, 'offsetWidth'> | null,
  fallback: number,
) {
  // Disc background offsets are local layout pixels, not transformed viewport pixels.
  const width = preview?.offsetWidth ?? 0
  return Number.isFinite(width) && width > 0 ? width : fallback
}

export type CreateDiscPngExportInputParams = {
  selectedDiscTemplateId: DiscPngExportPreflight['selectedDiscTemplateId']
  selectedDiscTemplate: DiscPngExportPreflight['selectedDiscTemplate']
  backgroundImageUrl: DiscPngExportPreflight['backgroundImageUrl']
  backgroundImageSize: DiscPngExportPreflight['backgroundImageSize']
  selectedSteamGame: DiscPngExportPreflight['selectedSteamGame']
  manualGameTitle: DiscPngExportPreflight['manualGameTitle']
  resolvedDiscTextTitle: DiscPngExportRendererInput['manualGameTitle']
  steamLogoPlacement: DiscPngExportPreflight['steamLogoPlacement']
  steamBannerColors: DiscPngExportRendererInput['steamBannerColors']
  steamBannerUseTextFallback: DiscPngExportPreflight['steamBannerUseTextFallback']
  steamBannerFallbackText: DiscPngExportPreflight['steamBannerFallbackText']
  steamBannerLockupImageUrl: DiscPngExportPreflight['steamBannerLockupImageUrl']
  steamBannerLockupImageSize: DiscPngExportRendererInput['steamBannerLockupImageSize']
  steamBannerLockupLayout: DiscPngExportRendererInput['steamBannerLockupLayout']
  backgroundScale: DiscPngExportRendererInput['backgroundScale']
  backgroundOffset: DiscPngExportRendererInput['backgroundOffset']
  discTextSettings: DiscPngExportPreflight['discTextSettings']
  discTextValues: DiscPngExportRendererInput['discTextValues']
  discTextValueSources: DiscPngExportRendererInput['discTextValueSources']
  discTextHtmlSources: DiscPngExportRendererInput['discTextHtmlSources']
  discTextStyles: DiscPngExportRendererInput['discTextStyles']
  discTextLayout: DiscPngExportRendererInput['discTextLayout']
  projectLogoAssets: DiscPngExportPreflight['projectLogoAssets']
  projectTitleArtwork: DiscPngExportPreflight['projectTitleArtwork']
  projectDiscNumberArtwork: DiscPngExportRendererInput['projectDiscNumberArtwork']
  projectAdditionalArtwork: DiscPngExportRendererInput['projectAdditionalArtwork']
  projectMetadata: DiscPngExportPreflight['projectMetadata']
  projectRatingBadge: DiscPngExportPreflight['projectRatingBadge']
  projectMediaMark: DiscPngExportPreflight['projectMediaMark']
  projectPlatformMarks: DiscPngExportPreflight['projectPlatformMarks']
  projectTechnicalMarks: DiscPngExportPreflight['projectTechnicalMarks']
  exportGuides: DiscPngExportPreflight['exportGuides']
}

type DiscPngLayoutInput = Pick<
  CreateDiscPngExportInputParams, 'discTextSettings' | 'discTextLayout' | 'projectRatingBadge'
>

function projectTextLayout(
  stored: Readonly<Partial<DiscTextLayout>>,
  fallback: DiscTextLayout,
): DiscTextLayout {
  return {
    x: stored.x ?? fallback.x,
    y: stored.y ?? fallback.y,
    width: stored.width ?? fallback.width,
    scale: stored.scale ?? fallback.scale,
    fontSizePt: stored.fontSizePt ?? fallback.fontSizePt,
    align: stored.align ?? fallback.align,
    mode: stored.mode ?? fallback.mode,
    arcDegrees: stored.arcDegrees ?? fallback.arcDegrees,
    arcSide: stored.arcSide ?? fallback.arcSide,
    avoidVisualElements: stored.avoidVisualElements ?? fallback.avoidVisualElements,
  }
}

function projectBadgeLayout(
  stored: Readonly<Partial<RatingBadgeLayout>> | undefined,
  fallback: RatingBadgeLayout,
): RatingBadgeLayout {
  return stored ? {
    enabled: stored.enabled ?? fallback.enabled,
    scale: stored.scale ?? fallback.scale,
    x: stored.x ?? fallback.x,
    y: stored.y ?? fallback.y,
  } : fallback
}

/** A preset is published before React mirrors it. Project its accepted geometry
 * and visibility once, without re-running Open normalization or clamping.
 * Absent optional legacy leaves keep their existing rendered defaults.
 */
export function captureDiscPngLayout(
  project: Pick<CommittedDiscProject, 'discText' | 'ratingBadge'>,
  rendered: DiscPngLayoutInput,
): DiscPngLayoutInput {
  const discTextSettings = { ...rendered.discTextSettings }
  const discTextLayout = { ...rendered.discTextLayout }
  for (const key of DISC_TEXT_KEYS) {
    const enabled = project.discText?.settings?.[key]
    if (enabled !== undefined) discTextSettings[key] = enabled
    const storedLayout = project.discText?.layout?.[key]
    if (storedLayout) discTextLayout[key] = projectTextLayout(storedLayout, discTextLayout[key])
  }

  return {
    discTextSettings,
    discTextLayout,
    projectRatingBadge: {
      ...rendered.projectRatingBadge,
      layout: projectBadgeLayout(project.ratingBadge?.layout, rendered.projectRatingBadge.layout),
      uskBadge: {
        ...rendered.projectRatingBadge.uskBadge,
        layout: projectBadgeLayout(project.ratingBadge?.uskBadge?.layout, rendered.projectRatingBadge.uskBadge.layout),
      },
    },
  }
}

export function createCaseInsertPngExportInput({
  activeTemplatePane,
  caseInsert,
  projectMetadata,
  projectLogoAssets,
  projectRatingBadge,
  projectMediaMark,
  projectPlatformMarks,
  projectTechnicalMarks,
}: CreateCaseInsertPngExportInputParams): CaseInsertPngExportInput {
  return {
    caseInsert,
    activeTemplatePane,
    brandingSources: {
      projectMetadata,
      projectLogoAssets,
      projectRatingBadge,
      projectMediaMark,
      projectPlatformMarks,
      projectTechnicalMarks,
    },
  }
}

export function createDiscPngExportInput({
  selectedDiscTemplateId,
  selectedDiscTemplate,
  backgroundImageUrl,
  backgroundImageSize,
  selectedSteamGame,
  manualGameTitle,
  resolvedDiscTextTitle,
  steamLogoPlacement,
  steamBannerColors,
  steamBannerUseTextFallback,
  steamBannerFallbackText,
  steamBannerLockupImageUrl,
  steamBannerLockupImageSize,
  steamBannerLockupLayout,
  backgroundScale,
  backgroundOffset,
  discTextSettings,
  discTextValues,
  discTextValueSources,
  discTextHtmlSources,
  discTextStyles,
  discTextLayout,
  projectLogoAssets,
  projectTitleArtwork,
  projectDiscNumberArtwork,
  projectAdditionalArtwork,
  projectMetadata,
  projectRatingBadge,
  projectMediaMark,
  projectPlatformMarks,
  projectTechnicalMarks,
  exportGuides,
}: CreateDiscPngExportInputParams): DiscPngExportInput {
  return {
    preflight: {
      selectedDiscTemplateId,
      selectedDiscTemplate,
      backgroundImageUrl,
      backgroundImageSize,
      selectedSteamGame,
      manualGameTitle,
      steamLogoPlacement,
      steamBannerUseTextFallback,
      steamBannerFallbackText,
      steamBannerLockupImageUrl,
      discTextSettings,
      projectLogoAssets,
      projectTitleArtwork,
      projectMetadata,
      projectRatingBadge,
      projectMediaMark,
      projectPlatformMarks,
      projectTechnicalMarks,
      exportGuides,
    },
    exportInput: {
      selectedDiscTemplate,
      backgroundImageUrl,
      backgroundImageSize,
      backgroundScale,
      backgroundOffset,
      steamLogoPlacement,
      steamBannerColors,
      steamBannerLockupImageUrl,
      steamBannerLockupImageSize,
      steamBannerLockupLayout,
      steamBannerUseTextFallback,
      steamBannerFallbackText,
      projectLogoAssets,
      projectTitleArtwork,
      projectDiscNumberArtwork,
      projectAdditionalArtwork,
      projectMetadata,
      projectRatingBadge,
      projectMediaMark,
      projectPlatformMarks,
      projectTechnicalMarks,
      discTextSettings,
      discTextValues,
      discTextValueSources,
      discTextHtmlSources,
      discTextStyles,
      discTextLayout,
      manualGameTitle: resolvedDiscTextTitle,
      exportGuides,
    },
  }
}
