import type { CSSProperties, PointerEvent, RefObject } from 'react'
import type { DiscTextKey, DiscTextLayout, DiscTextLayoutSettings, DiscTextSettings, DiscTextValues, SteamLogoPlacement } from '../../discText'
import type { BackgroundOffset } from '../../project/projectTypes'
import type { DiscTemplate } from '../../types/template'
import { BackgroundLayer, type BackgroundPreviewSize } from './BackgroundLayer'
import { DiscGuideOverlay } from './DiscGuideOverlay'
import { DiscTextLayer } from './DiscTextLayer'
import { PreviewToastStack, type PreviewToast } from './PreviewToastStack'
import { SteamBannerPreview } from './SteamBannerPreview'

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
        <BackgroundLayer
          backgroundImageUrl={backgroundImageUrl}
          backgroundPreviewSize={backgroundPreviewSize}
          backgroundOffset={backgroundOffset}
          backgroundScale={backgroundScale}
          handleBackgroundPointerDown={handleBackgroundPointerDown}
          handleBackgroundPointerMove={handleBackgroundPointerMove}
          handleBackgroundPointerUp={handleBackgroundPointerUp}
        />

        <SteamBannerPreview
          steamLogoPlacement={steamLogoPlacement}
          steamBannerStyle={steamBannerStyle}
          steamBannerLockupImageUrl={steamBannerLockupImageUrl}
        />

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

        <DiscGuideOverlay
          innerPrintableBoundaryPercent={innerPrintableBoundaryPercent}
          printableInsetPercent={printableInsetPercent}
          safeInsetPercent={safeInsetPercent}
          physicalCenterHolePercent={physicalCenterHolePercent}
        />
      </div>
    </section>
  )
}
