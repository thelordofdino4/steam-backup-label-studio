import type { ChangeEvent, FormEvent } from 'react'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../../project/projectTypes'
import type {
  CaseInsertMarkPlacementField,
} from '../../caseInsert/brandingMarkPlacementFields'

export type CaseInsertMarkPlacementControlsProps = {
  fields: CaseInsertMarkPlacementField[]
  idPrefix: string
  layoutPresets?: readonly {
    id: string
    label: string
    scale: number
    x: number
    y: number
  }[]
  onLayoutChange: (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => void
  onPresetApply?: (preset: {
    id: string
    label: string
    scale: number
    x: number
    y: number
  }) => void
  onResetLayout: () => void
  presetLabel?: string
  resetLabel: string
  slot: ProjectCaseInsertImageSlot | null
}

function getRangeValue(
  event: ChangeEvent<HTMLInputElement> | FormEvent<HTMLInputElement>,
) {
  return Number(event.currentTarget.value)
}

export function CaseInsertMarkPlacementControls({
  fields,
  idPrefix,
  layoutPresets = [],
  onLayoutChange,
  onPresetApply,
  onResetLayout,
  presetLabel = 'Layout preset',
  resetLabel,
  slot,
}: CaseInsertMarkPlacementControlsProps) {
  if (!slot) {
    return null
  }

  return (
    <>
      {layoutPresets.length > 0 ? (
        <>
          <label
            className="field-label spacing-top"
            htmlFor={`${idPrefix}-layout-preset`}
          >
            {presetLabel}
          </label>
          <select
            id={`${idPrefix}-layout-preset`}
            defaultValue=""
            onChange={(event) => {
              const preset = layoutPresets.find(
                (candidate) => candidate.id === event.currentTarget.value,
              )

              if (!preset) return

              if (onPresetApply) {
                onPresetApply(preset)
              } else {
                onLayoutChange('x', preset.x)
                onLayoutChange('y', preset.y)
                onLayoutChange('scale', preset.scale)
              }

              event.currentTarget.value = ''
            }}
          >
            <option value="">Choose preset...</option>
            {layoutPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {fields.map((field) => (
        <div key={field.field}>
          <label
            className="field-label spacing-top"
            htmlFor={`${idPrefix}-${field.field}`}
          >
            {field.label}
          </label>
          <input
            id={`${idPrefix}-${field.field}`}
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={slot.layout[field.field]}
            onInput={(event) =>
              onLayoutChange(field.field, getRangeValue(event))}
            onChange={(event) =>
              onLayoutChange(field.field, getRangeValue(event))}
          />
        </div>
      ))}
      <button
        className="secondary-button"
        type="button"
        onClick={onResetLayout}
      >
        {resetLabel}
      </button>
    </>
  )
}
