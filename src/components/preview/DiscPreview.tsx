import type { CSSProperties, PointerEvent, ReactNode, RefObject } from 'react'
import type { DiscTextKey, DiscTextLayout, DiscTextLayoutSettings, DiscTextSettings, DiscTextValues, SteamLogoPlacement } from '../../discText'
import type { BackgroundOffset, PlatformMarkValue, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge } from '../../project/projectTypes'
import type { DiscTemplate } from '../../types/template'
import { BackgroundLayer, type BackgroundPreviewSize } from './BackgroundLayer'
import { DiscGuideOverlay } from './DiscGuideOverlay'
import { DiscTextLayer } from './DiscTextLayer'
import { PreviewToastStack, type PreviewToast } from './PreviewToastStack'
import { SteamBannerPreview } from './SteamBannerPreview'
import { LogoAssetLayer } from './LogoAssetLayer'
import { RatingBadgeLayer } from './RatingBadgeLayer'
import { MediaMarkLayer, PlatformMarksLayer } from './MediaMarkLayer'
import type { SteamBannerLockupLayout } from '../../project/projectTypes'
import { compareDiscEditorLayerIds, type DiscEditorLayerId } from '../../layerOrder'

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
  steamBannerStyle: CSSProperties
  steamBannerLockupImageUrl: string | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  projectLogoAssets: ProjectLogoAssets
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  handleRatingBadgePointerDown: (event: PointerEvent<Element>) => void
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
  handleLogoAssetPointerDown: (
    event: PointerEvent<Element>,
    logoKey: 'developer' | 'publisher',
  ) => void
  handleLogoAssetPointerMove: (event: PointerEvent<Element>) => void
  handleLogoAssetPointerUp: (event: PointerEvent<Element>) => void
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
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

type PreviewLayer = {
  id: DiscEditorLayerId
  node: ReactNode
}

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
  steamBannerStyle,
  steamBannerLockupImageUrl,
  steamBannerLockupLayout,
  projectLogoAssets,
  projectMetadata,
  projectRatingBadge,
  projectMediaMark,
  projectPlatformMarks,
  handleRatingBadgePointerDown,
  handleRatingBadgePointerMove,
  handleRatingBadgePointerUp,
  handleMediaMarkPointerDown,
  handleMediaMarkPointerMove,
  handleMediaMarkPointerUp,
  handlePlatformMarkPointerDown,
  handlePlatformMarkPointerMove,
  handlePlatformMarkPointerUp,
  handleLogoAssetPointerDown,
  handleLogoAssetPointerMove,
  handleLogoAssetPointerUp,
  discTextSettings,
  discTextValues,
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
  const previewLayers: PreviewLayer[] = [
    {
      id: 'background-artwork',
      node: (
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
    },
    {
      id: 'steam-banner',
      node: (
        <SteamBannerPreview
          steamLogoPlacement={steamLogoPlacement}
          steamBannerStyle={steamBannerStyle}
          steamBannerLockupImageUrl={steamBannerLockupImageUrl}
          steamBannerLockupLayout={steamBannerLockupLayout}
        />
      ),
    },
    {
      id: 'logo-assets',
      node: (
        <LogoAssetLayer
          developerLogoDataUrl={projectLogoAssets.developerLogoDataUrl}
          developerLogoSize={projectLogoAssets.developerLogoSize}
          developerLogoLayout={projectLogoAssets.developerLogoLayout}
          publisherLogoDataUrl={projectLogoAssets.publisherLogoDataUrl}
          publisherLogoSize={projectLogoAssets.publisherLogoSize}
          publisherLogoLayout={projectLogoAssets.publisherLogoLayout}
          handleLogoAssetPointerDown={handleLogoAssetPointerDown}
          handleLogoAssetPointerMove={handleLogoAssetPointerMove}
          handleLogoAssetPointerUp={handleLogoAssetPointerUp}
        />
      ),
    },
    {
      id: 'rating-badge',
      node: (
        <RatingBadgeLayer
          projectMetadata={projectMetadata}
          projectRatingBadge={projectRatingBadge}
          handleRatingBadgePointerDown={handleRatingBadgePointerDown}
          handleRatingBadgePointerMove={handleRatingBadgePointerMove}
          handleRatingBadgePointerUp={handleRatingBadgePointerUp}
        />
      ),
    },
    {
      id: 'media-mark',
      node: (
        <MediaMarkLayer
          projectMediaMark={projectMediaMark}
          handleMediaMarkPointerDown={handleMediaMarkPointerDown}
          handleMediaMarkPointerMove={handleMediaMarkPointerMove}
          handleMediaMarkPointerUp={handleMediaMarkPointerUp}
        />
      ),
    },
    {
      id: 'platform-marks',
      node: (
        <PlatformMarksLayer
          projectPlatformMarks={projectPlatformMarks}
          handlePlatformMarkPointerDown={handlePlatformMarkPointerDown}
          handlePlatformMarkPointerMove={handlePlatformMarkPointerMove}
          handlePlatformMarkPointerUp={handlePlatformMarkPointerUp}
        />
      ),
    },
    {
      id: 'disc-text',
      node: (
        <DiscTextLayer
          discTextSettings={discTextSettings}
          discTextValues={discTextValues}
          manualGameTitle={manualGameTitle}
          discTextLayout={discTextLayout}
          steamLogoPlacement={steamLogoPlacement}
          selectedDiscTemplate={selectedDiscTemplate}
          getDiscTextPreviewTransform={getDiscTextPreviewTransform}
          handleDiscTextPointerDown={handleDiscTextPointerDown}
          handleDiscTextPointerMove={handleDiscTextPointerMove}
          handleDiscTextPointerUp={handleDiscTextPointerUp}
        />
      ),
    },
    {
      id: 'editor-guide-overlay',
      node: (
        <DiscGuideOverlay
          innerPrintableBoundaryPercent={innerPrintableBoundaryPercent}
          printableInsetPercent={printableInsetPercent}
          safeInsetPercent={safeInsetPercent}
          physicalCenterHolePercent={physicalCenterHolePercent}
        />
      ),
    },
  ].sort((firstLayer, secondLayer) =>
    compareDiscEditorLayerIds(firstLayer.id, secondLayer.id),
  )

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
        {previewLayers.map((layer) => (
          <div className="disc-preview-layer" data-layer-id={layer.id} key={layer.id}>
            {layer.node}
          </div>
        ))}
      </div>
    </section>
  )
}
