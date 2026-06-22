import {
  CONTEXTUAL_TEXT_CONTROL_GROUPS,
  type ContextualTextControlGroupId,
} from '../../text/contextualTextControlViewModel.ts'
import type {
  InlinePreviewTextEditorControls,
} from './inlinePreviewTextEditorContract'

export type ContextualTextRibbonMode = 'wide' | 'medium' | 'narrow'

export type ContextualTextRibbonControlKind =
  | 'action'
  | 'checkbox'
  | 'color'
  | 'number'
  | 'range'
  | 'select'
  | 'text'
  | 'toggle'

export type ContextualTextRibbonControlDescriptor = {
  group: ContextualTextControlGroupId
  id: string
  kind: ContextualTextRibbonControlKind
  label: string
}

export type ContextualTextRibbonLayoutModel = {
  controlColumns: number
  controlsMayUseThirdRow: boolean
  controlRows: number
  mode: ContextualTextRibbonMode
  reservedHeight: number
  tabColumns: number
}

export const CONTEXTUAL_TEXT_RIBBON_WIDE_RESERVED_HEIGHT = 148
export const CONTEXTUAL_TEXT_RIBBON_COMPACT_RESERVED_HEIGHT = 148
export const CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT =
  CONTEXTUAL_TEXT_RIBBON_WIDE_RESERVED_HEIGHT
export const CONTEXTUAL_TEXT_RIBBON_TOAST_GAP = 10
export const CONTEXTUAL_TEXT_RIBBON_INACTIVE_TOAST_TOP = 18

export type ContextualTextRibbonWidthProfile = {
  grows?: boolean
  max: number
  min: number
  preferred: number
  rowSpan?: 1 | 2
}

export const CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS: Record<
  string,
  ContextualTextRibbonWidthProfile
> = {
  'style': { min: 148, preferred: 184, max: 220, grows: true },
  'layout-preset': { min: 148, preferred: 184, max: 220, grows: true },
  'font': { min: 330, preferred: 390, max: 430, grows: true },
  'paragraph': { min: 176, preferred: 220, max: 260, grows: true },
  'text-color': { min: 126, preferred: 138, max: 160, grows: true },
  'contrast': { min: 126, preferred: 144, max: 168, grows: true },
  'background': {
    min: 158,
    preferred: 224,
    max: 260,
    grows: true,
    rowSpan: 2,
  },
  'border': {
    min: 150,
    preferred: 208,
    max: 240,
    grows: true,
    rowSpan: 2,
  },
  'source': { min: 420, preferred: 720, max: 960, grows: true },
  'position': { min: 250, preferred: 320, max: 400, grows: true },
  'layout': { min: 320, preferred: 470, max: 560, grows: true },
  'reset': { min: 76, preferred: 86, max: 96 },
}

export const CONTEXTUAL_TEXT_RIBBON_TABS = CONTEXTUAL_TEXT_CONTROL_GROUPS
export const CONTEXTUAL_TEXT_RIBBON_NATIVE_TAB_LABELS = {
  art: 'Artistic',
  html: 'HTML',
  presets: 'Presets',
  text: 'Text',
  utilities: 'Utilities',
} satisfies Record<ContextualTextControlGroupId, string>

export function getContextualTextRibbonTabDisplayLabel(
  tabId: ContextualTextControlGroupId,
) {
  return CONTEXTUAL_TEXT_RIBBON_NATIVE_TAB_LABELS[tabId]
}

export function getContextualTextRibbonLayoutMode(
  containerWidth: number,
): ContextualTextRibbonMode {
  if (containerWidth >= 1400) return 'wide'
  if (containerWidth >= 520) return 'medium'
  return 'narrow'
}

export function getContextualTextRibbonReservedHeight(
  mode: ContextualTextRibbonMode,
) {
  return mode === 'wide'
    ? CONTEXTUAL_TEXT_RIBBON_WIDE_RESERVED_HEIGHT
    : CONTEXTUAL_TEXT_RIBBON_COMPACT_RESERVED_HEIGHT
}

export function getContextualTextRibbonActiveWidth(
  availableWidth: number,
  profile: ContextualTextRibbonWidthProfile,
) {
  const finiteAvailable = Number.isFinite(availableWidth)
    ? Math.max(0, availableWidth)
    : 0
  const finiteMax = Number.isFinite(profile.max)
    ? Math.max(0, profile.max)
    : finiteAvailable

  if (finiteAvailable <= profile.min) return finiteAvailable

  return Math.min(finiteAvailable, finiteMax)
}

export function getContextualTextRibbonLayoutModel(
  containerWidth: number,
): ContextualTextRibbonLayoutModel {
  const mode = getContextualTextRibbonLayoutMode(containerWidth)
  const reservedHeight = getContextualTextRibbonReservedHeight(mode)

  if (mode === 'wide') {
    return {
      controlColumns: 4,
      controlsMayUseThirdRow: false,
      controlRows: 1,
      mode,
      reservedHeight,
      tabColumns: 5,
    }
  }

  if (mode === 'medium') {
    return {
      controlColumns: 2,
      controlsMayUseThirdRow: true,
      controlRows: 2,
      mode,
      reservedHeight,
      tabColumns: 5,
    }
  }

  return {
    controlColumns: 1,
    controlsMayUseThirdRow: true,
    controlRows: 2,
    mode,
    reservedHeight,
    tabColumns: 5,
  }
}

export function getContextualTextRibbonToastOffset({
  inactiveTop = CONTEXTUAL_TEXT_RIBBON_INACTIVE_TOAST_TOP,
  isRibbonActive,
  reservedHeight = CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT,
  toastGap = CONTEXTUAL_TEXT_RIBBON_TOAST_GAP,
}: {
  inactiveTop?: number
  isRibbonActive: boolean
  reservedHeight?: number
  toastGap?: number
}) {
  return isRibbonActive ? reservedHeight + toastGap : inactiveTop
}

function addDescriptor(
  descriptors: ContextualTextRibbonControlDescriptor[],
  descriptor: ContextualTextRibbonControlDescriptor | false | undefined,
) {
  if (descriptor) descriptors.push(descriptor)
}

export function getContextualTextRibbonControlDescriptors(
  controls: InlinePreviewTextEditorControls | undefined,
): ContextualTextRibbonControlDescriptor[] {
  const descriptors: ContextualTextRibbonControlDescriptor[] = []

  addDescriptor(descriptors, controls?.presets?.style && {
    group: 'presets',
    id: 'stylePreset',
    kind: 'select',
    label: controls.presets.style.label,
  })
  addDescriptor(descriptors, controls?.presets?.layout && {
    group: 'presets',
    id: 'layoutPreset',
    kind: 'select',
    label: controls.presets.layout.label,
  })
  addDescriptor(descriptors, controls?.presets?.onReset && {
    group: 'presets',
    id: 'resetStyle',
    kind: 'action',
    label: 'Reset presets',
  })

  addDescriptor(descriptors, controls?.text?.textValue && {
    group: 'text',
    id: 'textValue',
    kind: 'text',
    label: controls.text.textValue.label,
  })
  addDescriptor(descriptors, controls?.text?.fontFamily && {
    group: 'text',
    id: 'fontFamily',
    kind: 'select',
    label: controls.text.fontFamily.label,
  })
  addDescriptor(descriptors, controls?.text?.size && {
    group: 'text',
    id: 'size',
    kind: 'options' in controls.text.size ? 'number' : 'range',
    label: controls.text.size.label,
  })
  addDescriptor(descriptors, controls?.text?.bold && {
    group: 'text',
    id: 'bold',
    kind: 'toggle',
    label: controls.text.bold.label,
  })
  addDescriptor(descriptors, controls?.text?.italic && {
    group: 'text',
    id: 'italic',
    kind: 'toggle',
    label: controls.text.italic.label,
  })
  addDescriptor(descriptors, controls?.text?.underline && {
    group: 'text',
    id: 'underline',
    kind: 'toggle',
    label: controls.text.underline.label,
  })
  addDescriptor(descriptors, controls?.text?.bulletedList && {
    group: 'text',
    id: 'bulletedList',
    kind: 'toggle',
    label: controls.text.bulletedList.label,
  })
  addDescriptor(descriptors, controls?.text?.alignment && {
    group: 'text',
    id: 'alignment',
    kind: 'select',
    label: controls.text.alignment.label,
  })

  addDescriptor(descriptors, controls?.art?.color && {
    group: 'art',
    id: 'color',
    kind: 'color',
    label: controls.art.color.label,
  })
  addDescriptor(descriptors, controls?.art?.contrast && {
    group: 'art',
    id: 'contrast',
    kind: 'select',
    label: controls.art.contrast.label,
  })
  addDescriptor(descriptors, controls?.art?.backgroundEnabled && {
    group: 'art',
    id: 'backgroundEnabled',
    kind: 'checkbox',
    label: controls.art.backgroundEnabled.label,
  })
  addDescriptor(descriptors, controls?.art?.backgroundColor && {
    group: 'art',
    id: 'backgroundColor',
    kind: 'color',
    label: controls.art.backgroundColor.label,
  })
  addDescriptor(descriptors, controls?.art?.backgroundOpacity && {
    group: 'art',
    id: 'backgroundOpacity',
    kind: 'range',
    label: controls.art.backgroundOpacity.label,
  })
  addDescriptor(descriptors, controls?.art?.backgroundPadding && {
    group: 'art',
    id: 'backgroundPadding',
    kind: 'range',
    label: controls.art.backgroundPadding.label,
  })
  addDescriptor(descriptors, controls?.art?.borderEnabled && {
    group: 'art',
    id: 'borderEnabled',
    kind: 'checkbox',
    label: controls.art.borderEnabled.label,
  })
  addDescriptor(descriptors, controls?.art?.borderColor && {
    group: 'art',
    id: 'borderColor',
    kind: 'color',
    label: controls.art.borderColor.label,
  })
  addDescriptor(descriptors, controls?.art?.borderRadius && {
    group: 'art',
    id: 'borderRadius',
    kind: 'range',
    label: controls.art.borderRadius.label,
  })

  addDescriptor(descriptors, controls?.utilities?.respectVisualElements && {
    group: 'utilities',
    id: 'respectVisualElements',
    kind: 'checkbox',
    label: controls.utilities.respectVisualElements.label,
  })
  addDescriptor(descriptors, controls?.utilities?.width && {
    group: 'utilities',
    id: 'width',
    kind: 'range',
    label: controls.utilities.width.label,
  })
  addDescriptor(descriptors, controls?.utilities?.x && {
    group: 'utilities',
    id: 'x',
    kind: 'range',
    label: controls.utilities.x.label,
  })
  addDescriptor(descriptors, controls?.utilities?.y && {
    group: 'utilities',
    id: 'y',
    kind: 'range',
    label: controls.utilities.y.label,
  })
  addDescriptor(descriptors, controls?.utilities?.lineSpacing && {
    group: 'utilities',
    id: 'lineSpacing',
    kind: 'range',
    label: controls.utilities.lineSpacing.label,
  })
  addDescriptor(descriptors, controls?.utilities?.arcSide && {
    group: 'utilities',
    id: 'arcSide',
    kind: 'select',
    label: controls.utilities.arcSide.label,
  })
  addDescriptor(descriptors, controls?.utilities?.arcDegrees && {
    group: 'utilities',
    id: 'arcDegrees',
    kind: 'range',
    label: controls.utilities.arcDegrees.label,
  })
  addDescriptor(descriptors, controls?.utilities?.mode && {
    group: 'utilities',
    id: 'mode',
    kind: 'select',
    label: controls.utilities.mode.label,
  })
  addDescriptor(descriptors, controls?.html?.source && {
    group: 'html',
    id: 'htmlSource',
    kind: 'checkbox',
    label: controls.html.source.label,
  })
  addDescriptor(descriptors, controls?.utilities?.resetLayout && {
    group: 'utilities',
    id: 'resetLayout',
    kind: 'action',
    label: 'Reset layout',
  })
  addDescriptor(descriptors, controls?.deleteAction && {
    group: 'utilities',
    id: 'delete',
    kind: 'action',
    label: controls.deleteAction.label ?? 'Delete',
  })

  return descriptors
}
