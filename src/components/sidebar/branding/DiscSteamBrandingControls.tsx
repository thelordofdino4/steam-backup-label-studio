import { EditorPanel } from '../../editor/EditorPanel'
import { SteamBannerControls } from './SteamBannerControls'
import type { BrandingPanelProps } from './types'

export function DiscSteamBrandingControls(props: BrandingPanelProps) {
  return (
    <EditorPanel title="Steam Branding">
      <SteamBannerControls {...props} />
    </EditorPanel>
  )
}
