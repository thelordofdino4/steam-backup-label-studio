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
  mode: ContextualTextRibbonMode
  tabColumns: number
}

export const CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT = 64
export const CONTEXTUAL_TEXT_RIBBON_TOAST_GAP = 10
export const CONTEXTUAL_TEXT_RIBBON_INACTIVE_TOAST_TOP = 18

export const CONTEXTUAL_TEXT_RIBBON_TABS = CONTEXTUAL_TEXT_CONTROL_GROUPS
export const CONTEXTUAL_TEXT_RIBBON_NATIVE_TAB_LABELS = {
  art: 'Artistic',
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
  if (containerWidth >= 760) return 'wide'
  if (containerWidth >= 520) return 'medium'
  return 'narrow'
}

export function getContextualTextRibbonLayoutModel(
  containerWidth: number,
): ContextualTextRibbonLayoutModel {
  const mode = getContextualTextRibbonLayoutMode(containerWidth)

  if (mode === 'wide') {
    return {
      controlColumns: 4,
      controlsMayUseThirdRow: false,
      mode,
      tabColumns: 4,
    }
  }

  if (mode === 'medium') {
    return {
      controlColumns: 2,
      controlsMayUseThirdRow: false,
      mode,
      tabColumns: 4,
    }
  }

  return {
    controlColumns: 1,
    controlsMayUseThirdRow: false,
    mode,
    tabColumns: 4,
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
  addDescriptor(descriptors, controls?.utilities?.htmlSource && {
    group: 'utilities',
    id: 'htmlSource',
    kind: 'checkbox',
    label: controls.utilities.htmlSource.label,
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
