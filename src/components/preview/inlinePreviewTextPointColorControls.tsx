import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  formatInlinePreviewPointSizeValue,
  getInlinePreviewPointSizeCommitValue,
  getInlinePreviewPointSizeLiveValue,
  parseInlinePreviewPointSizeDraft,
  stepInlinePreviewPointSizeValue,
} from './inlinePreviewPointSizeControl'
import {
  isInlineTextSelectionCollapsed,
} from './inlinePreviewTextEditorSelection'
import {
  getInlineTextSmokeToken,
  keepInlineTextEditorFocus,
  renderInlinePreviewTextRangeControl,
  stopInlineTextEditorClick,
  stopInlineTextEditorPointer,
} from './inlinePreviewTextRibbonControls'
import type {
  InlinePreviewTextEditorColorControl,
  InlinePreviewTextEditorNumberSelectControl,
  InlinePreviewTextEditorRangeControl,
  InlinePreviewTextEditorSelectionRange,
} from './inlinePreviewTextEditorContract'

function InlinePreviewTextNumberSelectControl({
  control,
  selection,
}: {
  control: InlinePreviewTextEditorNumberSelectControl
  selection: InlinePreviewTextEditorSelectionRange
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const holdDelayRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)
  const holdAbortRef = useRef<AbortController | null>(null)
  const holdDirectionRef = useRef<-1 | 1 | null>(null)
  const holdRepeatTicksRef = useRef(0)
  const holdStartTimeRef = useRef<number | null>(null)
  const token = getInlineTextSmokeToken(control.label)
  const selectionValue = control.getSelectionValue?.(selection)
  const displayedValue = selectionValue?.state === 'active' &&
      typeof selectionValue.value === 'number'
    ? selectionValue.value
    : control.value
  const latestValueRef = useRef(displayedValue)
  const stepValueRef = useRef<((direction: -1 | 1) => void) | null>(null)
  const isMixedSelection = selectionValue?.state === 'mixed'
  const controlValueText = formatInlinePreviewPointSizeValue(displayedValue)
  const [draft, setDraft] = useState(() =>
    controlValueText)
  const [focused, setFocused] = useState(false)
  const renderedDraft = focused
    ? draft
    : isMixedSelection
      ? 'Mixed'
      : controlValueText
  const matchingPreset = control.options.find((option) =>
    option === displayedValue)

  const config = useMemo(() => ({
    max: control.max,
    min: control.min,
    step: control.step,
  }), [control.max, control.min, control.step])

  const clearHoldTimers = useCallback(() => {
    const holdDirection = holdDirectionRef.current
    const holdStartTime = holdStartTimeRef.current

    if (holdDirection !== null && holdStartTime !== null) {
      const heldMs = Date.now() - holdStartTime
      const expectedRepeatTicks = Math.max(0, Math.floor((heldMs - 180) / 70))
      const missingRepeatTicks =
        expectedRepeatTicks - holdRepeatTicksRef.current

      for (let index = 0; index < missingRepeatTicks; index += 1) {
        stepValueRef.current?.(holdDirection)
      }
    }

    holdDirectionRef.current = null
    holdRepeatTicksRef.current = 0
    holdStartTimeRef.current = null
    holdAbortRef.current?.abort()
    holdAbortRef.current = null
    if (holdDelayRef.current !== null) {
      window.clearTimeout(holdDelayRef.current)
      holdDelayRef.current = null
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }, [])

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
    })
  }, [])

  const keepNumberControlVisible = useCallback(() => {
    window.requestAnimationFrame(() => {
      const input = inputRef.current
      const field = input?.closest('.inline-preview-text-number-select-field')
      const menu = input?.closest('[data-smoke-id="inline-text-menu"]')

      if (!(field instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return
      }

      const fieldRect = field.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      const inset = 4

      if (fieldRect.top < menuRect.top + inset) {
        menu.scrollTop -= menuRect.top + inset - fieldRect.top
        return
      }

      if (fieldRect.bottom > menuRect.bottom - inset) {
        menu.scrollTop += fieldRect.bottom - (menuRect.bottom - inset)
      }
    })
  }, [])

  const commitDraft = useCallback((nextDraft = draft) => {
    const nextValue = getInlinePreviewPointSizeCommitValue({
      ...config,
      currentValue: latestValueRef.current,
      draft: nextDraft,
    })

    latestValueRef.current = nextValue
    control.onChange(nextValue, selection)
    setDraft(formatInlinePreviewPointSizeValue(nextValue))
    keepNumberControlVisible()
  }, [config, control, draft, keepNumberControlVisible, selection])

  const updateDraft = useCallback((nextDraft: string) => {
    setDraft(nextDraft)
    const liveValue = getInlinePreviewPointSizeLiveValue(nextDraft, config)

    if (liveValue !== null && liveValue !== latestValueRef.current) {
      latestValueRef.current = liveValue
      control.onChange(liveValue, selection)
    }
    keepNumberControlVisible()
  }, [config, control, keepNumberControlVisible, selection])

  const selectValue = useCallback((value: number) => {
    latestValueRef.current = value
    control.onChange(value, selection)
    setDraft(formatInlinePreviewPointSizeValue(value))
    focusInput()
    keepNumberControlVisible()
  }, [control, focusInput, keepNumberControlVisible, selection])

  const stepValue = useCallback((direction: -1 | 1) => {
    const currentInputValue = inputRef.current?.value
    const draftValue = currentInputValue === undefined
      ? null
      : parseInlinePreviewPointSizeDraft(currentInputValue)
    const nextValue = stepInlinePreviewPointSizeValue({
      ...config,
      direction,
      value: draftValue ?? latestValueRef.current,
    })

    latestValueRef.current = nextValue
    control.onChange(nextValue, selection)
    setDraft(formatInlinePreviewPointSizeValue(nextValue))
    keepNumberControlVisible()
  }, [config, control, keepNumberControlVisible, selection])

  useEffect(() => {
    stepValueRef.current = stepValue
  }, [stepValue])

  const startStepping = useCallback((direction: -1 | 1) => {
    clearHoldTimers()
    holdDirectionRef.current = direction
    holdRepeatTicksRef.current = 0
    holdStartTimeRef.current = Date.now()
    const abortController = new AbortController()
    holdAbortRef.current = abortController
    document.addEventListener('pointerup', clearHoldTimers, {
      signal: abortController.signal,
    })
    document.addEventListener('mouseup', clearHoldTimers, {
      signal: abortController.signal,
    })
    stepValue(direction)
    holdDelayRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        holdRepeatTicksRef.current += 1
        stepValue(direction)
      }, 70)
    }, 180)
  }, [clearHoldTimers, stepValue])

  const handleStepperPointerDown = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    direction: -1 | 1,
  ) => {
    keepInlineTextEditorFocus(event)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    startStepping(direction)
  }, [startStepping])

  const handleStepperPointerEnd = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation()
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    clearHoldTimers()
  }, [clearHoldTimers])

  const handleStepperMouseDownFallback = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    direction: -1 | 1,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (holdDirectionRef.current === null) {
      startStepping(direction)
    }
  }, [startStepping])

  useEffect(() => {
    latestValueRef.current = displayedValue
  }, [displayedValue])

  useEffect(() => clearHoldTimers, [clearHoldTimers])

  return (
    <label className="contextual-text-ribbon-control contextual-text-ribbon-point-size-control inline-preview-text-number-select-field">
      <span className="contextual-text-ribbon-control-label">
        POINTS
      </span>
      <span className="contextual-text-ribbon-point-size inline-preview-text-number-select">
        <input
          ref={inputRef}
          aria-label={control.label}
          autoComplete="off"
          data-smoke-id={`inline-text-number-${token}`}
          data-selection-state={selectionValue?.state}
          inputMode="decimal"
          max={control.max}
          min={control.min}
          step={control.step}
          type="text"
          value={renderedDraft}
          onBlur={(event) => {
            setFocused(false)
            commitDraft(event.currentTarget.value)
          }}
          onChange={(event) => updateDraft(event.target.value)}
          onClick={stopInlineTextEditorClick}
          onFocus={() => {
            setDraft(isMixedSelection ? '' : controlValueText)
            setFocused(true)
            keepNumberControlVisible()
          }}
          onKeyDown={(event) => {
            event.stopPropagation()

            if (event.key === 'Enter') {
              event.preventDefault()
              commitDraft(event.currentTarget.value)
              return
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              setDraft(formatInlinePreviewPointSizeValue(latestValueRef.current))
              return
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault()
              stepValue(-1)
              return
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault()
              stepValue(1)
            }
          }}
          onWheel={(event) => {
            if (document.activeElement !== event.currentTarget) {
              return
            }
            event.preventDefault()
            event.stopPropagation()
            stepValue(event.deltaY < 0 ? 1 : -1)
          }}
        />
        <span className="contextual-text-ribbon-point-size-chevron-hit">
          <select
            aria-label={`${control.label} presets`}
            className="contextual-text-ribbon-point-size-presets inline-preview-text-number-preset-select"
            data-smoke-id={`inline-text-number-options-${token}`}
            value={matchingPreset === undefined ? 'custom' : String(matchingPreset)}
            onChange={(event) => {
              event.stopPropagation()
              const value = Number(event.target.value)
              if (Number.isFinite(value)) {
                selectValue(value)
              }
            }}
            onClick={stopInlineTextEditorClick}
            onFocus={keepNumberControlVisible}
            onKeyDown={(event) => event.stopPropagation()}
            onPointerDown={stopInlineTextEditorPointer}
          >
            <option value="custom" hidden aria-label="Custom point size" />
            {control.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className="contextual-text-ribbon-point-size-chevron"
          />
        </span>
      </span>
      <span className="inline-preview-text-number-buttons">
        <button
          type="button"
          aria-label={`Increase ${control.label}`}
          className="inline-preview-text-number-step"
          data-smoke-id={`inline-text-number-step-up-${token}`}
          onClick={stopInlineTextEditorClick}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              stepValue(1)
            }
          }}
          onLostPointerCapture={handleStepperPointerEnd}
          onMouseDown={(event) => handleStepperMouseDownFallback(event, 1)}
          onPointerCancel={handleStepperPointerEnd}
          onPointerDown={(event) => handleStepperPointerDown(event, 1)}
          onPointerUp={handleStepperPointerEnd}
        >
          +
        </button>
        <button
          type="button"
          aria-label={`Decrease ${control.label}`}
          className="inline-preview-text-number-step"
          data-smoke-id={`inline-text-number-step-down-${token}`}
          onClick={stopInlineTextEditorClick}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              stepValue(-1)
            }
          }}
          onLostPointerCapture={handleStepperPointerEnd}
          onMouseDown={(event) => handleStepperMouseDownFallback(event, -1)}
          onPointerCancel={handleStepperPointerEnd}
          onPointerDown={(event) => handleStepperPointerDown(event, -1)}
          onPointerUp={handleStepperPointerEnd}
        >
          -
        </button>
      </span>
    </label>
  )
}

function renderInlinePreviewTextNumberSelectControl(
  control: InlinePreviewTextEditorNumberSelectControl | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return control
    ? (
        <InlinePreviewTextNumberSelectControl
          control={control}
          selection={selection}
        />
      )
    : null
}

export function InlinePreviewTextSizeControl({
  control,
  selection,
}: {
  control:
    | InlinePreviewTextEditorNumberSelectControl
    | InlinePreviewTextEditorRangeControl
    | undefined
  selection: InlinePreviewTextEditorSelectionRange
}) {
  if (!control) return null

  return 'options' in control
    ? renderInlinePreviewTextNumberSelectControl(control, selection)
    : renderInlinePreviewTextRangeControl(control)
}

export function InlinePreviewTextColorControl({
  control,
  disabled,
  getCommandSelection,
  label,
  selection,
}: {
  control: InlinePreviewTextEditorColorControl | undefined
  disabled?: boolean
  getCommandSelection: () => InlinePreviewTextEditorSelectionRange
  label?: string
  selection: InlinePreviewTextEditorSelectionRange
}) {
  if (!control) return null

  return (
    <InlinePreviewTextColorInputControl
      control={control}
      disabled={disabled}
      getCommandSelection={getCommandSelection}
      label={label}
      selection={selection}
    />
  )
}

function getInlineTextSelectionKey(
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return `${selection.start}:${selection.end}`
}

function InlinePreviewTextColorInputControl({
  control,
  disabled = false,
  getCommandSelection,
  label,
  selection,
}: {
  control: InlinePreviewTextEditorColorControl
  disabled?: boolean
  getCommandSelection: () => InlinePreviewTextEditorSelectionRange
  label?: string
  selection: InlinePreviewTextEditorSelectionRange
}) {
  const selectionSnapshotRef =
    useRef<InlinePreviewTextEditorSelectionRange | null>(null)
  const lastAppliedRef = useRef<string | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingValueRef = useRef<string | null>(null)
  const isEditingRef = useRef(false)

  const selectionColor = control.getSelectionValue?.(selection)
  const value = selectionColor?.value ?? control.value
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!isEditingRef.current) {
      setDraft(value)
    }
  }, [value])

  useEffect(() => () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const captureSelection = useCallback(() => {
    isEditingRef.current = true
    selectionSnapshotRef.current = getCommandSelection()
  }, [getCommandSelection])
  const applyColorNow = useCallback((nextValue: string) => {
    if (disabled) return
    const snapshot = selectionSnapshotRef.current
    const selectedRange =
      snapshot && !isInlineTextSelectionCollapsed(snapshot)
        ? snapshot
        : getCommandSelection()
    const applyKey = `${nextValue}:${getInlineTextSelectionKey(selectedRange)}`

    if (lastAppliedRef.current === applyKey) {
      return
    }

    lastAppliedRef.current = applyKey
    control.onChange(nextValue, selectedRange)
  }, [control, disabled, getCommandSelection])
  const flushPendingColor = useCallback(() => {
    rafRef.current = null
    const pendingValue = pendingValueRef.current
    pendingValueRef.current = null

    if (pendingValue !== null) {
      applyColorNow(pendingValue)
    }
  }, [applyColorNow])
  const applyColorDraft = useCallback((nextValue: string) => {
    if (disabled) return
    isEditingRef.current = true
    setDraft(nextValue)
    pendingValueRef.current = nextValue

    if (rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(flushPendingColor)
    }
  }, [disabled, flushPendingColor])
  const commitColorDraft = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const pendingValue = pendingValueRef.current
    pendingValueRef.current = null

    if (pendingValue !== null) {
      applyColorNow(pendingValue)
    }

    isEditingRef.current = false
  }, [applyColorNow])

  return (
    <label
      className={[
        'contextual-text-ribbon-control contextual-text-ribbon-color-control',
        disabled ? 'is-disabled' : '',
      ].filter(Boolean).join(' ')}
    >
      <span className="contextual-text-ribbon-control-label">
        {label ?? control.label}
      </span>
      <input
        data-smoke-id={`inline-text-color-${getInlineTextSmokeToken(control.label)}`}
        type="color"
        value={draft}
        disabled={disabled}
        data-selection-state={selectionColor?.state}
        onBlur={() => {
          commitColorDraft()
          lastAppliedRef.current = null
        }}
        onChange={(event) => applyColorDraft(event.currentTarget.value)}
        onClick={stopInlineTextEditorClick}
        onFocus={captureSelection}
        onInput={(event) => applyColorDraft(event.currentTarget.value)}
        onPointerDownCapture={captureSelection}
        onPointerDown={stopInlineTextEditorPointer}
      />
    </label>
  )
}
