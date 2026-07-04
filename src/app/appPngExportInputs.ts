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
