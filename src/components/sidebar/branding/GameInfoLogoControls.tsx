import { EditorFeaturePanel } from '../../editor/EditorPanel'
import { MediaMarkControls } from './MediaMarkControls'
import { PlatformMarkControls } from './PlatformMarkControls'
import { RatingBadgeControls } from './RatingBadgeControls'
import { TechnicalMarkControls } from './TechnicalMarkControls'
import type { BrandingPanelProps } from './types'

export function GameInfoLogoControls(props: BrandingPanelProps) {
  return (
    <>
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
    </>
  )
}
