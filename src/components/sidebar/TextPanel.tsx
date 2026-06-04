import {
  DISC_TEXT_KEYS,
  type DiscTextKey,
} from '../../discText/index'
import type { DiscTextLayoutPreset } from '../../layout/presets'
import { DiscTextControl } from './DiscTextControl'
import type { TextPanelProps } from './textPanelTypes'

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
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Text</summary>
      <div className="panel-content">
        <p className="hint">
          Enable text elements, type manual overrides, and adjust their preset position and scale.
        </p>
        <p className="hint">
          Metadata-backed text shows the Game metadata/default as input hint text until edited here. Clearing the override returns to the Game metadata/default value.
        </p>

        <div className="disc-text-control-list">
          {DISC_TEXT_KEYS.map((key) => (
            <DiscTextControl
              key={key}
              textKey={key}
              applyDiscTextPreset={applyDiscTextPreset}
              {...props}
            />
          ))}
        </div>
      </div>
    </details>
  )
}
