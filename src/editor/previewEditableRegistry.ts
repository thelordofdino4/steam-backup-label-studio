export const PREVIEW_EDITABLE_ID_ATTRIBUTE = 'data-preview-editable-id'
export const PREVIEW_EDITABLE_LABEL_ATTRIBUTE = 'data-preview-editable-label'
export const PREVIEW_EDITABLE_KIND_ATTRIBUTE = 'data-preview-editable-kind'
export const DISC_TEXT_KEY_ATTRIBUTE = 'data-disc-text-key'
export const INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE =
  'data-inline-preview-text-target'

const DISC_TEXT_PREVIEW_ID_PREFIX = 'disc-text:'

export type PreviewEditableSurface = 'case' | 'disc'

export type PreviewEditableElementKind =
  | 'artwork'
  | 'background'
  | 'logo'
  | 'mark'
  | 'text'

export type PreviewEditableTargetCapabilities = {
  inlineTextEditable: boolean
  movable: boolean
  resizable: boolean
  selectable: boolean
}

export type PreviewEditableElement = {
  id: string
  label: string
  kind: PreviewEditableElementKind
  capabilities?: PreviewEditableTargetCapabilities
  surface?: PreviewEditableSurface | null
}

export type PreviewEditableAttributes = Record<string, string>

export type CaseInsertInlineTextTargetDescriptor =
  | {
      scope: 'templateTextBlock'
      paneId: string
      textBlockId: string
    }
  | {
      scope: 'templateTextList'
      paneId: string
      textListId: string
    }
  | {
      scope: 'spineTitle'
      side: string
    }
  | {
      scope: 'spineTextBlock'
      side: string
      textBlockId: string
    }

export const PREVIEW_EDITABLE_DEFAULT_CAPABILITIES = {
  inlineTextEditable: false,
  movable: true,
  resizable: false,
  selectable: true,
} satisfies PreviewEditableTargetCapabilities

export const PREVIEW_EDITABLE_TEXT_CAPABILITIES = {
  ...PREVIEW_EDITABLE_DEFAULT_CAPABILITIES,
  inlineTextEditable: true,
} satisfies PreviewEditableTargetCapabilities

export const CURVED_DISC_TEXT_EXCEPTION = {
  reason: 'Curved disc text remains SVG/textPath and does not use rectangular inline editing.',
  renderer: 'svgTextPath',
} as const

function formatDiscTextKeyLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

export function getPreviewEditableSurfaceFromId(
  id: string,
): PreviewEditableSurface | null {
  if (id.startsWith('disc:') || id.startsWith(DISC_TEXT_PREVIEW_ID_PREFIX)) {
    return 'disc'
  }

  if (id.startsWith('case:')) {
    return 'case'
  }

  return null
}

export function createPreviewEditableElementId(
  surface: PreviewEditableSurface,
  ...parts: Array<string | number | null | undefined>
) {
  return [surface, ...parts]
    .filter((part): part is string | number =>
      part !== null && part !== undefined && String(part).length > 0)
    .map((part) => String(part))
    .join(':')
}

export function createDiscTextPreviewEditableElementId(key: string) {
  return `${DISC_TEXT_PREVIEW_ID_PREFIX}${key}`
}

export function parseDiscTextPreviewEditableElementId(id: string) {
  return id.startsWith(DISC_TEXT_PREVIEW_ID_PREFIX)
    ? id.slice(DISC_TEXT_PREVIEW_ID_PREFIX.length)
    : null
}

export function createDiscInlineTextTargetKey(key: string) {
  return createPreviewEditableElementId('disc', key)
}

export function createCaseInsertInlineTextTargetKey(
  target: CaseInsertInlineTextTargetDescriptor,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return `${target.scope}:${target.paneId}:${target.textBlockId}`
    case 'templateTextList':
      return `${target.scope}:${target.paneId}:${target.textListId}`
    case 'spineTitle':
      return `${target.scope}:${target.side}`
    case 'spineTextBlock':
      return `${target.scope}:${target.side}:${target.textBlockId}`
  }
}

export function createPreviewEditableAttributes(
  editableElement: PreviewEditableElement,
): PreviewEditableAttributes {
  return {
    [PREVIEW_EDITABLE_ID_ATTRIBUTE]: editableElement.id,
    [PREVIEW_EDITABLE_LABEL_ATTRIBUTE]: editableElement.label,
    [PREVIEW_EDITABLE_KIND_ATTRIBUTE]: editableElement.kind,
  }
}

export function createInlinePreviewTextTargetAttributes(targetKey: string) {
  return {
    [INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE]: targetKey,
  } satisfies PreviewEditableAttributes
}

export function createDiscTextPreviewEditableElement(
  key: string,
): PreviewEditableElement {
  return {
    capabilities: PREVIEW_EDITABLE_TEXT_CAPABILITIES,
    id: createDiscTextPreviewEditableElementId(key),
    kind: 'text',
    label: `${formatDiscTextKeyLabel(key)} text`,
    surface: 'disc',
  }
}

export function createExplicitPreviewEditableElement(
  attributes: Pick<Element, 'getAttribute'>,
): PreviewEditableElement | null {
  const id = attributes.getAttribute(PREVIEW_EDITABLE_ID_ATTRIBUTE)

  if (!id) {
    return null
  }

  return {
    capabilities: PREVIEW_EDITABLE_DEFAULT_CAPABILITIES,
    id,
    kind: (
      attributes.getAttribute(PREVIEW_EDITABLE_KIND_ATTRIBUTE) ??
      'artwork'
    ) as PreviewEditableElementKind,
    label: attributes.getAttribute(PREVIEW_EDITABLE_LABEL_ATTRIBUTE) ??
      'Preview element',
    surface: getPreviewEditableSurfaceFromId(id),
  }
}

export function createDiscTextPreviewEditableElementFromAttributes(
  attributes: Pick<Element, 'getAttribute'>,
): PreviewEditableElement | null {
  const key = attributes.getAttribute(DISC_TEXT_KEY_ATTRIBUTE)

  return key ? createDiscTextPreviewEditableElement(key) : null
}
