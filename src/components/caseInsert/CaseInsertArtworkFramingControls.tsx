import { useState } from 'react'
import {
  CASE_INSERT_ARTWORK_FOCAL_POSITION_MAX,
  CASE_INSERT_ARTWORK_FOCAL_POSITION_MIN,
  CASE_INSERT_ARTWORK_FRAMING_FITS,
  CASE_INSERT_ARTWORK_ZOOM_SLIDER_MAX,
  getCaseInsertArtworkFramingViewModel,
  type CaseInsertArtworkFramingChange,
  type CaseInsertArtworkFramingFit,
} from '../../caseInsert/artworkViewportFraming'
import {
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MIN,
  type CaseInsertReservedArtworkViewportOwner,
} from '../../caseInsert/artworkViewportState'
import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'
import { EditorRangeField } from '../editor/EditorRangeField'

type FramingNumericField = 'focal-x' | 'focal-y' | 'zoom'

export type CaseInsertArtworkFramingControlsProps = {
  idPrefix: string
  owner: CaseInsertReservedArtworkViewportOwner
  slot: ProjectCaseInsertImageSlot
  onChange: (change: CaseInsertArtworkFramingChange) => void
}

function isFramingFit(value: string): value is CaseInsertArtworkFramingFit {
  return (CASE_INSERT_ARTWORK_FRAMING_FITS as readonly string[]).includes(value)
}

function getValidationMessage(field: FramingNumericField) {
  switch (field) {
    case 'focal-x':
      return 'Horizontal focus must be a number from 0 through 100.'
    case 'focal-y':
      return 'Vertical focus must be a number from 0 through 100.'
    case 'zoom':
      return `Zoom must be a number from ${CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MIN} through ${CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX}.`
  }
}

export function CaseInsertArtworkFramingControls({
  idPrefix,
  owner,
  slot,
  onChange,
}: CaseInsertArtworkFramingControlsProps) {
  const [validationError, setValidationError] = useState<Readonly<{
    field: FramingNumericField
    message: string
  }> | null>(null)
  const model = getCaseInsertArtworkFramingViewModel(slot, owner)
  if (!model) return null

  const descriptionId = `${idPrefix}-artwork-framing-description`
  const horizontalHelpId = `${idPrefix}-horizontal-focus-help`
  const verticalHelpId = `${idPrefix}-vertical-focus-help`
  const zoomHelpId = `${idPrefix}-zoom-help`
  const errorId = `${idPrefix}-artwork-framing-error`
  const describedBy = (helpId: string, field: FramingNumericField) =>
    [helpId, validationError?.field === field ? errorId : null]
      .filter(Boolean)
      .join(' ')
  const commitNumericChange = (
    field: FramingNumericField,
    value: number,
  ) => {
    setValidationError(null)
    onChange({ field, value })
  }
  const reportInvalidCommit = (field: FramingNumericField) => {
    setValidationError({ field, message: getValidationMessage(field) })
  }
  const zoomExceedsSlider = model.zoom > CASE_INSERT_ARTWORK_ZOOM_SLIDER_MAX

  return (
    <fieldset
      className="background-source-layout-controls case-insert-artwork-framing-controls"
      aria-describedby={descriptionId}
    >
      <legend>Image framing</legend>
      <p id={descriptionId} className="hint">
        The preset reserves this frame and its aspect ratio. Fit changes how
        the image occupies it; Position and Scale move or resize the whole
        frame proportionally.
      </p>
      {!slot.imageDataUrl ? (
        <p className="hint">
          No image is selected. These saved settings will apply when you choose
          an image.
        </p>
      ) : null}

      <div className="editor-control-grid">
        <label htmlFor={`${idPrefix}-artwork-fit`}>
          <span>Fit</span>
          <select
            id={`${idPrefix}-artwork-fit`}
            value={model.fit}
            onChange={(event) => {
              if (isFramingFit(event.currentTarget.value)) {
                setValidationError(null)
                onChange({ field: 'fit', value: event.currentTarget.value })
              }
            }}
          >
            <option value="contain">Contain — show complete image</option>
            <option value="cover">Cover — fill frame automatically</option>
            <option value="crop">Crop — adjust focus and zoom</option>
          </select>
        </label>

        {model.showFocalPosition ? (
          <>
            <EditorRangeField
              id={`${idPrefix}-artwork-focal-x`}
              label="Horizontal focus"
              min={CASE_INSERT_ARTWORK_FOCAL_POSITION_MIN}
              max={CASE_INSERT_ARTWORK_FOCAL_POSITION_MAX}
              step={1}
              unit="%"
              value={model.focalXPercent}
              inputValidationMode="reject"
              describedBy={describedBy(horizontalHelpId, 'focal-x')}
              sliderValueText={`${model.focalXPercent}% from the left`}
              onInvalidCommit={() => reportInvalidCommit('focal-x')}
              onInput={(value) => commitNumericChange('focal-x', value)}
              onChange={(value) => commitNumericChange('focal-x', value)}
            />
            <p id={horizontalHelpId} className="hint">
              0% is left; 100% is right.
            </p>

            <EditorRangeField
              id={`${idPrefix}-artwork-focal-y`}
              label="Vertical focus"
              min={CASE_INSERT_ARTWORK_FOCAL_POSITION_MIN}
              max={CASE_INSERT_ARTWORK_FOCAL_POSITION_MAX}
              step={1}
              unit="%"
              value={model.focalYPercent}
              inputValidationMode="reject"
              describedBy={describedBy(verticalHelpId, 'focal-y')}
              sliderValueText={`${model.focalYPercent}% from the top`}
              onInvalidCommit={() => reportInvalidCommit('focal-y')}
              onInput={(value) => commitNumericChange('focal-y', value)}
              onChange={(value) => commitNumericChange('focal-y', value)}
            />
            <p id={verticalHelpId} className="hint">
              0% is top; 100% is bottom.
            </p>
          </>
        ) : null}

        {model.showZoom ? (
          <>
            <EditorRangeField
              id={`${idPrefix}-artwork-zoom`}
              label="Zoom"
              min={CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MIN}
              max={CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX}
              step={0.1}
              unit="×"
              value={model.zoom}
              inputValidationMode="reject"
              describedBy={describedBy(zoomHelpId, 'zoom')}
              sliderMax={CASE_INSERT_ARTWORK_ZOOM_SLIDER_MAX}
              sliderValue={Math.min(
                model.zoom,
                CASE_INSERT_ARTWORK_ZOOM_SLIDER_MAX,
              )}
              sliderDisabled={zoomExceedsSlider}
              sliderValueText={zoomExceedsSlider
                ? `Current zoom is ${model.zoom} times; use the numeric field.`
                : `${model.zoom} times`}
              onInvalidCommit={() => reportInvalidCommit('zoom')}
              onInput={(value) => commitNumericChange('zoom', value)}
              onChange={(value) => commitNumericChange('zoom', value)}
            />
            <p id={zoomHelpId} className="hint">
              1× is neutral. The slider supports 1× through
              {' '}{CASE_INSERT_ARTWORK_ZOOM_SLIDER_MAX}×; use the number field
              for zoom through {CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX}×.
            </p>
          </>
        ) : null}
      </div>

      {validationError ? (
        <p
          id={errorId}
          className="hint case-insert-artwork-framing-error"
          role="alert"
        >
          {validationError.message}
        </p>
      ) : null}
    </fieldset>
  )
}
