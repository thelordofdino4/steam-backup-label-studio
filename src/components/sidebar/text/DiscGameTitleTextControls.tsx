import type { Ref } from 'react'
import { DiscTextControl } from '../DiscTextControl'
import type { TextPanelProps } from '../textPanelTypes'

type DiscGameTitleTextControlsProps = TextPanelProps & {
  enableControlRef?: Ref<HTMLInputElement>
}

export function DiscGameTitleTextControls({
  enableControlRef,
  ...props
}: DiscGameTitleTextControlsProps) {
  return (
    <div className="editor-text-control-list">
      <DiscTextControl
        enableControlRef={enableControlRef}
        textKey="title"
        {...props}
      />
    </div>
  )
}

