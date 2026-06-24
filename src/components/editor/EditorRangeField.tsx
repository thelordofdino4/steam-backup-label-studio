import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  formatEditorRangeFieldValue,
  getEditorRangeFieldNumberInputCharacterCapacity,
  getEditorRangeFieldValue,
  normalizeEditorRangeFieldValue,
} from './editorRangeFieldModel'

export type EditorRangeFieldProps = {
  disabled?: boolean
  id: string
  label: string
  max: number | string
  min: number | string
  onChange: (value: number) => void
  onInput?: (value: number) => void
  step: number | string
  unit?: ReactNode
  value: number
}

type EditorRangeInputProps = EditorRangeFieldProps

type RangeNumberDraftState = {
  draftValue: string
  isDirty: boolean
  sourceValue: string
}

function EditorRangeInput({
  disabled = false,
  id,
  label,
  max,
  min,
  onChange,
  onInput,
  step,
  unit,
  value,
}: EditorRangeInputProps) {
  const formattedValue = useMemo(
    () => formatEditorRangeFieldValue(value, step),
    [step, value],
  )
  const numberInputCharacterCapacity = useMemo(
    () =>
      getEditorRangeFieldNumberInputCharacterCapacity({
        max,
        min,
        step,
        value,
      }),
    [max, min, step, value],
  )
  const numberInputStyle = {
    '--editor-range-number-input-character-capacity':
      String(numberInputCharacterCapacity),
  } as CSSProperties
  const numberInputId = `${id}-number`
  const unitId = unit ? `${numberInputId}-unit` : undefined
  const [draftState, setDraftState] = useState<RangeNumberDraftState>({
    draftValue: formattedValue,
    isDirty: false,
    sourceValue: formattedValue,
  })
  const activeDraftState =
    draftState.isDirty || draftState.sourceValue === formattedValue
      ? draftState
      : {
          draftValue: formattedValue,
          isDirty: false,
          sourceValue: formattedValue,
        }

  const normalizeDraftValue = (rawValue: string) =>
    normalizeEditorRangeFieldValue({
      max,
      min,
      rawValue,
      step,
    })

  const commitDraftValue = () => {
    if (!activeDraftState.isDirty) {
      return
    }

    const normalizedValue = normalizeDraftValue(activeDraftState.draftValue)

    if (normalizedValue === null) {
      setDraftState({
        draftValue: formattedValue,
        isDirty: false,
        sourceValue: formattedValue,
      })
      return
    }

    setDraftState({
      draftValue: formatEditorRangeFieldValue(normalizedValue, step),
      isDirty: false,
      sourceValue: formattedValue,
    })
    onChange(normalizedValue)
  }

  const handleNumberInputChange = (nextValue: string) => {
    setDraftState({
      draftValue: nextValue,
      isDirty: true,
      sourceValue: formattedValue,
    })

    const normalizedValue = normalizeDraftValue(nextValue)

    if (normalizedValue !== null) {
      const liveChangeHandler = onInput ?? onChange

      liveChangeHandler(normalizedValue)
    }
  }

  return (
    <span className="editor-range-field-control">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onInput={
          onInput
            ? (event) =>
                onInput(getEditorRangeFieldValue(event.currentTarget.value))
            : undefined
        }
        onChange={(event) =>
          onChange(getEditorRangeFieldValue(event.currentTarget.value))}
      />
      <span className="editor-range-number-control" style={numberInputStyle}>
        <input
          id={numberInputId}
          className="editor-range-number-input"
          type="number"
          min={min}
          max={max}
          step={step}
          value={activeDraftState.draftValue}
          disabled={disabled}
          aria-label={`${label} value`}
          aria-describedby={unitId}
          onChange={(event) =>
            handleNumberInputChange(event.currentTarget.value)}
          onBlur={commitDraftValue}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              setDraftState({
                draftValue: formattedValue,
                isDirty: false,
                sourceValue: formattedValue,
              })
            }
          }}
        />
        {unit ? (
          <span id={unitId} className="editor-range-number-unit">
            {unit}
          </span>
        ) : null}
      </span>
    </span>
  )
}

export function EditorRangeField({
  disabled = false,
  id,
  label,
  max,
  min,
  onChange,
  onInput,
  step,
  unit,
  value,
}: EditorRangeFieldProps) {
  return (
    <div className="editor-range-field">
      <label htmlFor={id}>{label}</label>
      <EditorRangeInput
        id={id}
        label={label}
        min={min}
        max={max}
        step={step}
        unit={unit}
        value={value}
        disabled={disabled}
        onInput={onInput}
        onChange={onChange}
      />
    </div>
  )
}

export type EditorStackedRangeFieldProps = EditorRangeFieldProps & {
  labelValue?: ReactNode
  spacingTop?: boolean
}

export function EditorStackedRangeField({
  label,
  labelValue,
  spacingTop = true,
  ...inputProps
}: EditorStackedRangeFieldProps) {
  const labelClassName = spacingTop
    ? 'field-label spacing-top'
    : 'field-label'

  return (
    <>
      <label className={labelClassName} htmlFor={inputProps.id}>
        {label}
        {labelValue}
      </label>
      <EditorRangeInput label={label} {...inputProps} />
    </>
  )
}
