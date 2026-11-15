import {
  useEffect,
  useMemo,
  useRef,
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
import {
  useCaseInsertContinuousEditPresentationPort,
} from '../../interaction/caseInsertContinuousEditPresentationPort.ts'

export type EditorRangeFieldProps = {
  describedBy?: string
  disabled?: boolean
  id: string
  inputValidationMode?: 'clamp' | 'reject'
  label: string
  max: number | string
  min: number | string
  onChange: (value: number) => void
  onInvalidCommit?: (rawValue: string) => void
  onInput?: (value: number) => void
  sliderDisabled?: boolean
  sliderMax?: number | string
  sliderMin?: number | string
  sliderStep?: number | string
  sliderValue?: number
  sliderValueText?: string
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
  describedBy,
  disabled = false,
  id,
  inputValidationMode = 'clamp',
  label,
  max,
  min,
  onChange,
  onInvalidCommit,
  onInput,
  sliderDisabled = false,
  sliderMax,
  sliderMin,
  sliderStep,
  sliderValue,
  sliderValueText,
  step,
  unit,
  value,
}: EditorRangeInputProps) {
  const continuousEdit = useCaseInsertContinuousEditPresentationPort()
  const rangeInteractionActiveRef = useRef(false)
  // Keep the native thumb current while the Case aggregate waits for its frame.
  const [rangeDraftValue, setRangeDraftValue] = useState<number | null>(null)
  useEffect(() => () => {
    rangeInteractionActiveRef.current = false
    continuousEdit?.release(id)
  }, [continuousEdit, id])
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
      }),
    [max, min, step],
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
      outOfRangeBehavior: inputValidationMode,
      rawValue,
      step,
    })

  const projectLiveValue = (nextValue: number) => {
    const liveChangeHandler = onInput ?? onChange
    if (onInput && continuousEdit) {
      continuousEdit.update({
        targetId: id,
        value: nextValue,
        project: liveChangeHandler,
      })
      return
    }
    liveChangeHandler(nextValue)
  }

  const finishLiveValue = (nextValue?: number) => {
    if (onInput && continuousEdit) {
      if (nextValue !== undefined) {
        continuousEdit.update({
          targetId: id,
          value: nextValue,
          project: onInput,
        })
      }
      continuousEdit.finish(id)
      return
    }
    if (nextValue !== undefined) onChange(nextValue)
  }

  const commitDraftValue = () => {
    if (!activeDraftState.isDirty) {
      return
    }

    const normalizedValue = normalizeDraftValue(activeDraftState.draftValue)

    if (normalizedValue === null) {
      if (onInput && continuousEdit) continuousEdit.finish(id)
      onInvalidCommit?.(activeDraftState.draftValue)
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
    finishLiveValue(normalizedValue)
  }

  const handleNumberInputChange = (nextValue: string) => {
    setDraftState({
      draftValue: nextValue,
      isDirty: true,
      sourceValue: formattedValue,
    })

    const normalizedValue = normalizeDraftValue(nextValue)

    if (normalizedValue !== null) {
      projectLiveValue(normalizedValue)
    }
  }

  const handleRangeInput = (rawValue: string) => {
    rangeInteractionActiveRef.current = true
    const nextValue = getEditorRangeFieldValue(rawValue)
    if (onInput && continuousEdit) setRangeDraftValue(nextValue)
    projectLiveValue(nextValue)
  }

  const completeRangeInteraction = (rawValue: string) => {
    if (!rangeInteractionActiveRef.current) return
    rangeInteractionActiveRef.current = false
    // The coordinator owns the latest accepted Case input. A controlled DOM
    // value can still reflect the previous aggregate before its queued frame.
    finishLiveValue(onInput && continuousEdit
      ? undefined
      : getEditorRangeFieldValue(rawValue))
    setRangeDraftValue(null)
  }

  return (
    <span className="editor-range-field-control">
      <input
        id={id}
        type="range"
        min={sliderMin ?? min}
        max={sliderMax ?? max}
        step={sliderStep ?? step}
        value={rangeDraftValue ?? sliderValue ?? value}
        disabled={disabled || sliderDisabled}
        aria-describedby={describedBy}
        aria-valuetext={sliderValueText}
        onInput={
          onInput
            ? (event) =>
                handleRangeInput(event.currentTarget.value)
            : undefined
        }
        onChange={onInput
          ? undefined
          : (event) =>
              onChange(getEditorRangeFieldValue(event.currentTarget.value))}
        onPointerUp={(event) =>
          completeRangeInteraction(event.currentTarget.value)}
        onPointerCancel={(event) =>
          completeRangeInteraction(event.currentTarget.value)}
        onLostPointerCapture={(event) =>
          completeRangeInteraction(event.currentTarget.value)}
        onBlur={(event) =>
          completeRangeInteraction(event.currentTarget.value)}
        onKeyUp={(event) =>
          completeRangeInteraction(event.currentTarget.value)}
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
          aria-describedby={
            [unitId, describedBy].filter(Boolean).join(' ') || undefined
          }
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
              if (onInput && continuousEdit) continuousEdit.finish(id)
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
  describedBy,
  disabled = false,
  id,
  inputValidationMode,
  label,
  max,
  min,
  onChange,
  onInvalidCommit,
  onInput,
  sliderDisabled,
  sliderMax,
  sliderMin,
  sliderStep,
  sliderValue,
  sliderValueText,
  step,
  unit,
  value,
}: EditorRangeFieldProps) {
  return (
    <div className="editor-range-field">
      <label htmlFor={id}>{label}</label>
      <EditorRangeInput
        describedBy={describedBy}
        id={id}
        label={label}
        min={min}
        max={max}
        step={step}
        unit={unit}
        value={value}
        disabled={disabled}
        inputValidationMode={inputValidationMode}
        onInput={onInput}
        onChange={onChange}
        onInvalidCommit={onInvalidCommit}
        sliderDisabled={sliderDisabled}
        sliderMax={sliderMax}
        sliderMin={sliderMin}
        sliderStep={sliderStep}
        sliderValue={sliderValue}
        sliderValueText={sliderValueText}
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
