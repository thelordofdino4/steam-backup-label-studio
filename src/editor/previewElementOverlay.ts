export const PREVIEW_EDITABLE_ID_ATTRIBUTE = 'data-preview-editable-id'
export const PREVIEW_EDITABLE_LABEL_ATTRIBUTE = 'data-preview-editable-label'
export const PREVIEW_EDITABLE_KIND_ATTRIBUTE = 'data-preview-editable-kind'
export const DISC_TEXT_KEY_ATTRIBUTE = 'data-disc-text-key'

const DISC_TEXT_PREVIEW_ID_PREFIX = 'disc-text:'

export type PreviewEditableElementKind =
  | 'artwork'
  | 'background'
  | 'logo'
  | 'mark'
  | 'text'

export type PreviewEditableElement = {
  id: string
  label: string
  kind: PreviewEditableElementKind
}

export type PreviewEditableAttributes = Record<string, string>

export type PreviewElementDomRect = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export type PreviewElementOverlayRect = {
  left: number
  top: number
  width: number
  height: number
}

export type PreviewEditableElementMatch = {
  element: Element
  editableElement: PreviewEditableElement
}

function formatDiscTextKeyLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

export function createPreviewEditableElementId(
  scope: string,
  ...parts: Array<string | number | null | undefined>
) {
  return [scope, ...parts]
    .filter((part): part is string | number =>
      part !== null && part !== undefined && String(part).length > 0)
    .map((part) => String(part))
    .join(':')
}

export function createDiscTextPreviewEditableElementId(key: string) {
  return `${DISC_TEXT_PREVIEW_ID_PREFIX}${key}`
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

function getExplicitPreviewEditableElement(
  element: Element,
): PreviewEditableElement | null {
  const id = element.getAttribute(PREVIEW_EDITABLE_ID_ATTRIBUTE)

  if (!id) {
    return null
  }

  return {
    id,
    label: element.getAttribute(PREVIEW_EDITABLE_LABEL_ATTRIBUTE) ??
      'Preview element',
    kind: (
      element.getAttribute(PREVIEW_EDITABLE_KIND_ATTRIBUTE) ??
      'artwork'
    ) as PreviewEditableElementKind,
  }
}

function getDiscTextPreviewEditableElement(
  element: Element,
): PreviewEditableElement | null {
  const key = element.getAttribute(DISC_TEXT_KEY_ATTRIBUTE)

  if (!key) {
    return null
  }

  return {
    id: createDiscTextPreviewEditableElementId(key),
    label: `${formatDiscTextKeyLabel(key)} text`,
    kind: 'text',
  }
}

export function getPreviewEditableElement(
  element: Element,
): PreviewEditableElement | null {
  return getExplicitPreviewEditableElement(element) ??
    getDiscTextPreviewEditableElement(element)
}

export function findClosestPreviewEditableElement(
  target: EventTarget | null,
): PreviewEditableElementMatch | null {
  if (!(target instanceof Element)) {
    return null
  }

  const explicitElement = target.closest(`[${PREVIEW_EDITABLE_ID_ATTRIBUTE}]`)
  if (explicitElement) {
    const editableElement = getExplicitPreviewEditableElement(explicitElement)

    return editableElement
      ? { element: explicitElement, editableElement }
      : null
  }

  const discTextElement = target.closest(`[${DISC_TEXT_KEY_ATTRIBUTE}]`)
  if (discTextElement) {
    const editableElement = getDiscTextPreviewEditableElement(discTextElement)

    return editableElement
      ? { element: discTextElement, editableElement }
      : null
  }

  return null
}

export function findPreviewEditableElementsById(
  root: ParentNode,
  id: string,
): Element[] {
  const explicitMatches = Array.from(
    root.querySelectorAll(`[${PREVIEW_EDITABLE_ID_ATTRIBUTE}]`),
  ).filter((element) =>
    element.getAttribute(PREVIEW_EDITABLE_ID_ATTRIBUTE) === id)

  if (explicitMatches.length > 0) {
    return explicitMatches
  }

  if (id.startsWith(DISC_TEXT_PREVIEW_ID_PREFIX)) {
    const textKey = id.slice(DISC_TEXT_PREVIEW_ID_PREFIX.length)

    return Array.from(root.querySelectorAll(`[${DISC_TEXT_KEY_ATTRIBUTE}]`))
      .filter((element) =>
        element.getAttribute(DISC_TEXT_KEY_ATTRIBUTE) === textKey)
  }

  return []
}

export function getPreviewElementOverlayRect(
  previewRect: PreviewElementDomRect,
  elementRect: PreviewElementDomRect,
): PreviewElementOverlayRect | null {
  if (elementRect.width <= 0 || elementRect.height <= 0) {
    return null
  }

  return {
    left: elementRect.left - previewRect.left,
    top: elementRect.top - previewRect.top,
    width: elementRect.width,
    height: elementRect.height,
  }
}

export function getPreviewElementOverlayUnionRect(
  previewRect: PreviewElementDomRect,
  elementRects: PreviewElementDomRect[],
): PreviewElementOverlayRect | null {
  const visibleRects = elementRects.filter((rect) =>
    rect.width > 0 && rect.height > 0)

  if (visibleRects.length === 0) {
    return null
  }

  const unionRect = visibleRects.reduce(
    (accumulator, rect) => ({
      left: Math.min(accumulator.left, rect.left),
      top: Math.min(accumulator.top, rect.top),
      right: Math.max(accumulator.right, rect.right),
      bottom: Math.max(accumulator.bottom, rect.bottom),
      width: 0,
      height: 0,
    }),
    visibleRects[0],
  )

  return getPreviewElementOverlayRect(previewRect, {
    ...unionRect,
    width: unionRect.right - unionRect.left,
    height: unionRect.bottom - unionRect.top,
  })
}
