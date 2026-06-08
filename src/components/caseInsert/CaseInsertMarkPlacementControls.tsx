import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../../project/projectTypes'
import type {
  CaseInsertMarkPlacementField,
} from '../../caseInsert/brandingMarkPlacementFields'
import { EditorStackedRangeField } from '../editor/EditorRangeField'

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
        <EditorStackedRangeField
          key={field.field}
          id={`${idPrefix}-${field.field}`}
          label={field.label}
          min={field.min}
          max={field.max}
          step={field.step}
          value={slot.layout[field.field] ?? 0}
          onInput={(value) => onLayoutChange(field.field, value)}
          onChange={(value) => onLayoutChange(field.field, value)}
        />
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
