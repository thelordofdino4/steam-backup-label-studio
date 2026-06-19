import {
  createDiscTextPreviewEditableElementFromAttributes,
  createExplicitPreviewEditableElement,
  DISC_TEXT_KEY_ATTRIBUTE,
  parseDiscTextPreviewEditableElementId,
  PREVIEW_EDITABLE_ID_ATTRIBUTE,
  type PreviewEditableElement,
} from './previewEditableRegistry.ts'

export {
  createDiscInlineTextTargetKey,
  createDiscTextPreviewEditableElement,
  createDiscTextPreviewEditableElementId,
  createInlinePreviewTextTargetAttributes,
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
  CURVED_DISC_TEXT_EXCEPTION,
  DISC_TEXT_KEY_ATTRIBUTE,
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
  parseDiscTextPreviewEditableElementId,
  PREVIEW_EDITABLE_DEFAULT_CAPABILITIES,
  PREVIEW_EDITABLE_ID_ATTRIBUTE,
  PREVIEW_EDITABLE_KIND_ATTRIBUTE,
  PREVIEW_EDITABLE_LABEL_ATTRIBUTE,
  PREVIEW_EDITABLE_TEXT_CAPABILITIES,
  type CaseInsertInlineTextTargetDescriptor,
  type PreviewEditableAttributes,
  type PreviewEditableElement,
  type PreviewEditableElementKind,
  type PreviewEditableSurface,
  type PreviewEditableTargetCapabilities,
} from './previewEditableRegistry.ts'

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

function getExplicitPreviewEditableElement(
  element: Element,
): PreviewEditableElement | null {
  return createExplicitPreviewEditableElement(element)
}

function getDiscTextPreviewEditableElement(
  element: Element,
): PreviewEditableElement | null {
  return createDiscTextPreviewEditableElementFromAttributes(element)
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

  const textKey = parseDiscTextPreviewEditableElementId(id)
  if (textKey) {

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
