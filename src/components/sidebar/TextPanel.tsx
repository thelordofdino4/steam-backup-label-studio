import {
  DISC_TEXT_KEYS,
} from '../../discText/index'
import { DiscTextControl } from './DiscTextControl'
import type { TextPanelProps } from './textPanelTypes'
import { EditorPanel } from '../editor/EditorPanel'

export type { TextPanelProps } from './textPanelTypes'

export function TextPanel(props: TextPanelProps) {
  return (
    <EditorPanel title="Text — Migrating Soon">
        <p className="hint">
          Controls in this panel are being
          moved into role panels.
        </p>
        <p className="hint">
          Enable disc text elements, then edit straight text style and placement
          on the preview.
        </p>
        <p className="hint">
          Straight and curved text are edited from the preview. Curved copyright text remains SVG/textPath based while using contextual controls.
        </p>

        <div className="editor-text-control-list">
          {DISC_TEXT_KEYS
            .filter((key) => key === 'title')
            .map((key) => (
              <DiscTextControl
                key={key}
                textKey={key}
                {...props}
              />
            ))}
        </div>
    </EditorPanel>
  )
}
