import type { ReactNode } from 'react'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../../project/projectTypes'
import type {
  CaseInsertImageSourceControlSource,
} from './CaseInsertImageSourceControls'

export type CaseInsertImageSlotPlacementField = {
  field: keyof ProjectCaseInsertLayout
  label: string
  max: number
  min: number
  step: number
}

export type CaseInsertImageSlotPlacementControlsProps = {
  beforeRangeControls?: ReactNode
  featureEnabled: boolean
  fields: CaseInsertImageSlotPlacementField[]
  onClearImage: () => void
  onFitToRegion?: () => void
  onLayoutChange: (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => void
  onResetLayout: () => void
  sectionLabel: string
  showFitButton?: boolean
  slot: ProjectCaseInsertImageSlot
  source: CaseInsertImageSourceControlSource
  uploadId: string
}

function isCaseInsertImageSourceControlActive(
  imageSource: ProjectCaseInsertImageSlot['imageSource'],
  source: CaseInsertImageSourceControlSource,
) {
  if (!imageSource) return source === 'local-file'

  switch (source) {
    case 'steam-artwork':
    case 'web-artwork':
    case 'local-steam-screenshot':
      return imageSource.source === source
    case 'local-file':
      return ![
        'steam-artwork',
        'web-artwork',
        'local-steam-screenshot',
      ].includes(imageSource.source)
  }
}

function RangeField({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  )
}

export function CaseInsertImageSlotPlacementControls({
  beforeRangeControls,
  featureEnabled,
  fields,
  onClearImage,
  onFitToRegion,
  onLayoutChange,
  onResetLayout,
  sectionLabel,
  showFitButton = false,
  slot,
  source,
  uploadId,
}: CaseInsertImageSlotPlacementControlsProps) {
  if (!featureEnabled) {
    return null
  }

  const isActiveSource = isCaseInsertImageSourceControlActive(
    slot.imageSource,
    source,
  )
  const controlsDisabled = !slot.imageDataUrl || !isActiveSource
  const sourceName = sectionLabel.toLocaleLowerCase()
  const unlockedControlLabel = showFitButton
    ? 'scale, X/Y position, fit, reset, and clear controls'
    : 'scale, position, reset, and clear controls'
  const statusMessage = !slot.imageDataUrl
    ? `Choose ${sourceName} to unlock ${unlockedControlLabel} here.`
    : isActiveSource
      ? `These controls adjust the current image from ${sourceName}.`
      : `Inactive while another image source controls this slot.`

  return (
    <fieldset
      className="background-source-layout-controls"
      disabled={controlsDisabled}
      aria-label={`${sectionLabel} placement controls`}
    >
      <legend>Placement</legend>
      <p className="hint">{statusMessage}</p>

      <div className="disc-text-layout-grid">
        {beforeRangeControls}
        {fields.map((field) => (
          <RangeField
            key={field.field}
            id={`${uploadId}-${source}-${field.field}`}
            label={field.label}
            min={field.min}
            max={field.max}
            step={field.step}
            value={slot.layout[field.field]}
            onChange={(value) => onLayoutChange(field.field, value)}
          />
        ))}
      </div>

      {showFitButton ? (
        <button
          className="secondary-button"
          type="button"
          onClick={onFitToRegion}
        >
          Fit image
        </button>
      ) : null}

      <button
        className="secondary-button"
        type="button"
        onClick={onResetLayout}
      >
        Reset layout
      </button>
      {slot.imageDataUrl ? (
        <button
          className="secondary-button"
          type="button"
          onClick={onClearImage}
        >
          Clear image
        </button>
      ) : null}
    </fieldset>
  )
}
