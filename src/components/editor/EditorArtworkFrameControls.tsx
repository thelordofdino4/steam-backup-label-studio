import {
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN,
  type AdditionalArtworkFrameField,
} from '../../project/additionalArtworkFrame.ts'
import type { AdditionalArtworkFrame } from '../../project/projectTypes'
import { EditorRangeField } from './EditorRangeField'

export type EditorArtworkFrameControlsProps = {
  frame: AdditionalArtworkFrame
  idPrefix: string
  onFrameChange: (
    field: AdditionalArtworkFrameField,
    value: boolean | number | string,
  ) => void
  onResetFrame: () => void
}

export function EditorArtworkFrameControls({
  frame,
  idPrefix,
  onFrameChange,
  onResetFrame,
}: EditorArtworkFrameControlsProps) {
  return (
    <div className="additional-artwork-frame-controls">
      <label className="field-label">
        <input
          type="checkbox"
          checked={frame.enabled}
          onChange={(event) => onFrameChange('enabled', event.target.checked)}
        />
        Show border/frame
      </label>

      {frame.enabled ? (
        <div className="editor-control-grid">
          <label>
            <span>Shape</span>
            <select
              value={frame.shape}
              onChange={(event) => onFrameChange('shape', event.target.value)}
            >
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle / oval</option>
            </select>
          </label>

          <label>
            <span>Color</span>
            <input
              type="color"
              value={frame.color}
              onChange={(event) => onFrameChange('color', event.target.value)}
            />
          </label>

          <EditorRangeField
            id={`${idPrefix}-frame-width`}
            label="Width"
            min={ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN}
            max={ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX}
            step={0.25}
            value={frame.width}
            onInput={(value) => onFrameChange('width', value)}
            onChange={(value) => onFrameChange('width', value)}
          />

          <button
            className="secondary-button"
            type="button"
            onClick={onResetFrame}
          >
            Reset frame
          </button>
        </div>
      ) : null}
    </div>
  )
}
