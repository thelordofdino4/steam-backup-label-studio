import {
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN,
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
            <span>Style</span>
            <select
              value={frame.style}
              onChange={(event) => onFrameChange('style', event.target.value)}
            >
              <option value="solid">Solid color</option>
              <option value="rocky">Rocky texture</option>
            </select>
          </label>

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

          {frame.style === 'solid' ? (
            <label>
              <span>Color</span>
              <input
                type="color"
                value={frame.color}
                onChange={(event) => onFrameChange('color', event.target.value)}
              />
            </label>
          ) : null}

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

          {frame.style === 'rocky' ? (
            <>
              <EditorRangeField
                id={`${idPrefix}-frame-lumpiness`}
                label="Lumpiness"
                min={ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN}
                max={ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX}
                step={1}
                value={frame.lumpiness}
                onInput={(value) => onFrameChange('lumpiness', value)}
                onChange={(value) => onFrameChange('lumpiness', value)}
              />

              <EditorRangeField
                id={`${idPrefix}-frame-jaggedness`}
                label="Jaggedness"
                min={ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN}
                max={ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX}
                step={1}
                value={frame.jaggedness}
                onInput={(value) => onFrameChange('jaggedness', value)}
                onChange={(value) => onFrameChange('jaggedness', value)}
              />

              <EditorRangeField
                id={`${idPrefix}-frame-roughness-offset`}
                label="Bump position"
                min={ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN}
                max={ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX}
                step={1}
                value={frame.roughnessOffset}
                onInput={(value) => onFrameChange('roughnessOffset', value)}
                onChange={(value) => onFrameChange('roughnessOffset', value)}
              />
            </>
          ) : null}

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
