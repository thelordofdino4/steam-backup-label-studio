import {
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN,
  type AdditionalArtworkFrameField,
} from '../../project/additionalArtworkFrame.ts'
import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'

export type CaseInsertImageSlotFrameControlsProps = {
  idPrefix: string
  slot: ProjectCaseInsertImageSlot
  onFrameChange: (
    field: AdditionalArtworkFrameField,
    value: boolean | number | string,
  ) => void
  onResetFrame: () => void
}

export function CaseInsertImageSlotFrameControls({
  idPrefix,
  slot,
  onFrameChange,
  onResetFrame,
}: CaseInsertImageSlotFrameControlsProps) {
  return (
    <div className="additional-artwork-frame-controls">
      <label className="field-label">
        <input
          type="checkbox"
          checked={slot.frame.enabled}
          onChange={(event) =>
            onFrameChange('enabled', event.target.checked)}
        />
        Show border/frame
      </label>

      {slot.frame.enabled ? (
        <div className="disc-text-layout-grid">
          <label>
            <span>Shape</span>
            <select
              value={slot.frame.shape}
              onChange={(event) =>
                onFrameChange('shape', event.target.value)}
            >
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle / oval</option>
            </select>
          </label>

          <label>
            <span>Color</span>
            <input
              type="color"
              value={slot.frame.color}
              onChange={(event) =>
                onFrameChange('color', event.target.value)}
            />
          </label>

          <label>
            <span>Width</span>
            <input
              id={`${idPrefix}-frame-width`}
              type="range"
              min={ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN}
              max={ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX}
              step="0.25"
              value={slot.frame.width}
              onInput={(event) =>
                onFrameChange('width', Number(event.currentTarget.value))}
              onChange={(event) =>
                onFrameChange('width', Number(event.currentTarget.value))}
            />
          </label>

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
