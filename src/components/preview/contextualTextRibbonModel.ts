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

export const CONTEXTUAL_TEXT_RIBBON_WIDE_RESERVED_HEIGHT = 158
export const CONTEXTUAL_TEXT_RIBBON_COMPACT_RESERVED_HEIGHT = 158
export const CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT =
  CONTEXTUAL_TEXT_RIBBON_WIDE_RESERVED_HEIGHT
export const CONTEXTUAL_TEXT_RIBBON_TOAST_GAP = 10
export const CONTEXTUAL_TEXT_RIBBON_INACTIVE_TOAST_TOP = 18

export type ContextualTextRibbonWidthProfile = {
  fit?: 'content'
  grows?: boolean
  max: number
  min: number
  preferred: number
  rowSpan?: 1 | 2
}

export type ContextualTextRibbonColumnWidthInput = {
  availableWidth: number
  columns: ContextualTextRibbonWidthProfile[]
  gap?: number
}

export type ContextualTextRibbonPackItem<T = unknown> = {
  id: string
  payload: T
  profile: ContextualTextRibbonWidthProfile
}

export type ContextualTextRibbonPackedItem<T = unknown> =
  ContextualTextRibbonPackItem<T> & {
    rowStart: number
    rowSpan: 1 | 2
  }

export type ContextualTextRibbonPackedColumn<T = unknown> = {
  items: ContextualTextRibbonPackedItem<T>[]
  profile: ContextualTextRibbonWidthProfile
}

export const CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS: Record<
  string,
  ContextualTextRibbonWidthProfile
> = {
  'style': { min: 214, preferred: 230, max: 260, fit: 'content' },
  'layout-preset': { min: 214, preferred: 230, max: 260, fit: 'content' },
  'font': { min: 342, preferred: 360, max: 408, fit: 'content' },
  'paragraph': { min: 176, preferred: 214, max: 280, fit: 'content' },
  'text-color': { min: 108, preferred: 138, max: 160, grows: true },
  'contrast': { min: 108, preferred: 176, max: 220, grows: true },
  'background': {
    min: 180,
    preferred: 292,
    max: 360,
    grows: true,
    rowSpan: 2,
  },
  'border': {
    min: 186,
    preferred: 264,
    max: 328,
    grows: true,
    rowSpan: 2,
  },
  'source': { min: 420, preferred: 720, max: 960, grows: true },
  'position': {
    min: 230,
    preferred: 292,
    max: 360,
    grows: true,
    rowSpan: 2,
  },
  'layout': {
    min: 450,
    preferred: 568,
    max: 700,
    grows: true,
    rowSpan: 2,
  },
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

  void profile

  return finiteAvailable
}

export function getContextualTextRibbonColumnWidths({
  availableWidth,
  columns,
  gap = 0,
}: ContextualTextRibbonColumnWidthInput) {
  if (columns.length === 0) return []

  const finiteGap = Number.isFinite(gap) ? Math.max(0, gap) : 0
  const availableForColumns = Math.max(
    0,
    (Number.isFinite(availableWidth) ? availableWidth : 0)
      - finiteGap * Math.max(0, columns.length - 1),
  )
  const minTotal = columns.reduce((sum, column) => sum + column.min, 0)
  const preferredTotal = columns.reduce(
    (sum, column) => sum + column.preferred,
    0,
  )
  const maxTotal = columns.reduce((sum, column) => sum + column.max, 0)

  if (availableForColumns <= minTotal || preferredTotal <= minTotal) {
    return columns.map((column) => column.min)
  }

  if (availableForColumns <= preferredTotal || maxTotal <= preferredTotal) {
    const ratio = (availableForColumns - minTotal) /
      (preferredTotal - minTotal)

    return columns.map((column) =>
      column.min + (column.preferred - column.min) * ratio)
  }

  const ratio = Math.min(
    1,
    (availableForColumns - preferredTotal) / (maxTotal - preferredTotal),
  )

  return columns.map((column) =>
    column.preferred + (column.max - column.preferred) * ratio)
}

function maxRibbonWidthProfile(
  first: ContextualTextRibbonWidthProfile,
  second: ContextualTextRibbonWidthProfile,
): ContextualTextRibbonWidthProfile {
  return {
    grows: Boolean(first.grows || second.grows),
    max: Math.max(first.max, second.max),
    min: Math.max(first.min, second.min),
    preferred: Math.max(first.preferred, second.preferred),
  }
}

function getContextualTextRibbonPackRowSpan(
  profile: ContextualTextRibbonWidthProfile,
  rowCount: number,
): 1 | 2 {
  if (rowCount <= 1) return 1

  return profile.rowSpan === 2 ? 2 : 1
}

export function packContextualTextRibbonColumns<T>({
  items,
  rowCount,
}: {
  items: ContextualTextRibbonPackItem<T>[]
  rowCount: number
}): ContextualTextRibbonPackedColumn<T>[] {
  const normalizedRowCount = Math.max(1, Math.floor(rowCount))
  const remaining = items.slice()
  const columns: ContextualTextRibbonPackedColumn<T>[] = []

  while (remaining.length > 0) {
    let nextRowStart = 1
    let columnProfile: ContextualTextRibbonWidthProfile | null = null
    const columnItems: ContextualTextRibbonPackedItem<T>[] = []

    while (nextRowStart <= normalizedRowCount && remaining.length > 0) {
      const availableRows = normalizedRowCount - nextRowStart + 1
      const itemIndex = remaining.findIndex((item) =>
        getContextualTextRibbonPackRowSpan(
          item.profile,
          normalizedRowCount,
        ) <= availableRows)

      if (itemIndex < 0) break

      const [item] = remaining.splice(itemIndex, 1)
      const rowSpan = getContextualTextRibbonPackRowSpan(
        item.profile,
        normalizedRowCount,
      )
      const packedItem = {
        ...item,
        rowStart: nextRowStart,
        rowSpan,
      }

      columnItems.push(packedItem)
      columnProfile = columnProfile
        ? maxRibbonWidthProfile(columnProfile, item.profile)
        : item.profile
      nextRowStart += rowSpan
    }

    if (!columnProfile) {
      const [item] = remaining.splice(0, 1)
      const rowSpan = getContextualTextRibbonPackRowSpan(
        item.profile,
        normalizedRowCount,
      )

      columnItems.push({
        ...item,
        rowStart: 1,
        rowSpan,
      })
      columnProfile = item.profile
    }

    columns.push({
      items: columnItems,
      profile: columnProfile,
    })
  }

  return columns
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
      controlRows: 2,
      mode,
      reservedHeight,
      tabColumns: 5,
    }
  }

  if (mode === 'medium') {
    return {
      controlColumns: 2,
      controlsMayUseThirdRow: false,
      controlRows: 2,
      mode,
      reservedHeight,
      tabColumns: 5,
    }
  }

  return {
    controlColumns: 1,
    controlsMayUseThirdRow: false,
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
