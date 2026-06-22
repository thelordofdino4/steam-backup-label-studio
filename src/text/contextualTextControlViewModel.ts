export type ContextualTextControlGroupId =
  | 'presets'
  | 'text'
  | 'art'
  | 'utilities'
  | 'html'

export type ContextualTextControlId =
  | 'stylePreset'
  | 'layoutPreset'
  | 'fontFamily'
  | 'size'
  | 'alignment'
  | 'bold'
  | 'bulletedList'
  | 'italic'
  | 'underline'
  | 'color'
  | 'contrast'
  | 'backgroundEnabled'
  | 'backgroundColor'
  | 'backgroundOpacity'
  | 'backgroundPadding'
  | 'borderEnabled'
  | 'borderColor'
  | 'borderRadius'
  | 'respectVisualElements'
  | 'width'
  | 'lineSpacing'
  | 'x'
  | 'y'
  | 'mode'
  | 'arcSide'
  | 'arcDegrees'
  | 'resetStyle'
  | 'resetLayout'
  | 'htmlSource'
  | 'delete'

export type ContextualTextControlLabelId =
  | ContextualTextControlId
  | 'customPreset'

export type ContextualTextTargetCapabilityId =
  | 'caseInsertRectangularText'
  | 'straightDiscText'
  | 'curvedDiscCopyrightText'

export type ContextualTextPresetOption<TValue extends string = string> = {
  label: string
  value: TValue
}

export type ContextualTextPresetSource = {
  id: string
  label: string
}

export type ContextualTextStylePresetSource<TStyle extends object> =
  ContextualTextPresetSource & {
    style: Partial<TStyle>
  }

export type ContextualTextControlCapability = {
  group: ContextualTextControlGroupId
  hasContextualEquivalent: boolean
  id: ContextualTextControlId
  label: string
}

export type ContextualTextTargetCapability = {
  contextualControlIds: readonly ContextualTextControlId[]
  id: ContextualTextTargetCapabilityId
  label: string
  sidebarException?: string
  supportsContextualEditor: boolean
  targetSpecificControlIds: readonly ContextualTextControlId[]
  unsupportedControlIds: readonly ContextualTextControlId[]
}

export const CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE = 'custom'

export const CONTEXTUAL_TEXT_CUSTOM_OPTION = {
  label: 'Custom',
  value: CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE,
} as const

export const CONTEXTUAL_TEXT_ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const

export const CONTEXTUAL_TEXT_CONTROL_GROUPS = [
  { id: 'presets', label: 'Style Presets' },
  { id: 'text', label: 'Text Controls' },
  { id: 'art', label: 'Artistic Elements' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'html', label: 'HTML Source' },
] as const satisfies readonly {
  id: ContextualTextControlGroupId
  label: string
}[]

export const CONTEXTUAL_TEXT_CONTROL_LABELS = {
  alignment: 'Align',
  arcDegrees: 'Arc',
  arcSide: 'Arc side',
  backgroundColor: 'Fill',
  backgroundEnabled: 'Background',
  backgroundOpacity: 'Opacity',
  backgroundPadding: 'Padding',
  bold: 'Bold',
  bulletedList: 'Bulleted List',
  borderColor: 'Line',
  borderEnabled: 'Border',
  borderRadius: 'Radius',
  color: 'Color',
  contrast: 'Contrast',
  customPreset: CONTEXTUAL_TEXT_CUSTOM_OPTION.label,
  delete: 'Delete',
  fontFamily: 'Font',
  htmlSource: 'HTML source',
  italic: 'Italic',
  layoutPreset: 'Layout preset',
  lineSpacing: 'Line spacing',
  mode: 'Mode',
  resetLayout: 'Reset layout',
  resetStyle: 'Reset style',
  respectVisualElements: 'Respect visuals',
  size: 'Font size (pt)',
  stylePreset: 'Style preset',
  underline: 'Underline',
  width: 'Wrap width',
  x: 'X',
  y: 'Y',
} as const satisfies Record<ContextualTextControlLabelId, string>

const COMMON_CONTEXTUAL_CONTROL_IDS = [
  'stylePreset',
  'layoutPreset',
  'fontFamily',
  'size',
  'alignment',
  'bold',
  'bulletedList',
  'italic',
  'underline',
  'color',
  'contrast',
  'backgroundEnabled',
  'backgroundColor',
  'backgroundOpacity',
  'backgroundPadding',
  'borderEnabled',
  'borderColor',
  'borderRadius',
  'respectVisualElements',
  'width',
  'x',
  'y',
  'resetStyle',
  'resetLayout',
  'htmlSource',
  'delete',
] as const satisfies readonly ContextualTextControlId[]

export const CONTEXTUAL_TEXT_CONTROL_CAPABILITIES = {
  alignment: {
    group: 'text',
    hasContextualEquivalent: true,
    id: 'alignment',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.alignment,
  },
  arcDegrees: {
    group: 'utilities',
    hasContextualEquivalent: true,
    id: 'arcDegrees',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.arcDegrees,
  },
  arcSide: {
    group: 'utilities',
    hasContextualEquivalent: true,
    id: 'arcSide',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.arcSide,
  },
  backgroundColor: {
    group: 'art',
    hasContextualEquivalent: true,
    id: 'backgroundColor',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundColor,
  },
  backgroundEnabled: {
    group: 'art',
    hasContextualEquivalent: true,
    id: 'backgroundEnabled',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundEnabled,
  },
  backgroundOpacity: {
    group: 'art',
    hasContextualEquivalent: true,
    id: 'backgroundOpacity',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundOpacity,
  },
  backgroundPadding: {
    group: 'art',
    hasContextualEquivalent: true,
    id: 'backgroundPadding',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundPadding,
  },
  bold: {
    group: 'text',
    hasContextualEquivalent: true,
    id: 'bold',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.bold,
  },
  bulletedList: {
    group: 'text',
    hasContextualEquivalent: true,
    id: 'bulletedList',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.bulletedList,
  },
  borderColor: {
    group: 'art',
    hasContextualEquivalent: true,
    id: 'borderColor',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderColor,
  },
  borderEnabled: {
    group: 'art',
    hasContextualEquivalent: true,
    id: 'borderEnabled',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderEnabled,
  },
  borderRadius: {
    group: 'art',
    hasContextualEquivalent: true,
    id: 'borderRadius',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderRadius,
  },
  color: {
    group: 'art',
    hasContextualEquivalent: true,
    id: 'color',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.color,
  },
  contrast: {
    group: 'art',
    hasContextualEquivalent: true,
    id: 'contrast',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.contrast,
  },
  delete: {
    group: 'utilities',
    hasContextualEquivalent: true,
    id: 'delete',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.delete,
  },
  fontFamily: {
    group: 'text',
    hasContextualEquivalent: true,
    id: 'fontFamily',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.fontFamily,
  },
  htmlSource: {
    group: 'html',
    hasContextualEquivalent: true,
    id: 'htmlSource',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.htmlSource,
  },
  italic: {
    group: 'text',
    hasContextualEquivalent: true,
    id: 'italic',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.italic,
  },
  lineSpacing: {
    group: 'utilities',
    hasContextualEquivalent: true,
    id: 'lineSpacing',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.lineSpacing,
  },
  layoutPreset: {
    group: 'presets',
    hasContextualEquivalent: true,
    id: 'layoutPreset',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.layoutPreset,
  },
  mode: {
    group: 'utilities',
    hasContextualEquivalent: false,
    id: 'mode',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.mode,
  },
  resetLayout: {
    group: 'utilities',
    hasContextualEquivalent: true,
    id: 'resetLayout',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.resetLayout,
  },
  resetStyle: {
    group: 'presets',
    hasContextualEquivalent: true,
    id: 'resetStyle',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.resetStyle,
  },
  respectVisualElements: {
    group: 'utilities',
    hasContextualEquivalent: true,
    id: 'respectVisualElements',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.respectVisualElements,
  },
  size: {
    group: 'text',
    hasContextualEquivalent: true,
    id: 'size',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.size,
  },
  stylePreset: {
    group: 'presets',
    hasContextualEquivalent: true,
    id: 'stylePreset',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.stylePreset,
  },
  underline: {
    group: 'text',
    hasContextualEquivalent: true,
    id: 'underline',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.underline,
  },
  width: {
    group: 'utilities',
    hasContextualEquivalent: true,
    id: 'width',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.width,
  },
  x: {
    group: 'utilities',
    hasContextualEquivalent: true,
    id: 'x',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.x,
  },
  y: {
    group: 'utilities',
    hasContextualEquivalent: true,
    id: 'y',
    label: CONTEXTUAL_TEXT_CONTROL_LABELS.y,
  },
} as const satisfies Record<
  ContextualTextControlId,
  ContextualTextControlCapability
>

export const CONTEXTUAL_TEXT_TARGET_CAPABILITIES = {
  caseInsertRectangularText: {
    contextualControlIds: COMMON_CONTEXTUAL_CONTROL_IDS,
    id: 'caseInsertRectangularText',
    label: 'Case insert rectangular text',
    supportsContextualEditor: true,
    targetSpecificControlIds: ['x', 'y', 'width', 'size'],
    unsupportedControlIds: ['mode', 'arcSide', 'arcDegrees'],
  },
  straightDiscText: {
    contextualControlIds: COMMON_CONTEXTUAL_CONTROL_IDS,
    id: 'straightDiscText',
    label: 'Straight disc text',
    supportsContextualEditor: true,
    targetSpecificControlIds: ['x', 'y', 'width', 'size'],
    unsupportedControlIds: ['mode', 'arcSide', 'arcDegrees'],
  },
  curvedDiscCopyrightText: {
    contextualControlIds: [
      'stylePreset',
      'layoutPreset',
      'fontFamily',
      'size',
      'alignment',
      'bold',
      'italic',
      'underline',
      'color',
      'contrast',
      'x',
      'y',
      'lineSpacing',
      'arcSide',
      'arcDegrees',
      'htmlSource',
      'resetStyle',
      'resetLayout',
      'delete',
    ],
    id: 'curvedDiscCopyrightText',
    label: 'Curved copyright text',
    supportsContextualEditor: true,
    targetSpecificControlIds: ['mode', 'arcSide', 'arcDegrees'],
    unsupportedControlIds: [
      'bulletedList',
      'backgroundEnabled',
      'backgroundColor',
      'backgroundOpacity',
      'backgroundPadding',
      'borderEnabled',
      'borderColor',
      'borderRadius',
      'respectVisualElements',
      'width',
      'mode',
    ],
  },
} as const satisfies Record<
  ContextualTextTargetCapabilityId,
  ContextualTextTargetCapability
>

export function createContextualTextPresetOptions<
  TPreset extends ContextualTextPresetSource,
>(
  presets: readonly TPreset[],
) {
  return [
    CONTEXTUAL_TEXT_CUSTOM_OPTION,
    ...presets.map(({ id, label }) => ({
      label,
      value: id,
    })),
  ] satisfies readonly ContextualTextPresetOption[]
}

export function isContextualTextCustomPreset(
  value: string,
): value is typeof CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE {
  return value === CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE
}

export function contextualTextNumericValuesMatch(
  first: number | undefined,
  second: number,
  tolerance = 0.001,
) {
  return typeof first === 'number' && Math.abs(first - second) < tolerance
}

export function findMatchingContextualTextStylePreset<
  TStyle extends object,
  TPreset extends ContextualTextStylePresetSource<TStyle>,
>(
  style: TStyle,
  presets: readonly TPreset[],
) {
  return presets.find((preset) =>
    Object.entries(preset.style).every(
      ([field, value]) => style[field as keyof TStyle] === value,
    ),
  )
}

export function findMatchingContextualTextPreset<TPreset>(
  presets: readonly TPreset[],
  matches: (preset: TPreset) => boolean,
) {
  return presets.find(matches)
}

export function getContextualTextTargetCapability(
  targetId: ContextualTextTargetCapabilityId,
) {
  return CONTEXTUAL_TEXT_TARGET_CAPABILITIES[targetId]
}

export function hasContextualTextControlEquivalent(
  controlId: ContextualTextControlId,
) {
  return CONTEXTUAL_TEXT_CONTROL_CAPABILITIES[controlId]
    .hasContextualEquivalent
}

export function isContextualTextControlSupportedForTarget(
  targetId: ContextualTextTargetCapabilityId,
  controlId: ContextualTextControlId,
) {
  const target = getContextualTextTargetCapability(targetId)

  return (
    target.contextualControlIds as readonly ContextualTextControlId[]
  ).includes(controlId)
}
