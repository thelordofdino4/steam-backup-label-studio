import type { Ref, RefCallback } from 'react'
import { EditorFeaturePanel } from '../../editor/EditorPanel'
import { MediaMarkControls } from './MediaMarkControls'
import { PlatformMarkControls } from './PlatformMarkControls'
import { RatingBadgeControls } from './RatingBadgeControls'
import { TechnicalMarkControls } from './TechnicalMarkControls'
import type { BrandingPanelProps } from './types'

type GameInfoLogoControlsProps = BrandingPanelProps & {
  enableControlRef?: Ref<HTMLInputElement>
  onRatingPanelOpenChange?: (open: boolean) => void
  ratingPanelOpen?: boolean
  sourceControlRef?: Ref<HTMLSelectElement>
  systemControlRef?: Ref<HTMLSelectElement>
  valueControlRef?: RefCallback<HTMLInputElement | HTMLSelectElement>
}

export function GameInfoLogoControls({
  enableControlRef,
  onRatingPanelOpenChange,
  ratingPanelOpen,
  sourceControlRef,
  systemControlRef,
  valueControlRef,
  ...props
}: GameInfoLogoControlsProps) {
  return (
    <>
      <EditorFeaturePanel
        title="Rating badge"
        variant="branding"
        open={ratingPanelOpen}
        onOpenChange={onRatingPanelOpenChange}
      >
        <RatingBadgeControls
          {...props}
          enableControlRef={enableControlRef}
          sourceControlRef={sourceControlRef}
          systemControlRef={systemControlRef}
          valueControlRef={valueControlRef}
        />
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
