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
    maxHeight: number
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

function getPreferredMenuPlacement({
  aboveAvailableHeight,
  belowAvailableHeight,
  menuHeight,
  requestedPlacement,
}: {
  aboveAvailableHeight: number
  belowAvailableHeight: number
  menuHeight: number
  requestedPlacement: InlinePreviewTextEditorMenuPlacement
}) {
  const hasRoomBelow = belowAvailableHeight >= menuHeight
  const hasRoomAbove = aboveAvailableHeight >= menuHeight

  if (requestedPlacement === 'below') {
    if (hasRoomBelow) return 'below'
    if (hasRoomAbove) return 'above'

    return belowAvailableHeight >= aboveAvailableHeight ? 'below' : 'above'
  }

  if (hasRoomAbove) {
    return 'above'
  }

  if (hasRoomBelow) {
    return 'below'
  }

  return aboveAvailableHeight >= belowAvailableHeight ? 'above' : 'below'
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
  const menuLeft = clampLeftInsidePreview(
    anchor.centerX - sizes.menu.width / 2,
    sizes.menu,
    previewRect,
  )
  const belowMenuTop = anchor.bottom + INLINE_PREVIEW_TEXT_CONTROL_GAP
  const belowAvailableHeight = Math.max(0, previewRect.bottom - belowMenuTop)
  const aboveAvailableHeight = Math.max(
    0,
    tabsTop - INLINE_PREVIEW_TEXT_CONTROL_GAP - previewRect.top,
  )
  const menuPlacement = getPreferredMenuPlacement({
    aboveAvailableHeight,
    belowAvailableHeight,
    menuHeight: sizes.menu.height,
    requestedPlacement: requestedMenuPlacement,
  })
  const menuMaxHeight = Math.max(
    1,
    menuPlacement === 'below'
      ? belowAvailableHeight
      : aboveAvailableHeight,
  )
  const menuLayoutHeight = Math.min(sizes.menu.height, menuMaxHeight)
  const requestedMenuTop =
    menuPlacement === 'below'
      ? belowMenuTop
      : tabsTop - INLINE_PREVIEW_TEXT_CONTROL_GAP - menuLayoutHeight
  const menuTop = clampTopInsidePreview(
    requestedMenuTop,
    { ...sizes.menu, height: menuLayoutHeight },
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
      maxHeight: menuMaxHeight,
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
