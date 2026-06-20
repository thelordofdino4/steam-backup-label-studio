import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  ContextualTextControlGroupId,
} from '../../text/contextualTextControlViewModel'
import type {
  InlinePreviewTextEditorMenuPlacement,
} from './inlinePreviewTextEditorPositioning'

export type InlinePreviewTextEditorInputMode = 'overlay' | 'adapter'

export type InlinePreviewTextEditorTab = ContextualTextControlGroupId

export type InlinePreviewTextEditorSelectionRange = {
  end: number
  start: number
}

export type InlinePreviewTextEditorToggleState =
  | 'active'
  | 'inactive'
  | 'mixed'

export type InlinePreviewTextEditorLine = {
  text: string
}

export type InlinePreviewTextEditorGeometryLine = {
  caretXRatios: number[]
  heightRatio: number
  text: string
  topRatio: number
}

export type InlinePreviewTextEditorOption<T extends string = string> = {
  label: string
  value: T
}

export type InlinePreviewTextEditorSelectControl<T extends string = string> = {
  label: string
  options: readonly InlinePreviewTextEditorOption<T>[]
  value: T
  onChange: (value: T) => void
}

export type InlinePreviewTextEditorRangeControl = {
  label: string
  max: number
  min: number
  step: number
  value: number
  onChange: (value: number) => void
}

export type InlinePreviewTextEditorNumberSelectControl = {
  label: string
  max: number
  min: number
  options: readonly number[]
  step: number
  value: number
  getSelectionValue?: (
    selection: InlinePreviewTextEditorSelectionRange,
  ) => {
    state: InlinePreviewTextEditorToggleState
    value?: number
  } | undefined
  onChange: (
    value: number,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => void
}

export type InlinePreviewTextEditorCheckboxControl = {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

export type InlinePreviewTextEditorToggleControl = {
  label: string
  pressed: boolean
  getSelectionState?: (
    selection: InlinePreviewTextEditorSelectionRange,
  ) => InlinePreviewTextEditorToggleState | undefined
  onChange: (
    pressed: boolean,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => InlinePreviewTextEditorSelectionRange | void
}

export type InlinePreviewTextEditorColorControl = {
  label: string
  value: string
  getSelectionValue?: (
    selection: InlinePreviewTextEditorSelectionRange,
  ) => {
    state: InlinePreviewTextEditorToggleState
    value?: string
  } | undefined
  onChange: (
    value: string,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => void
}

export type InlinePreviewTextEditorTextValueControl = {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
}

export type InlinePreviewTextEditorControls = {
  presets?: {
    layout?: InlinePreviewTextEditorSelectControl
    style?: InlinePreviewTextEditorSelectControl
    onReset?: () => void
  }
  text?: {
    alignment?: InlinePreviewTextEditorSelectControl
    bold?: InlinePreviewTextEditorToggleControl
    bulletedList?: InlinePreviewTextEditorToggleControl
    fontFamily?: InlinePreviewTextEditorSelectControl
    italic?: InlinePreviewTextEditorToggleControl
    size?: InlinePreviewTextEditorNumberSelectControl | InlinePreviewTextEditorRangeControl
    textValue?: InlinePreviewTextEditorTextValueControl
    underline?: InlinePreviewTextEditorToggleControl
    unsupported?: readonly string[]
  }
  art?: {
    backgroundColor?: InlinePreviewTextEditorColorControl
    backgroundEnabled?: InlinePreviewTextEditorCheckboxControl
    backgroundOpacity?: InlinePreviewTextEditorRangeControl
    backgroundPadding?: InlinePreviewTextEditorRangeControl
    borderColor?: InlinePreviewTextEditorColorControl
    borderEnabled?: InlinePreviewTextEditorCheckboxControl
    borderRadius?: InlinePreviewTextEditorRangeControl
    color?: InlinePreviewTextEditorColorControl
    contrast?: InlinePreviewTextEditorSelectControl
  }
  utilities?: {
    arcDegrees?: InlinePreviewTextEditorRangeControl
    arcSide?: InlinePreviewTextEditorSelectControl
    htmlSource?: InlinePreviewTextEditorCheckboxControl
    lineSpacing?: InlinePreviewTextEditorRangeControl
    mode?: InlinePreviewTextEditorSelectControl
    respectVisualElements?: InlinePreviewTextEditorCheckboxControl
    resetLayout?: () => void
    width?: InlinePreviewTextEditorRangeControl
    x?: InlinePreviewTextEditorRangeControl
    y?: InlinePreviewTextEditorRangeControl
  }
  deleteAction?: {
    ariaLabel?: string
    label?: string
    onDelete: () => void
  }
}

export type InlinePreviewTextEditorProps = {
  ariaLabel: string
  caretValue: string
  controls?: InlinePreviewTextEditorControls
  inputMode?: InlinePreviewTextEditorInputMode
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  lines: InlinePreviewTextEditorLine[]
  rotationDegrees?: number
  targetKey: string
  value: string
  textareaStyle?: CSSProperties
  sourceMode?: boolean
  suppressCanvasInput?: boolean
  menuPlacement: InlinePreviewTextEditorMenuPlacement
  onValueChange: (
    value: string,
    options?: { sourceMode?: boolean },
  ) => void
  onMoveHandlePointerDown: (event: ReactPointerEvent<Element>) => void
  onMoveHandlePointerMove: (event: ReactPointerEvent<Element>) => void
  onMoveHandlePointerUp: (event: ReactPointerEvent<Element>) => void
  onRichTextKeyboardCommand?: (
    command: 'enter' | 'shiftEnter' | 'backspace',
    selection: InlinePreviewTextEditorSelectionRange,
  ) => InlinePreviewTextEditorSelectionRange | null | void
  onDone: () => void
}

export type InlinePreviewTextEditorAdapterSurface =
  | 'case-cover-text'
  | 'case-tray-text'
  | 'case-left-spine-text'
  | 'case-right-spine-text'
  | 'straight-disc-text'
  | 'curved-disc-text'

export type InlinePreviewTextEditorFinalRenderer =
  | 'case-insert-dom-text'
  | 'disc-svg-text'

export type InlinePreviewTextEditorAdapterCapabilities = {
  caret: true
  commit: true
  delete?: true
  htmlSource?: true
  move: true
  selection: true
  cancel?: true
}

export type InlinePreviewTextEditorAdapterContract = {
  capabilities: InlinePreviewTextEditorAdapterCapabilities
  finalRenderer: InlinePreviewTextEditorFinalRenderer
  previewEditableId: string
  props: InlinePreviewTextEditorProps
  surface: InlinePreviewTextEditorAdapterSurface
  targetKey: string
}

export type InlinePreviewTextEditorEditSession = {
  caretValue: string
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  inputMode: InlinePreviewTextEditorInputMode
  lines: InlinePreviewTextEditorLine[]
  rotationDegrees?: number
  sourceMode: boolean
  targetKey: string
  value: string
}

export const INLINE_PREVIEW_TEXT_ADAPTER_REQUIRED_CAPABILITIES = {
  caret: true,
  commit: true,
  move: true,
  selection: true,
} as const satisfies Pick<
  InlinePreviewTextEditorAdapterCapabilities,
  'caret' | 'commit' | 'move' | 'selection'
>

export const INLINE_PREVIEW_TEXT_RECTANGULAR_UNSUPPORTED_UTILITY_CONTROLS = [
  'arcDegrees',
  'arcSide',
  'mode',
] as const satisfies readonly (keyof NonNullable<
  InlinePreviewTextEditorControls['utilities']
>)[]

export const CURVED_DISC_TEXT_CONTEXTUAL_EDITOR_EXCEPTION = {
  finalRenderer: 'disc-svg-textPath',
  reason:
    'Curved disc text remains SVG/textPath based and uses a contextual menu adapter without rectangular on-canvas text input.',
  surface: 'curved-disc-text',
  supportsContextualEditor: true,
} as const

export function createInlinePreviewTextEditorEditSession(
  props: InlinePreviewTextEditorProps,
): InlinePreviewTextEditorEditSession {
  return {
    caretValue: props.caretValue,
    geometryLines: props.geometryLines,
    inputMode: props.inputMode ?? 'overlay',
    lines: props.lines,
    rotationDegrees: props.rotationDegrees,
    sourceMode: props.sourceMode ?? false,
    targetKey: props.targetKey,
    value: props.value,
  }
}

function assertNonEmptyString(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`${label} must be a non-empty string`)
  }
}

function assertFunction(value: unknown, label: string) {
  if (typeof value !== 'function') {
    throw new Error(`${label} must be a function`)
  }
}

function assertRequiredCapabilities(
  capabilities: InlinePreviewTextEditorAdapterCapabilities,
) {
  for (const capability of Object.keys(
    INLINE_PREVIEW_TEXT_ADAPTER_REQUIRED_CAPABILITIES,
  ) as (keyof typeof INLINE_PREVIEW_TEXT_ADAPTER_REQUIRED_CAPABILITIES)[]) {
    if (capabilities[capability] !== true) {
      throw new Error(`Adapter must support ${capability}`)
    }
  }

  if ('cancel' in capabilities) {
    throw new Error(
      'Cancel is not part of the current contextual editor adapter contract; omit unsupported capabilities instead of faking them.',
    )
  }
}

function assertLines(lines: readonly InlinePreviewTextEditorLine[]) {
  if (lines.length === 0) {
    throw new Error('Adapter must expose at least one rendered line')
  }

  lines.forEach((line, index) => {
    if (typeof line.text !== 'string') {
      throw new Error(`Rendered line ${index} must expose text`)
    }
  })
}

function assertGeometryLines(
  geometryLines: readonly InlinePreviewTextEditorGeometryLine[] | undefined,
) {
  geometryLines?.forEach((line, index) => {
    if (!Array.isArray(line.caretXRatios) || line.caretXRatios.length === 0) {
      throw new Error(`Geometry line ${index} must expose caret ratios`)
    }
    if (typeof line.heightRatio !== 'number' ||
      typeof line.topRatio !== 'number') {
      throw new Error(`Geometry line ${index} must expose numeric bounds`)
    }
    if (typeof line.text !== 'string') {
      throw new Error(`Geometry line ${index} must expose text`)
    }
  })
}

function assertUnsupportedControlsOmitted(
  controls: InlinePreviewTextEditorControls | undefined,
) {
  const utilities = controls?.utilities

  for (const controlId of INLINE_PREVIEW_TEXT_RECTANGULAR_UNSUPPORTED_UTILITY_CONTROLS) {
    if (utilities && Object.hasOwn(utilities, controlId)) {
      throw new Error(
        `${controlId} must stay omitted from rectangular contextual text adapters`,
      )
    }
  }
}

export function assertInlinePreviewTextEditorAdapterContract(
  adapter: InlinePreviewTextEditorAdapterContract,
) {
  assertNonEmptyString(adapter.previewEditableId, 'previewEditableId')
  assertNonEmptyString(adapter.targetKey, 'targetKey')
  assertNonEmptyString(adapter.props.ariaLabel, 'ariaLabel')
  assertRequiredCapabilities(adapter.capabilities)
  assertLines(adapter.props.lines)
  assertGeometryLines(adapter.props.geometryLines)
  assertUnsupportedControlsOmitted(adapter.props.controls)

  if (adapter.props.targetKey !== adapter.targetKey) {
    throw new Error('Adapter targetKey must match editor props targetKey')
  }
  if ((adapter.props.inputMode ?? 'overlay') !== 'adapter') {
    throw new Error('Preview-mounted contextual adapters must use adapter input mode')
  }

  assertFunction(adapter.props.onValueChange, 'onValueChange')
  assertFunction(adapter.props.onDone, 'onDone')
  assertFunction(adapter.props.onMoveHandlePointerDown, 'onMoveHandlePointerDown')
  assertFunction(adapter.props.onMoveHandlePointerMove, 'onMoveHandlePointerMove')
  assertFunction(adapter.props.onMoveHandlePointerUp, 'onMoveHandlePointerUp')

  if (adapter.capabilities.delete && !adapter.props.controls?.deleteAction) {
    throw new Error('Delete-capable adapters must expose deleteAction')
  }
  if (!adapter.capabilities.delete && adapter.props.controls?.deleteAction) {
    throw new Error('Adapters without delete capability must omit deleteAction')
  }
  if (adapter.props.controls?.deleteAction) {
    assertFunction(adapter.props.controls.deleteAction.onDelete, 'deleteAction.onDelete')
  }

  if (adapter.capabilities.htmlSource &&
    !adapter.props.controls?.utilities?.htmlSource) {
    throw new Error('HTML-source-capable adapters must expose htmlSource')
  }
  if (!adapter.capabilities.htmlSource &&
    adapter.props.controls?.utilities?.htmlSource) {
    throw new Error(
      'Adapters without HTML source capability must omit htmlSource controls',
    )
  }
  if (adapter.props.sourceMode && !adapter.props.controls?.utilities?.htmlSource) {
    throw new Error('sourceMode requires an HTML source control')
  }

  return createInlinePreviewTextEditorEditSession(adapter.props)
}

export function assertCurvedDiscTextContextualEditorException(
  exception = CURVED_DISC_TEXT_CONTEXTUAL_EDITOR_EXCEPTION,
) {
  if (exception.supportsContextualEditor !== true) {
    throw new Error('Curved disc text must use the contextual menu adapter')
  }
  if (exception.finalRenderer !== 'disc-svg-textPath') {
    throw new Error('Curved disc text must keep SVG/textPath renderer ownership')
  }
  if (!exception.reason.includes('SVG/textPath')) {
    throw new Error('Curved disc text exception must document SVG/textPath')
  }

  return exception
}
