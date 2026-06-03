import { Fragment, type PointerEvent, type ReactNode, type RefObject } from 'react'
import type { DiscTextKey, DiscTextLayout, DiscTextLayoutSettings, DiscTextSettings, DiscTextValues, SteamLogoPlacement } from '../../discText/index'
import type { DiscTextStyleSettings } from '../../discText/styles'
import type { BackgroundImageSize, BackgroundOffset, PlatformMarkValue, ProjectAdditionalArtwork, ProjectDiscNumberArtwork, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, ProjectTechnicalMarks, ProjectTitleArtwork, SteamBannerColors, TechnicalMarkValue } from '../../project/projectTypes'
import type { DiscTemplate } from '../../types/template'
import { BackgroundLayer, type BackgroundPreviewSize } from './BackgroundLayer'
import { DiscGuideOverlay } from './DiscGuideOverlay'
import { DiscTextLayer } from './DiscTextLayer'
import { PreviewToastStack, type PreviewToast } from './PreviewToastStack'
import { SteamBannerPreview } from './SteamBannerPreview'
import { LogoAssetLayer } from './LogoAssetLayer'
import { RatingBadgeLayer } from './RatingBadgeLayer'
import { MediaMarkLayer, PlatformMarksLayer } from './MediaMarkLayer'
import { TechnicalMarksLayer } from './TechnicalMarksLayer'
import { TitleArtworkLayer } from './TitleArtworkLayer'
import { AdditionalArtworkLayer } from './AdditionalArtworkLayer'
import type { SteamBannerLockupLayout } from '../../project/projectTypes'
import { DISC_EDITOR_PREVIEW_LAYER_ORDER, type DiscEditorPreviewLayerId } from '../../editor/layerOrder'
import { resolveMetadataBoundDiscTextValues, type DiscTextValueSources } from '../../project/metadataDiscText'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import type { RatingBadgeElementKey } from '../../project/projectRatingBadge'
import { createDiscTextOccupiedRegions } from '../../layout/discTextOccupiedRegions'
import { measureDiscTextWithBrowserCanvas } from '../../discText/svgLayer'

export type DiscPreviewProps = {
  discPreviewRef: RefObject<HTMLDivElement | null>
  statusToasts: PreviewToast[]
  backgroundImageUrl: string | null
  backgroundPreviewSize: BackgroundPreviewSize
  backgroundOffset: BackgroundOffset
  backgroundScale: number
  handleBackgroundPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  handleBackgroundPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  handleBackgroundPointerUp: (event: PointerEvent<HTMLDivElement>) => void
  steamLogoPlacement: SteamLogoPlacement
  steamBannerColors: SteamBannerColors
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerUseTextFallback: boolean
  steamBannerFallbackText: string
  projectLogoAssets: ProjectLogoAssets
  projectTitleArtwork: ProjectTitleArtwork
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  projectAdditionalArtwork: ProjectAdditionalArtwork
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
  handleRatingBadgePointerDown: (
    event: PointerEvent<Element>,
    badgeKey?: RatingBadgeElementKey,
  ) => void
  handleRatingBadgePointerMove: (event: PointerEvent<Element>) => void
  handleRatingBadgePointerUp: (event: PointerEvent<Element>) => void
  handleMediaMarkPointerDown: (event: PointerEvent<Element>) => void
  handleMediaMarkPointerMove: (event: PointerEvent<Element>) => void
  handleMediaMarkPointerUp: (event: PointerEvent<Element>) => void
  handlePlatformMarkPointerDown: (
    event: PointerEvent<Element>,
    value: PlatformMarkValue,
  ) => void
  handlePlatformMarkPointerMove: (event: PointerEvent<Element>) => void
  handlePlatformMarkPointerUp: (event: PointerEvent<Element>) => void
  handleTechnicalMarkPointerDown: (
    event: PointerEvent<Element>,
    value: TechnicalMarkValue,
  ) => void
  handleTechnicalMarkPointerMove: (event: PointerEvent<Element>) => void
  handleTechnicalMarkPointerUp: (event: PointerEvent<Element>) => void
  handleLogoAssetPointerDown: (
    event: PointerEvent<Element>,
    logoKey: LogoAssetKey,
    additionalLogoId?: string,
  ) => void
  handleLogoAssetPointerMove: (event: PointerEvent<Element>) => void
  handleLogoAssetPointerUp: (event: PointerEvent<Element>) => void
  handleTitleArtworkPointerDown: (event: PointerEvent<Element>) => void
  handleTitleArtworkPointerMove: (event: PointerEvent<Element>) => void
  handleTitleArtworkPointerUp: (event: PointerEvent<Element>) => void
  handleAdditionalArtworkPointerDown: (
    event: PointerEvent<Element>,
    elementId: string,
  ) => void
  handleAdditionalArtworkPointerMove: (event: PointerEvent<Element>) => void
  handleAdditionalArtworkPointerUp: (event: PointerEvent<Element>) => void
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextStyles: DiscTextStyleSettings
  manualGameTitle: string
  discTextLayout: DiscTextLayoutSettings
  selectedDiscTemplate: DiscTemplate
  getDiscTextPreviewTransform: (key: DiscTextKey, layout: DiscTextLayout) => string
  handleDiscTextPointerDown: (event: PointerEvent<Element>, key: DiscTextKey) => void
  handleDiscTextPointerMove: (event: PointerEvent<Element>) => void
  handleDiscTextPointerUp: (event: PointerEvent<Element>) => void
  innerPrintableBoundaryPercent: number
  printableInsetPercent: number
  safeInsetPercent: number
  physicalCenterHolePercent: number
}

type PreviewLayerMap = Record<DiscEditorPreviewLayerId, ReactNode>

export function DiscPreview({
  discPreviewRef,
  statusToasts,
  backgroundImageUrl,
  backgroundPreviewSize,
  backgroundOffset,
  backgroundScale,
  handleBackgroundPointerDown,
  handleBackgroundPointerMove,
  handleBackgroundPointerUp,
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
  handleRatingBadgePointerDown,
  handleRatingBadgePointerMove,
  handleRatingBadgePointerUp,
  handleMediaMarkPointerDown,
  handleMediaMarkPointerMove,
  handleMediaMarkPointerUp,
  handlePlatformMarkPointerDown,
  handlePlatformMarkPointerMove,
  handlePlatformMarkPointerUp,
  handleTechnicalMarkPointerDown,
  handleTechnicalMarkPointerMove,
  handleTechnicalMarkPointerUp,
  handleLogoAssetPointerDown,
  handleLogoAssetPointerMove,
  handleLogoAssetPointerUp,
  handleTitleArtworkPointerDown,
  handleTitleArtworkPointerMove,
  handleTitleArtworkPointerUp,
  handleAdditionalArtworkPointerDown,
  handleAdditionalArtworkPointerMove,
  handleAdditionalArtworkPointerUp,
  discTextSettings,
  discTextValues,
  discTextValueSources,
  discTextStyles,
  manualGameTitle,
  discTextLayout,
  selectedDiscTemplate,
  getDiscTextPreviewTransform,
  handleDiscTextPointerDown,
  handleDiscTextPointerMove,
  handleDiscTextPointerUp,
  innerPrintableBoundaryPercent,
  printableInsetPercent,
  safeInsetPercent,
  physicalCenterHolePercent,
}: DiscPreviewProps) {
  const metadataBoundDiscTextValues = resolveMetadataBoundDiscTextValues(
    discTextValues,
    projectMetadata,
    discTextValueSources,
  )
  const discTextOccupiedRegions = createDiscTextOccupiedRegions({
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
    discTextValues: metadataBoundDiscTextValues,
    discTextLayout,
    discTextStyles,
    discTextTitle: manualGameTitle,
    measureText: measureDiscTextWithBrowserCanvas,
  })
  const previewLayers: PreviewLayerMap = {
    'background-artwork': (
      <BackgroundLayer
        backgroundImageUrl={backgroundImageUrl}
        backgroundPreviewSize={backgroundPreviewSize}
        backgroundOffset={backgroundOffset}
        backgroundScale={backgroundScale}
        handleBackgroundPointerDown={handleBackgroundPointerDown}
        handleBackgroundPointerMove={handleBackgroundPointerMove}
        handleBackgroundPointerUp={handleBackgroundPointerUp}
      />
    ),
    'steam-banner': (
      <SteamBannerPreview
        steamLogoPlacement={steamLogoPlacement}
        steamBannerColors={steamBannerColors}
        steamBannerLockupImageUrl={steamBannerLockupImageUrl}
        steamBannerLockupImageSize={steamBannerLockupImageSize}
        steamBannerLockupLayout={steamBannerLockupLayout}
        steamBannerUseTextFallback={steamBannerUseTextFallback}
        steamBannerFallbackText={steamBannerFallbackText}
      />
    ),
    'additional-artwork': (
      <AdditionalArtworkLayer
        projectAdditionalArtwork={projectAdditionalArtwork}
        handleAdditionalArtworkPointerDown={handleAdditionalArtworkPointerDown}
        handleAdditionalArtworkPointerMove={handleAdditionalArtworkPointerMove}
        handleAdditionalArtworkPointerUp={handleAdditionalArtworkPointerUp}
      />
    ),
    'title-artwork': (
      <TitleArtworkLayer
        projectTitleArtwork={projectTitleArtwork}
        handleTitleArtworkPointerDown={handleTitleArtworkPointerDown}
        handleTitleArtworkPointerMove={handleTitleArtworkPointerMove}
        handleTitleArtworkPointerUp={handleTitleArtworkPointerUp}
      />
    ),
    'logo-assets': (
      <LogoAssetLayer
        projectLogoAssets={projectLogoAssets}
        handleLogoAssetPointerDown={handleLogoAssetPointerDown}
        handleLogoAssetPointerMove={handleLogoAssetPointerMove}
        handleLogoAssetPointerUp={handleLogoAssetPointerUp}
      />
    ),
    'rating-badge': (
      <RatingBadgeLayer
        projectMetadata={projectMetadata}
        projectRatingBadge={projectRatingBadge}
        handleRatingBadgePointerDown={handleRatingBadgePointerDown}
        handleRatingBadgePointerMove={handleRatingBadgePointerMove}
        handleRatingBadgePointerUp={handleRatingBadgePointerUp}
      />
    ),
    'media-mark': (
      <MediaMarkLayer
        projectMediaMark={projectMediaMark}
        handleMediaMarkPointerDown={handleMediaMarkPointerDown}
        handleMediaMarkPointerMove={handleMediaMarkPointerMove}
        handleMediaMarkPointerUp={handleMediaMarkPointerUp}
      />
    ),
    'platform-marks': (
      <PlatformMarksLayer
        projectPlatformMarks={projectPlatformMarks}
        handlePlatformMarkPointerDown={handlePlatformMarkPointerDown}
        handlePlatformMarkPointerMove={handlePlatformMarkPointerMove}
        handlePlatformMarkPointerUp={handlePlatformMarkPointerUp}
      />
    ),
    'technical-marks': (
      <TechnicalMarksLayer
        projectTechnicalMarks={projectTechnicalMarks}
        handleTechnicalMarkPointerDown={handleTechnicalMarkPointerDown}
        handleTechnicalMarkPointerMove={handleTechnicalMarkPointerMove}
        handleTechnicalMarkPointerUp={handleTechnicalMarkPointerUp}
      />
    ),
    'disc-text': (
      <DiscTextLayer
        discTextSettings={discTextSettings}
        discTextValues={discTextValues}
        discTextValueSources={discTextValueSources}
        discTextStyles={discTextStyles}
        projectDiscNumberArtwork={projectDiscNumberArtwork}
        projectMetadata={projectMetadata}
        manualGameTitle={manualGameTitle}
        discTextLayout={discTextLayout}
        steamLogoPlacement={steamLogoPlacement}
        selectedDiscTemplate={selectedDiscTemplate}
        avoidanceRegions={discTextOccupiedRegions}
        getDiscTextPreviewTransform={getDiscTextPreviewTransform}
        handleDiscTextPointerDown={handleDiscTextPointerDown}
        handleDiscTextPointerMove={handleDiscTextPointerMove}
        handleDiscTextPointerUp={handleDiscTextPointerUp}
      />
    ),
    'editor-guide-overlay': (
      <DiscGuideOverlay
        innerPrintableBoundaryPercent={innerPrintableBoundaryPercent}
        printableInsetPercent={printableInsetPercent}
        safeInsetPercent={safeInsetPercent}
        physicalCenterHolePercent={physicalCenterHolePercent}
      />
    ),
  }

  return (
    <section className="preview-area" aria-labelledby="disc-preview-title">
      <div className="preview-pane-label">
        <span>Live Preview</span>
        <strong id="disc-preview-title">Disc Preview</strong>
      </div>

      <PreviewToastStack statusToasts={statusToasts} />

      <div
        ref={discPreviewRef}
        className="disc-preview"
        aria-label="Blank standard printable disc preview"
      >
        {DISC_EDITOR_PREVIEW_LAYER_ORDER.map((layerId) => (
          <Fragment key={layerId}>{previewLayers[layerId]}</Fragment>
        ))}
      </div>
    </section>
  )
}
