import { Fragment, useMemo, type PointerEvent, type ReactNode, type RefObject } from 'react'
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
import { MediaMarkLayer } from './MediaMarkLayer'
import { PlatformMarksLayer } from './PlatformMarksLayer'
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
  background: {
    imageUrl: string | null
    previewSize: BackgroundPreviewSize
    offset: BackgroundOffset
    scale: number
  }
  steamBanner: {
    logoPlacement: SteamLogoPlacement
    colors: SteamBannerColors
    lockupImageUrl: string | null
    lockupImageSize: BackgroundImageSize | null
    lockupLayout: SteamBannerLockupLayout
    useTextFallback: boolean
    fallbackText: string
  }
  artwork: {
    logoAssets: ProjectLogoAssets
    titleArtwork: ProjectTitleArtwork
    additionalArtwork: ProjectAdditionalArtwork
  }
  metadata: ProjectMetadata
  marks: {
    ratingBadge: ProjectRatingBadge
    mediaMark: ProjectMediaMark
    platformMarks: ProjectPlatformMarks
    technicalMarks: ProjectTechnicalMarks
  }
  discText: {
    settings: DiscTextSettings
    values: DiscTextValues
    valueSources: DiscTextValueSources
    styles: DiscTextStyleSettings
    manualGameTitle: string
    layout: DiscTextLayoutSettings
    discNumberArtwork: ProjectDiscNumberArtwork
    selectedDiscTemplate: DiscTemplate
    getPreviewTransform: (key: DiscTextKey, layout: DiscTextLayout) => string
  }
  pointerHandlers: {
    background: {
      handleBackgroundPointerDown: (event: PointerEvent<HTMLDivElement>) => void
      handleBackgroundPointerMove: (event: PointerEvent<HTMLDivElement>) => void
      handleBackgroundPointerUp: (event: PointerEvent<HTMLDivElement>) => void
    }
    ratingBadge: {
      handleRatingBadgePointerDown: (
        event: PointerEvent<Element>,
        badgeKey?: RatingBadgeElementKey,
      ) => void
      handleRatingBadgePointerMove: (event: PointerEvent<Element>) => void
      handleRatingBadgePointerUp: (event: PointerEvent<Element>) => void
    }
    mediaMark: {
      handleMediaMarkPointerDown: (event: PointerEvent<Element>) => void
      handleMediaMarkPointerMove: (event: PointerEvent<Element>) => void
      handleMediaMarkPointerUp: (event: PointerEvent<Element>) => void
    }
    platformMarks: {
      handlePlatformMarkPointerDown: (
        event: PointerEvent<Element>,
        value: PlatformMarkValue,
      ) => void
      handlePlatformMarkPointerMove: (event: PointerEvent<Element>) => void
      handlePlatformMarkPointerUp: (event: PointerEvent<Element>) => void
    }
    technicalMarks: {
      handleTechnicalMarkPointerDown: (
        event: PointerEvent<Element>,
        value: TechnicalMarkValue,
      ) => void
      handleTechnicalMarkPointerMove: (event: PointerEvent<Element>) => void
      handleTechnicalMarkPointerUp: (event: PointerEvent<Element>) => void
    }
    logoAssets: {
      handleLogoAssetPointerDown: (
        event: PointerEvent<Element>,
        logoKey: LogoAssetKey,
        additionalLogoId?: string,
      ) => void
      handleLogoAssetPointerMove: (event: PointerEvent<Element>) => void
      handleLogoAssetPointerUp: (event: PointerEvent<Element>) => void
    }
    titleArtwork: {
      handleTitleArtworkPointerDown: (event: PointerEvent<Element>) => void
      handleTitleArtworkPointerMove: (event: PointerEvent<Element>) => void
      handleTitleArtworkPointerUp: (event: PointerEvent<Element>) => void
    }
    additionalArtwork: {
      handleAdditionalArtworkPointerDown: (
        event: PointerEvent<Element>,
        elementId: string,
      ) => void
      handleAdditionalArtworkPointerMove: (event: PointerEvent<Element>) => void
      handleAdditionalArtworkPointerUp: (event: PointerEvent<Element>) => void
    }
    discText: {
      handleDiscTextPointerDown: (event: PointerEvent<Element>, key: DiscTextKey) => void
      handleDiscTextPointerMove: (event: PointerEvent<Element>) => void
      handleDiscTextPointerUp: (event: PointerEvent<Element>) => void
    }
  }
  guideOverlay: {
    innerPrintableBoundaryPercent: number
    printableInsetPercent: number
    safeInsetPercent: number
    physicalCenterHolePercent: number
  }
}

type PreviewLayerMap = Record<DiscEditorPreviewLayerId, ReactNode>

export function DiscPreview({
  discPreviewRef,
  statusToasts,
  background,
  steamBanner,
  artwork,
  metadata,
  marks,
  discText,
  pointerHandlers,
  guideOverlay,
}: DiscPreviewProps) {
  const metadataBoundDiscTextValues = useMemo(
    () => resolveMetadataBoundDiscTextValues(
      discText.values,
      metadata,
      discText.valueSources,
    ),
    [discText.valueSources, discText.values, metadata],
  )
  const discTextOccupiedRegions = useMemo(
    () => createDiscTextOccupiedRegions({
      projectTitleArtwork: artwork.titleArtwork,
      projectLogoAssets: artwork.logoAssets,
      projectAdditionalArtwork: artwork.additionalArtwork,
      projectMetadata: metadata,
      projectRatingBadge: marks.ratingBadge,
      projectMediaMark: marks.mediaMark,
      projectPlatformMarks: marks.platformMarks,
      projectTechnicalMarks: marks.technicalMarks,
      projectDiscNumberArtwork: discText.discNumberArtwork,
      discTextSettings: discText.settings,
      discTextValues: metadataBoundDiscTextValues,
      discTextLayout: discText.layout,
      discTextStyles: discText.styles,
      discTextTitle: discText.manualGameTitle,
      measureText: measureDiscTextWithBrowserCanvas,
    }),
    [
      artwork.additionalArtwork,
      artwork.logoAssets,
      artwork.titleArtwork,
      discText.discNumberArtwork,
      discText.layout,
      discText.manualGameTitle,
      discText.settings,
      discText.styles,
      marks.mediaMark,
      marks.platformMarks,
      marks.ratingBadge,
      marks.technicalMarks,
      metadata,
      metadataBoundDiscTextValues,
    ],
  )
  const previewLayers: PreviewLayerMap = {
    'background-artwork': (
      <BackgroundLayer
        backgroundImageUrl={background.imageUrl}
        backgroundPreviewSize={background.previewSize}
        backgroundOffset={background.offset}
        backgroundScale={background.scale}
        {...pointerHandlers.background}
      />
    ),
    'steam-banner': (
      <SteamBannerPreview
        steamLogoPlacement={steamBanner.logoPlacement}
        steamBannerColors={steamBanner.colors}
        steamBannerLockupImageUrl={steamBanner.lockupImageUrl}
        steamBannerLockupImageSize={steamBanner.lockupImageSize}
        steamBannerLockupLayout={steamBanner.lockupLayout}
        steamBannerUseTextFallback={steamBanner.useTextFallback}
        steamBannerFallbackText={steamBanner.fallbackText}
      />
    ),
    'additional-artwork': (
      <AdditionalArtworkLayer
        projectAdditionalArtwork={artwork.additionalArtwork}
        {...pointerHandlers.additionalArtwork}
      />
    ),
    'title-artwork': (
      <TitleArtworkLayer
        projectTitleArtwork={artwork.titleArtwork}
        {...pointerHandlers.titleArtwork}
      />
    ),
    'logo-assets': (
      <LogoAssetLayer
        projectLogoAssets={artwork.logoAssets}
        {...pointerHandlers.logoAssets}
      />
    ),
    'rating-badge': (
      <RatingBadgeLayer
        projectMetadata={metadata}
        projectRatingBadge={marks.ratingBadge}
        {...pointerHandlers.ratingBadge}
      />
    ),
    'media-mark': (
      <MediaMarkLayer
        projectMediaMark={marks.mediaMark}
        {...pointerHandlers.mediaMark}
      />
    ),
    'platform-marks': (
      <PlatformMarksLayer
        projectPlatformMarks={marks.platformMarks}
        {...pointerHandlers.platformMarks}
      />
    ),
    'technical-marks': (
      <TechnicalMarksLayer
        projectTechnicalMarks={marks.technicalMarks}
        {...pointerHandlers.technicalMarks}
      />
    ),
    'disc-text': (
      <DiscTextLayer
        discTextSettings={discText.settings}
        discTextValues={discText.values}
        discTextValueSources={discText.valueSources}
        discTextStyles={discText.styles}
        projectDiscNumberArtwork={discText.discNumberArtwork}
        projectMetadata={metadata}
        manualGameTitle={discText.manualGameTitle}
        discTextLayout={discText.layout}
        steamLogoPlacement={steamBanner.logoPlacement}
        selectedDiscTemplate={discText.selectedDiscTemplate}
        avoidanceRegions={discTextOccupiedRegions}
        getDiscTextPreviewTransform={discText.getPreviewTransform}
        {...pointerHandlers.discText}
      />
    ),
    'editor-guide-overlay': (
      <DiscGuideOverlay
        innerPrintableBoundaryPercent={guideOverlay.innerPrintableBoundaryPercent}
        printableInsetPercent={guideOverlay.printableInsetPercent}
        safeInsetPercent={guideOverlay.safeInsetPercent}
        physicalCenterHolePercent={guideOverlay.physicalCenterHolePercent}
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
