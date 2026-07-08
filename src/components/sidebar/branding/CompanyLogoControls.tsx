import { EditorFeaturePanel } from '../../editor/EditorPanel'
import { LogoAssetControls } from './LogoAssetControls'
import type { BrandingPanelProps } from './types'

export function CompanyLogoControls(props: BrandingPanelProps) {
  const { projectLogoAssets } = props

  return (
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
  )
}
