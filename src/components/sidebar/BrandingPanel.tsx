import { LogoAssetControls } from './branding/LogoAssetControls'
import { MediaMarkControls } from './branding/MediaMarkControls'
import { PlatformMarkControls } from './branding/PlatformMarkControls'
import { RatingBadgeControls } from './branding/RatingBadgeControls'
import { SteamBannerControls } from './branding/SteamBannerControls'
import { TechnicalMarkControls } from './branding/TechnicalMarkControls'
import type { BrandingPanelProps } from './branding/types'
import { EditorFeaturePanel, EditorPanel } from '../editor/EditorPanel'

export type { BrandingPanelProps } from './branding/types'

export function BrandingPanel(props: BrandingPanelProps) {
  const { projectLogoAssets } = props

  return (
    <EditorPanel title="Branding">
        <EditorFeaturePanel title="Steam banner" spacingTop={false}>
          <SteamBannerControls {...props} />
        </EditorFeaturePanel>

        <EditorFeaturePanel title="Developer / publisher logos" variant="branding">
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
        </EditorFeaturePanel>

        <EditorFeaturePanel title="Rating badge" variant="branding">
          <RatingBadgeControls {...props} />
        </EditorFeaturePanel>

        <EditorFeaturePanel title="Media format mark" variant="branding">
          <MediaMarkControls {...props} />
        </EditorFeaturePanel>

        <EditorFeaturePanel title="Operating system marks" variant="branding">
          <PlatformMarkControls {...props} />
        </EditorFeaturePanel>

        <EditorFeaturePanel title="Technical marks" variant="branding">
          <TechnicalMarkControls {...props} />
        </EditorFeaturePanel>
    </EditorPanel>
  )
}
