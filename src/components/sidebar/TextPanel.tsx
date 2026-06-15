import {
  DISC_TEXT_KEYS,
  type DiscTextKey,
} from '../../discText/index'
import type { DiscTextLayoutPreset } from '../../layout/presets'
import { DiscTextControl } from './DiscTextControl'
import type { TextPanelProps } from './textPanelTypes'
import { EditorPanel } from '../editor/EditorPanel'

export type { TextPanelProps } from './textPanelTypes'

export function TextPanel(props: TextPanelProps) {
  const {
    handleDiscTextLayoutChange,
    handleDiscTextAlignmentChange,
    handleDiscTextModeChange,
    handleDiscTextArcSideChange,
  } = props
  const applyDiscTextPreset = (key: DiscTextKey, preset: DiscTextLayoutPreset) => {
    if (typeof preset.layout.x === 'number') handleDiscTextLayoutChange(key, 'x', preset.layout.x)
    if (typeof preset.layout.y === 'number') handleDiscTextLayoutChange(key, 'y', preset.layout.y)
    if (typeof preset.layout.width === 'number') handleDiscTextLayoutChange(key, 'width', preset.layout.width)
    if (typeof preset.layout.scale === 'number') handleDiscTextLayoutChange(key, 'scale', preset.layout.scale)
    if (typeof preset.layout.arcDegrees === 'number') handleDiscTextLayoutChange(key, 'arcDegrees', preset.layout.arcDegrees)
    if (preset.layout.align) handleDiscTextAlignmentChange(key, preset.layout.align)
    if (preset.layout.mode) handleDiscTextModeChange(key, preset.layout.mode)
    if (preset.layout.arcSide) handleDiscTextArcSideChange(key, preset.layout.arcSide)
  }

  return (
    <EditorPanel title="Text">
        <p className="hint">
          Enable disc text elements and adjust their style, position, and scale.
        </p>
        <p className="hint">
          Straight text is edited on the preview. Curved copyright text remains SVG/textPath based and uses its sidebar value field until curved inline editing is added.
        </p>

        <div className="editor-text-control-list">
          {DISC_TEXT_KEYS.map((key) => (
            <DiscTextControl
              key={key}
              textKey={key}
              applyDiscTextPreset={applyDiscTextPreset}
              {...props}
            />
          ))}
        </div>
    </EditorPanel>
  )
}
