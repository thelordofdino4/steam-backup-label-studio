import type { Ref } from 'react'
import { DiscTextControl } from '../DiscTextControl'
import type { TextPanelProps } from '../textPanelTypes'

type DiscLegalTextControlsProps = TextPanelProps & {
  enableControlRef?: Ref<HTMLInputElement>
}

export function DiscLegalTextControls({
  enableControlRef,
  ...props
}: DiscLegalTextControlsProps) {
  return (
    <div className="editor-text-control-list">
      <DiscTextControl
        enableControlRef={enableControlRef}
        textKey="copyright"
        {...props}
      />
    </div>
  )
}
