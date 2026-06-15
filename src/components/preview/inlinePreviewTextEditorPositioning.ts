export type InlinePreviewTextRect = {
  bottom: number
  left: number
  right: number
  top: number
}

export type InlinePreviewTextSize = {
  height: number
  width: number
}

export type InlinePreviewTextEditorMenuPlacement = 'below' | 'above'

export type InlinePreviewTextAnchor = {
  bottom: number
  centerX: number
  centerY: number
  right: number
  top: number
}

export type InlinePreviewTextControlSizes = {
  menu: InlinePreviewTextSize
  moveHandle: InlinePreviewTextSize
  tabs: InlinePreviewTextSize
}

export type InlinePreviewTextControlLayout = {
  menu: {
    left: number
    maxWidth: number
    placement: InlinePreviewTextEditorMenuPlacement
    top: number
  }
  moveHandle: {
    left: number
    top: number
  }
  tabs: {
    left: number
    maxWidth: number
    top: number
  }
}

const INLINE_PREVIEW_TEXT_CONTROL_GAP = 8

function getRectWidth(rect: InlinePreviewTextRect) {
  return Math.max(0, rect.right - rect.left)
}

function getRectHeight(rect: InlinePreviewTextRect) {
  return Math.max(0, rect.bottom - rect.top)
}

function clampValue(value: number, min: number, max: number) {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

function clampLeftInsidePreview(
  desiredLeft: number,
  size: InlinePreviewTextSize,
  previewRect: InlinePreviewTextRect,
) {
  const previewWidth = getRectWidth(previewRect)

  if (size.width >= previewWidth) {
    return previewRect.left
  }

  return clampValue(
    desiredLeft,
    previewRect.left,
    previewRect.right - size.width,
  )
}

function clampTopInsidePreview(
  desiredTop: number,
  size: InlinePreviewTextSize,
  previewRect: InlinePreviewTextRect,
) {
  const previewHeight = getRectHeight(previewRect)

  if (size.height >= previewHeight) {
    return previewRect.top
  }

  return clampValue(
    desiredTop,
    previewRect.top,
    previewRect.bottom - size.height,
  )
}

function getMenuPlacement({
  anchor,
  requestedPlacement,
  menuSize,
  previewRect,
}: {
  anchor: InlinePreviewTextAnchor
  requestedPlacement: InlinePreviewTextEditorMenuPlacement
  menuSize: InlinePreviewTextSize
  previewRect: InlinePreviewTextRect
}) {
  const belowTop = anchor.bottom + INLINE_PREVIEW_TEXT_CONTROL_GAP
  const aboveTop = anchor.top - menuSize.height - INLINE_PREVIEW_TEXT_CONTROL_GAP

  if (
    requestedPlacement === 'below' &&
    belowTop + menuSize.height > previewRect.bottom &&
    aboveTop >= previewRect.top
  ) {
    return 'above'
  }

  if (
    requestedPlacement === 'above' &&
    aboveTop < previewRect.top &&
    belowTop + menuSize.height <= previewRect.bottom
  ) {
    return 'below'
  }

  return requestedPlacement
}

export function getInlinePreviewTextControlLayout({
  anchor,
  requestedMenuPlacement,
  previewRect,
  sizes,
}: {
  anchor: InlinePreviewTextAnchor
  requestedMenuPlacement: InlinePreviewTextEditorMenuPlacement
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
}): InlinePreviewTextControlLayout {
  const previewWidth = getRectWidth(previewRect)
  const tabsLeft = clampLeftInsidePreview(
    anchor.centerX - sizes.tabs.width / 2,
    sizes.tabs,
    previewRect,
  )
  const tabsTop = clampTopInsidePreview(
    anchor.top - sizes.tabs.height - INLINE_PREVIEW_TEXT_CONTROL_GAP,
    sizes.tabs,
    previewRect,
  )
  const menuPlacement = getMenuPlacement({
    anchor,
    requestedPlacement: requestedMenuPlacement,
    menuSize: sizes.menu,
    previewRect,
  })
  const requestedMenuTop =
    menuPlacement === 'below'
      ? anchor.bottom + INLINE_PREVIEW_TEXT_CONTROL_GAP
      : anchor.top - sizes.menu.height - INLINE_PREVIEW_TEXT_CONTROL_GAP
  const menuLeft = clampLeftInsidePreview(
    anchor.centerX - sizes.menu.width / 2,
    sizes.menu,
    previewRect,
  )
  const menuTop = clampTopInsidePreview(
    requestedMenuTop,
    sizes.menu,
    previewRect,
  )
  const moveHandleLeft = clampLeftInsidePreview(
    anchor.right + INLINE_PREVIEW_TEXT_CONTROL_GAP,
    sizes.moveHandle,
    previewRect,
  )
  const moveHandleTop = clampTopInsidePreview(
    anchor.centerY - sizes.moveHandle.height / 2,
    sizes.moveHandle,
    previewRect,
  )

  return {
    menu: {
      left: menuLeft,
      maxWidth: previewWidth,
      placement: menuPlacement,
      top: menuTop,
    },
    moveHandle: {
      left: moveHandleLeft,
      top: moveHandleTop,
    },
    tabs: {
      left: tabsLeft,
      maxWidth: previewWidth,
      top: tabsTop,
    },
  }
}
