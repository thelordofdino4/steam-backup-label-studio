import { LogoAssetControls } from './branding/LogoAssetControls'
import { MediaMarkControls } from './branding/MediaMarkControls'
import { PlatformMarkControls } from './branding/PlatformMarkControls'
import { RatingBadgeControls } from './branding/RatingBadgeControls'
import { SteamBannerControls } from './branding/SteamBannerControls'
import { TechnicalMarkControls } from './branding/TechnicalMarkControls'
import type { BrandingPanelProps } from './branding/types'

export type { BrandingPanelProps } from './branding/types'

export function BrandingPanel(props: BrandingPanelProps) {
  const { projectLogoAssets } = props

  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Branding</summary>
      <div className="panel-content">
        <details className="feature-section-card metadata-details collapsible-panel">
          <summary className="panel-summary">Steam banner</summary>
          <div className="panel-content">
            <SteamBannerControls {...props} />
          </div>
        </details>

        <details className="branding-feature-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Developer / publisher logos</summary>
          <div className="panel-content">
            <LogoAssetControls
              logoKey="developer"
              label="Developer"
              imageDataUrl={projectLogoAssets.developerLogoDataUrl}
              imageSize={projectLogoAssets.developerLogoSize}
              layout={projectLogoAssets.developerLogoLayout}
              {...props}
            />
            <LogoAssetControls
              logoKey="publisher"
              label="Publisher"
              imageDataUrl={projectLogoAssets.publisherLogoDataUrl}
              imageSize={projectLogoAssets.publisherLogoSize}
              layout={projectLogoAssets.publisherLogoLayout}
              {...props}
            />
          </div>
        </details>

        <details className="branding-feature-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Rating badge</summary>
          <div className="panel-content">
            <RatingBadgeControls {...props} />
          </div>
        </details>

        <details className="branding-feature-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Media format mark</summary>
          <div className="panel-content">
            <MediaMarkControls {...props} />
          </div>
        </details>

        <details className="branding-feature-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Operating system marks</summary>
          <div className="panel-content">
            <PlatformMarkControls {...props} />
          </div>
        </details>

        <details className="branding-feature-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Technical marks</summary>
          <div className="panel-content">
            <TechnicalMarkControls {...props} />
          </div>
        </details>
      </div>
    </details>
  )
}
