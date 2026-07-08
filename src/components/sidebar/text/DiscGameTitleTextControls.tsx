import { DiscTextControl } from '../DiscTextControl'
import type { TextPanelProps } from '../textPanelTypes'

export function DiscGameTitleTextControls(props: TextPanelProps) {
  return (
    <div className="editor-text-control-list">
      <DiscTextControl
        textKey="title"
        {...props}
      />
    </div>
  )
}

