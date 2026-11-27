import type { Ref, RefCallback } from 'react'
import { EditorFeaturePanel } from '../../editor/EditorPanel'
import { MediaMarkControls } from './MediaMarkControls'
import { PlatformMarkControls } from './PlatformMarkControls'
import { RatingBadgeControls } from './RatingBadgeControls'
import { TechnicalMarkControls } from './TechnicalMarkControls'
import type { BrandingPanelProps } from './types'

type GameInfoLogoControlsProps = BrandingPanelProps & {
  mediaEnableControlRef?: Ref<HTMLInputElement>
  mediaFormatControlRef?: Ref<HTMLSelectElement>
  mediaInspectorSectionRef?: Ref<HTMLElement>
  mediaPanelOpen?: boolean
  onMediaPanelOpenChange?: (open: boolean) => void
  onOperatingSystemPanelOpenChange?: (open: boolean) => void
  onRatingPanelOpenChange?: (open: boolean) => void
  operatingSystemEnableControlRef?: Ref<HTMLInputElement>
  operatingSystemInspectorSectionRef?: Ref<HTMLElement>
  operatingSystemPanelOpen?: boolean
  ratingPanelOpen?: boolean
  ratingEnableControlRef?: Ref<HTMLInputElement>
  ratingSourceControlRef?: Ref<HTMLSelectElement>
  ratingSystemControlRef?: Ref<HTMLSelectElement>
  ratingValueControlRef?: RefCallback<HTMLInputElement | HTMLSelectElement>
}

export function GameInfoLogoControls({
  mediaEnableControlRef,
  mediaFormatControlRef,
  mediaInspectorSectionRef,
  mediaPanelOpen,
  onMediaPanelOpenChange,
  onOperatingSystemPanelOpenChange,
  onRatingPanelOpenChange,
  operatingSystemEnableControlRef,
  operatingSystemInspectorSectionRef,
  operatingSystemPanelOpen,
  ratingPanelOpen,
  ratingEnableControlRef,
  ratingSourceControlRef,
  ratingSystemControlRef,
  ratingValueControlRef,
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
          enableControlRef={ratingEnableControlRef}
          sourceControlRef={ratingSourceControlRef}
          systemControlRef={ratingSystemControlRef}
          valueControlRef={ratingValueControlRef}
        />
      </EditorFeaturePanel>

      <EditorFeaturePanel
        title="Media format mark"
        variant="branding"
        inspectorSectionRef={mediaInspectorSectionRef}
        open={mediaPanelOpen}
        onOpenChange={onMediaPanelOpenChange}
      >
        <MediaMarkControls
          {...props}
          enableControlRef={mediaEnableControlRef}
          formatControlRef={mediaFormatControlRef}
        />
      </EditorFeaturePanel>

      <EditorFeaturePanel
        title="Operating system marks"
        variant="branding"
        inspectorSectionRef={operatingSystemInspectorSectionRef}
        open={operatingSystemPanelOpen}
        onOpenChange={onOperatingSystemPanelOpenChange}
      >
        <PlatformMarkControls
          {...props}
          enableControlRef={operatingSystemEnableControlRef}
        />
      </EditorFeaturePanel>

      <EditorFeaturePanel title="Technical marks" variant="branding">
        <TechnicalMarkControls {...props} />
      </EditorFeaturePanel>
    </>
  )
}
