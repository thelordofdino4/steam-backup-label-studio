import type { ReactNode } from 'react'
import { getEditorRangeFieldValue } from './editorRangeFieldModel'

export type EditorRangeFieldProps = {
  disabled?: boolean
  id: string
  label: string
  max: number | string
  min: number | string
  onChange: (value: number) => void
  onInput?: (value: number) => void
  step: number | string
  value: number
}

type EditorRangeInputProps = Omit<EditorRangeFieldProps, 'label'>

function EditorRangeInput({
  disabled = false,
  id,
  max,
  min,
  onChange,
  onInput,
  step,
  value,
}: EditorRangeInputProps) {
  return (
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
  value,
}: EditorRangeFieldProps) {
  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <EditorRangeInput
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onInput={onInput}
        onChange={onChange}
      />
    </label>
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
      <EditorRangeInput {...inputProps} />
    </>
  )
}
