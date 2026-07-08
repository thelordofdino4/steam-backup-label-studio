import { DiscTextControl } from '../DiscTextControl'
import type { TextPanelProps } from '../textPanelTypes'

export function DiscLegalTextControls(props: TextPanelProps) {
  return (
    <div className="editor-text-control-list">
      <DiscTextControl
        textKey="copyright"
        {...props}
      />
    </div>
  )
}
