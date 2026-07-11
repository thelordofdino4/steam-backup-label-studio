import type { Ref } from 'react'
import { EditorFeaturePanel } from '../../editor/EditorPanel'
import { LogoAssetControls } from './LogoAssetControls'
import type { BrandingPanelProps } from './types'

export type CompanyLogoControlsProps = BrandingPanelProps & {
  developerEnableControlRef?: Ref<HTMLInputElement>
  developerUploadControlRef?: Ref<HTMLInputElement>
  onPanelOpenChange?: (open: boolean) => void
  panelOpen?: boolean
  publisherEnableControlRef?: Ref<HTMLInputElement>
  publisherUploadControlRef?: Ref<HTMLInputElement>
}

export function CompanyLogoControls({
  developerEnableControlRef,
  developerUploadControlRef,
  onPanelOpenChange,
  panelOpen,
  publisherEnableControlRef,
  publisherUploadControlRef,
  ...props
}: CompanyLogoControlsProps) {
  const { projectLogoAssets } = props

  return (
    <EditorFeaturePanel
      title="Developer / publisher logos"
      variant="branding"
      open={panelOpen}
      onOpenChange={onPanelOpenChange}
    >
      <LogoAssetControls
        enableControlRef={developerEnableControlRef}
        logoKey="developer"
        label="Developer"
        imageDataUrl={projectLogoAssets.developerLogoDataUrl}
        imageSize={projectLogoAssets.developerLogoSize}
        layout={projectLogoAssets.developerLogoLayout}
        uploadControlRef={developerUploadControlRef}
        {...props}
      />
      <LogoAssetControls
        enableControlRef={publisherEnableControlRef}
        logoKey="publisher"
        label="Publisher"
        imageDataUrl={projectLogoAssets.publisherLogoDataUrl}
        imageSize={projectLogoAssets.publisherLogoSize}
        layout={projectLogoAssets.publisherLogoLayout}
        uploadControlRef={publisherUploadControlRef}
        {...props}
      />
    </EditorFeaturePanel>
  )
}
