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

export type InlinePreviewTextEditorMenuPlacement =
  | 'above'
  | 'below'
  | 'center-docked'
  | 'detached'
  | 'left'
  | 'right'

export type InlinePreviewTextPlacementStrategy = 'default' | 'disc-center-dock'

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
  mode: 'anchored' | 'center-docked' | 'detached' | 'side-docked'
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

export type InlinePreviewTextObstacle = {
  id: string
  rect: InlinePreviewTextRect
}

const INLINE_PREVIEW_TEXT_CONTROL_GAP = 8
const INLINE_PREVIEW_TEXT_EDGE_GAP = 8
const INLINE_PREVIEW_TEXT_MIN_USABLE_MENU_HEIGHT = 118
const INLINE_PREVIEW_TEXT_EMERGENCY_TEXT_AREA_RATIO = 0.8
const INLINE_PREVIEW_TEXT_PLACEMENT_HYSTERESIS = 24
const INLINE_PREVIEW_TEXT_DISC_CENTER_DOCK_WIDTH_RATIO = 0.62
const INLINE_PREVIEW_TEXT_DISC_CENTER_DOCK_HEIGHT_RATIO = 0.56
const INLINE_PREVIEW_TEXT_DISC_CENTER_DOCK_MIN_WIDTH = 396
const INLINE_PREVIEW_TEXT_DISC_SIDE_DOCK_WIDTH_RATIO = 0.4

function getRectWidth(rect: InlinePreviewTextRect) {
  return Math.max(0, rect.right - rect.left)
}

function getRectHeight(rect: InlinePreviewTextRect) {
  return Math.max(0, rect.bottom - rect.top)
}

function getMinimumUsableMenuHeight(menuHeight: number) {
  return Math.min(menuHeight, INLINE_PREVIEW_TEXT_MIN_USABLE_MENU_HEIGHT)
}

function clampValue(value: number, min: number, max: number) {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

function clampLeftInsideBounds(
  desiredLeft: number,
  size: InlinePreviewTextSize,
  bounds: InlinePreviewTextRect,
) {
  const boundsWidth = getRectWidth(bounds)

  if (size.width >= boundsWidth) {
    return bounds.left
  }

  return clampValue(desiredLeft, bounds.left, bounds.right - size.width)
}

function clampTopInsideBounds(
  desiredTop: number,
  size: InlinePreviewTextSize,
  bounds: InlinePreviewTextRect,
) {
  const boundsHeight = getRectHeight(bounds)

  if (size.height >= boundsHeight) {
    return bounds.top
  }

  return clampValue(desiredTop, bounds.top, bounds.bottom - size.height)
}

function getRectArea(rect: InlinePreviewTextRect) {
  return getRectWidth(rect) * getRectHeight(rect)
}

function getOverlapArea(
  first: InlinePreviewTextRect,
  second: InlinePreviewTextRect,
) {
  const width = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left),
  )
  const height = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  )

  return width * height
}

function getOverflowArea(
  rect: InlinePreviewTextRect,
  bounds: InlinePreviewTextRect,
) {
  return Math.max(0, getRectArea(rect) - getOverlapArea(rect, bounds))
}

function rectFromPosition({
  height,
  left,
  top,
  width,
}: {
  height: number
  left: number
  top: number
  width: number
}): InlinePreviewTextRect {
  return {
    bottom: top + height,
    left,
    right: left + width,
    top,
  }
}

function getAnchorRect(anchor: InlinePreviewTextAnchor): InlinePreviewTextRect {
  const left = Math.min(anchor.right, anchor.centerX * 2 - anchor.right)

  return {
    bottom: anchor.bottom,
    left,
    right: Math.max(left, anchor.right),
    top: anchor.top,
  }
}

function isRectAccessible(
  rect: InlinePreviewTextRect,
  bounds: InlinePreviewTextRect,
  blockedRects: readonly InlinePreviewTextRect[],
) {
  return (
    getOverflowArea(rect, bounds) <= 1 &&
    blockedRects.every((blockedRect) => getOverlapArea(rect, blockedRect) <= 1)
  )
}

function getDiscCenterDockObstacles(
  obstacles: readonly InlinePreviewTextObstacle[],
) {
  return obstacles.filter((obstacle) => obstacle.id !== 'disc-center-hole')
}

function getAccessibleMoveHandlePosition({
  anchor,
  anchorRect,
  bounds,
  menuRect,
  preferredSide,
  sizes,
  tabsRect,
}: {
  anchor: InlinePreviewTextAnchor
  anchorRect: InlinePreviewTextRect
  bounds: InlinePreviewTextRect
  menuRect: InlinePreviewTextRect
  preferredSide: 'left' | 'right'
  sizes: InlinePreviewTextControlSizes
  tabsRect: InlinePreviewTextRect
}) {
  const nearMoveHandleLeft = preferredSide === 'left'
    ? clampLeftInsideBounds(
      anchorRect.left - INLINE_PREVIEW_TEXT_CONTROL_GAP - sizes.moveHandle.width,
      sizes.moveHandle,
      bounds,
    )
    : clampLeftInsideBounds(
      anchor.right + INLINE_PREVIEW_TEXT_CONTROL_GAP,
      sizes.moveHandle,
      bounds,
    )
  const nearMoveHandleTop = clampTopInsideBounds(
    anchor.centerY - sizes.moveHandle.height / 2,
    sizes.moveHandle,
    bounds,
  )
  const nearMoveHandleRect = rectFromPosition({
    height: sizes.moveHandle.height,
    left: nearMoveHandleLeft,
    top: nearMoveHandleTop,
    width: sizes.moveHandle.width,
  })

  if (
    isRectAccessible(
      nearMoveHandleRect,
      bounds,
      [menuRect, tabsRect],
    )
  ) {
    return {
      left: nearMoveHandleLeft,
      rect: nearMoveHandleRect,
      top: nearMoveHandleTop,
    }
  }

  const belowMenuLeft = clampLeftInsideBounds(
    menuRect.left + getRectWidth(menuRect) / 2 - sizes.moveHandle.width / 2,
    sizes.moveHandle,
    bounds,
  )
  const belowMenuTop = clampTopInsideBounds(
    menuRect.bottom + INLINE_PREVIEW_TEXT_CONTROL_GAP,
    sizes.moveHandle,
    bounds,
  )
  const belowMenuRect = rectFromPosition({
    height: sizes.moveHandle.height,
    left: belowMenuLeft,
    top: belowMenuTop,
    width: sizes.moveHandle.width,
  })

  if (
    isRectAccessible(
      belowMenuRect,
      bounds,
      [anchorRect, menuRect, tabsRect],
    )
  ) {
    return {
      left: belowMenuLeft,
      rect: belowMenuRect,
      top: belowMenuTop,
    }
  }

  const aboveTabsLeft = clampLeftInsideBounds(
    tabsRect.left + getRectWidth(tabsRect) / 2 - sizes.moveHandle.width / 2,
    sizes.moveHandle,
    bounds,
  )
  const aboveTabsTop = clampTopInsideBounds(
    tabsRect.top - INLINE_PREVIEW_TEXT_CONTROL_GAP - sizes.moveHandle.height,
    sizes.moveHandle,
    bounds,
  )
  const aboveTabsRect = rectFromPosition({
    height: sizes.moveHandle.height,
    left: aboveTabsLeft,
    top: aboveTabsTop,
    width: sizes.moveHandle.width,
  })

  return {
    left: aboveTabsLeft,
    rect: aboveTabsRect,
    top: aboveTabsTop,
  }
}

function getPreferredVerticalMenuPlacement({
  aboveAvailableHeight,
  belowAvailableHeight,
  menuHeight,
  requestedPlacement,
}: {
  aboveAvailableHeight: number
  belowAvailableHeight: number
  menuHeight: number
  requestedPlacement: InlinePreviewTextEditorMenuPlacement
}): 'above' | 'below' {
  const hasRoomBelow = belowAvailableHeight >= menuHeight
  const hasRoomAbove = aboveAvailableHeight >= menuHeight

  if (requestedPlacement === 'below') {
    if (hasRoomBelow) return 'below'
    if (hasRoomAbove) return 'above'

    return belowAvailableHeight >= aboveAvailableHeight ? 'below' : 'above'
  }

  if (requestedPlacement === 'above') {
    if (hasRoomAbove) return 'above'
    if (hasRoomBelow) return 'below'

    return aboveAvailableHeight >= belowAvailableHeight ? 'above' : 'below'
  }

  return belowAvailableHeight >= aboveAvailableHeight ? 'below' : 'above'
}

type InlinePreviewTextCandidateLayout = InlinePreviewTextControlLayout & {
  candidate: InlinePreviewTextEditorMenuPlacement
  fullHeightFits: boolean
  menuOverflow: number
  menuRect: InlinePreviewTextRect
  menuTextOverlap: number
  minimumUsableMenuHeight: number
  moveHandleRect: InlinePreviewTextRect
  obstacleOverlap: number
  previewOverflow: number
  score: number
  tabsRect: InlinePreviewTextRect
  textOverlap: number
  usable: boolean
}

export type InlinePreviewTextPlacementCandidateDiagnostic = {
  candidate: InlinePreviewTextEditorMenuPlacement
  fullHeightFits: boolean
  menuMaxHeight: number
  menuOverflow: number
  menuTextOverlap: number
  obstacleOverlap: number
  previewOverflow: number
  score: number
  textOverlap: number
  usable: boolean
}

export type InlinePreviewTextPlacementDiagnostics = {
  anchorRect: InlinePreviewTextRect
  candidates: InlinePreviewTextPlacementCandidateDiagnostic[]
  emergencyEligible: boolean
  selectedPlacement: InlinePreviewTextEditorMenuPlacement
  selectedTextAreaRatio: number
}

function scoreCandidate({
  anchorRect,
  candidate,
  menuRect,
  moveHandleRect,
  obstacles,
  previewRect,
  tabsRect,
}: {
  anchorRect: InlinePreviewTextRect
  candidate: InlinePreviewTextEditorMenuPlacement
  menuRect: InlinePreviewTextRect
  moveHandleRect: InlinePreviewTextRect
  obstacles: readonly InlinePreviewTextObstacle[]
  previewRect: InlinePreviewTextRect
  tabsRect: InlinePreviewTextRect
}) {
  const controlRects = [tabsRect, menuRect, moveHandleRect]
  const previewOverflow = controlRects.reduce(
    (total, rect) => total + getOverflowArea(rect, previewRect),
    0,
  )
  const textOverlap = controlRects.reduce(
    (total, rect) => total + getOverlapArea(rect, anchorRect),
    0,
  )
  const primaryTextOverlap = [tabsRect, menuRect].reduce(
    (total, rect) => total + getOverlapArea(rect, anchorRect),
    0,
  )
  const menuTextOverlap = getOverlapArea(menuRect, anchorRect)
  const obstacleOverlap = obstacles.reduce((total, obstacle) =>
    total + controlRects.reduce(
      (controlTotal, rect) => controlTotal + getOverlapArea(rect, obstacle.rect),
      0,
    ),
  0)
  const menuOverflow = getOverflowArea(menuRect, previewRect)

  return {
    menuOverflow,
    menuTextOverlap,
    obstacleOverlap,
    primaryTextOverlap,
    previewOverflow,
    score:
      previewOverflow * 100 +
      textOverlap * 18 +
      obstacleOverlap * 10 +
      (candidate === 'below' ? 0 : 4),
    textOverlap,
  }
}

function createAnchoredVerticalCandidate({
  anchor,
  anchorRect,
  candidate,
  obstacles,
  previewRect,
  sizes,
}: {
  anchor: InlinePreviewTextAnchor
  anchorRect: InlinePreviewTextRect
  candidate: 'above' | 'below'
  obstacles: readonly InlinePreviewTextObstacle[]
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
}): InlinePreviewTextCandidateLayout {
  const previewWidth = getRectWidth(previewRect)
  const tabsLeft = clampLeftInsideBounds(
    anchor.centerX - sizes.tabs.width / 2,
    sizes.tabs,
    previewRect,
  )
  const tabsTop = clampTopInsideBounds(
    anchor.top - sizes.tabs.height - INLINE_PREVIEW_TEXT_CONTROL_GAP,
    sizes.tabs,
    previewRect,
  )
  const menuLeft = clampLeftInsideBounds(
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
  const menuMaxHeight = Math.max(
    1,
    candidate === 'below' ? belowAvailableHeight : aboveAvailableHeight,
  )
  const menuLayoutHeight = Math.min(sizes.menu.height, menuMaxHeight)
  const requestedMenuTop =
    candidate === 'below'
      ? belowMenuTop
      : tabsTop - INLINE_PREVIEW_TEXT_CONTROL_GAP - menuLayoutHeight
  const menuTop = clampTopInsideBounds(
    requestedMenuTop,
    { ...sizes.menu, height: menuLayoutHeight },
    previewRect,
  )
  const tabsRect = rectFromPosition({
    height: sizes.tabs.height,
    left: tabsLeft,
    top: tabsTop,
    width: sizes.tabs.width,
  })
  const menuRect = rectFromPosition({
    height: menuLayoutHeight,
    left: menuLeft,
    top: menuTop,
    width: sizes.menu.width,
  })
  const moveHandle = getAccessibleMoveHandlePosition({
    anchor,
    anchorRect,
    bounds: previewRect,
    menuRect,
    preferredSide: 'right',
    sizes,
    tabsRect,
  })
  const scored = scoreCandidate({
    anchorRect,
    candidate,
    menuRect,
    moveHandleRect: moveHandle.rect,
    obstacles,
    previewRect,
    tabsRect,
  })
  const minimumUsableMenuHeight = getMinimumUsableMenuHeight(sizes.menu.height)

  return {
    candidate,
    fullHeightFits: menuMaxHeight >= sizes.menu.height,
    menu: {
      left: menuLeft,
      maxHeight: menuMaxHeight,
      maxWidth: previewWidth,
      placement: candidate,
      top: menuTop,
    },
    menuOverflow: scored.menuOverflow,
    menuRect,
    menuTextOverlap: scored.menuTextOverlap,
    minimumUsableMenuHeight,
    mode: 'anchored',
    moveHandle: {
      left: moveHandle.left,
      top: moveHandle.top,
    },
    moveHandleRect: moveHandle.rect,
    obstacleOverlap: scored.obstacleOverlap,
    previewOverflow: scored.previewOverflow,
    score: scored.score,
    tabs: {
      left: tabsLeft,
      maxWidth: previewWidth,
      top: tabsTop,
    },
    tabsRect,
    textOverlap: scored.textOverlap,
    usable:
      menuMaxHeight >= minimumUsableMenuHeight &&
      scored.previewOverflow <= 1 &&
      scored.menuOverflow <= 1 &&
      scored.menuTextOverlap <= 1,
  }
}

function createAnchoredSideCandidate({
  anchor,
  anchorRect,
  candidate,
  obstacles,
  previewRect,
  sizes,
}: {
  anchor: InlinePreviewTextAnchor
  anchorRect: InlinePreviewTextRect
  candidate: 'left' | 'right'
  obstacles: readonly InlinePreviewTextObstacle[]
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
}): InlinePreviewTextCandidateLayout {
  const previewWidth = getRectWidth(previewRect)
  const stackWidth = Math.max(sizes.tabs.width, sizes.menu.width)
  const maxMenuHeight = Math.max(
    1,
    getRectHeight(previewRect) -
      INLINE_PREVIEW_TEXT_EDGE_GAP * 2 -
      sizes.tabs.height -
      INLINE_PREVIEW_TEXT_CONTROL_GAP,
  )
  const menuLayoutHeight = Math.min(sizes.menu.height, maxMenuHeight)
  const stackHeight =
    sizes.tabs.height + INLINE_PREVIEW_TEXT_CONTROL_GAP + menuLayoutHeight
  const desiredStackLeft =
    candidate === 'left'
      ? anchorRect.left - INLINE_PREVIEW_TEXT_CONTROL_GAP - stackWidth
      : anchor.right + INLINE_PREVIEW_TEXT_CONTROL_GAP
  const stackLeft = clampValue(
    desiredStackLeft,
    previewRect.left,
    Math.max(previewRect.left, previewRect.right - stackWidth),
  )
  const stackTop = clampValue(
    anchor.centerY - stackHeight / 2,
    previewRect.top,
    Math.max(previewRect.top, previewRect.bottom - stackHeight),
  )
  const tabsLeft = stackLeft + Math.max(0, (stackWidth - sizes.tabs.width) / 2)
  const menuLeft = stackLeft + Math.max(0, (stackWidth - sizes.menu.width) / 2)
  const tabsRect = rectFromPosition({
    height: sizes.tabs.height,
    left: tabsLeft,
    top: stackTop,
    width: sizes.tabs.width,
  })
  const menuRect = rectFromPosition({
    height: menuLayoutHeight,
    left: menuLeft,
    top: stackTop + sizes.tabs.height + INLINE_PREVIEW_TEXT_CONTROL_GAP,
    width: sizes.menu.width,
  })
  const moveHandle = getAccessibleMoveHandlePosition({
    anchor,
    anchorRect,
    bounds: previewRect,
    menuRect,
    preferredSide: candidate,
    sizes,
    tabsRect,
  })
  const scored = scoreCandidate({
    anchorRect,
    candidate,
    menuRect,
    moveHandleRect: moveHandle.rect,
    obstacles,
    previewRect,
    tabsRect,
  })
  const minimumUsableMenuHeight = getMinimumUsableMenuHeight(sizes.menu.height)

  return {
    candidate,
    fullHeightFits: maxMenuHeight >= sizes.menu.height,
    menu: {
      left: menuLeft,
      maxHeight: maxMenuHeight,
      maxWidth: previewWidth,
      placement: candidate,
      top: menuRect.top,
    },
    menuOverflow: scored.menuOverflow,
    menuRect,
    menuTextOverlap: scored.menuTextOverlap,
    minimumUsableMenuHeight,
    mode: 'anchored',
    moveHandle: {
      left: moveHandle.left,
      top: moveHandle.top,
    },
    moveHandleRect: moveHandle.rect,
    obstacleOverlap: scored.obstacleOverlap,
    previewOverflow: scored.previewOverflow,
    score: scored.score,
    tabs: {
      left: tabsLeft,
      maxWidth: previewWidth,
      top: tabsRect.top,
    },
    tabsRect,
    textOverlap: scored.textOverlap,
    usable:
      maxMenuHeight >= minimumUsableMenuHeight &&
      scored.previewOverflow <= 1 &&
      scored.menuOverflow <= 1 &&
      scored.menuTextOverlap <= 1,
  }
}

function createDiscCenterDockCandidate({
  anchorRect,
  obstacles,
  previewRect,
  sizes,
}: {
  anchorRect: InlinePreviewTextRect
  obstacles: readonly InlinePreviewTextObstacle[]
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
}): InlinePreviewTextCandidateLayout {
  const previewWidth = getRectWidth(previewRect)
  const previewHeight = getRectHeight(previewRect)
  const availableWidth = Math.max(
    1,
    previewWidth - INLINE_PREVIEW_TEXT_EDGE_GAP * 2,
  )
  const availableHeight = Math.max(
    1,
    previewHeight - INLINE_PREVIEW_TEXT_EDGE_GAP * 2,
  )
  const dockWidth = clampValue(
    Math.min(
      Math.max(sizes.menu.width, sizes.tabs.width),
      previewWidth * INLINE_PREVIEW_TEXT_DISC_CENTER_DOCK_WIDTH_RATIO,
    ),
    Math.min(availableWidth, INLINE_PREVIEW_TEXT_DISC_CENTER_DOCK_MIN_WIDTH),
    availableWidth,
  )
  const dockHeight = clampValue(
    previewHeight * INLINE_PREVIEW_TEXT_DISC_CENTER_DOCK_HEIGHT_RATIO,
    Math.min(availableHeight, 190),
    availableHeight,
  )
  const dockLeft = previewRect.left + previewWidth / 2 - dockWidth / 2
  const dockTop = previewRect.top + previewHeight / 2 - dockHeight / 2
  const tabsWidth = Math.min(sizes.tabs.width, dockWidth)
  const menuWidth = Math.min(sizes.menu.width, dockWidth)
  const menuMaxHeight = Math.max(
    1,
    dockHeight -
      sizes.tabs.height -
      sizes.moveHandle.height -
      INLINE_PREVIEW_TEXT_CONTROL_GAP * 2,
  )
  const menuLayoutHeight = Math.min(sizes.menu.height, menuMaxHeight)
  const tabsLeft = dockLeft + (dockWidth - tabsWidth) / 2
  const tabsTop = dockTop
  const menuLeft = dockLeft + (dockWidth - menuWidth) / 2
  const menuTop = tabsTop + sizes.tabs.height + INLINE_PREVIEW_TEXT_CONTROL_GAP
  const moveHandleLeft = clampLeftInsideBounds(
    dockLeft + dockWidth / 2 - sizes.moveHandle.width / 2,
    sizes.moveHandle,
    previewRect,
  )
  const moveHandleTop =
    dockTop + dockHeight - sizes.moveHandle.height
  const tabsRect = rectFromPosition({
    height: sizes.tabs.height,
    left: tabsLeft,
    top: tabsTop,
    width: tabsWidth,
  })
  const menuRect = rectFromPosition({
    height: menuLayoutHeight,
    left: menuLeft,
    top: menuTop,
    width: menuWidth,
  })
  const moveHandleRect = rectFromPosition({
    height: sizes.moveHandle.height,
    left: moveHandleLeft,
    top: moveHandleTop,
    width: sizes.moveHandle.width,
  })
  const scored = scoreCandidate({
    anchorRect,
    candidate: 'center-docked',
    menuRect,
    moveHandleRect,
    obstacles: getDiscCenterDockObstacles(obstacles),
    previewRect,
    tabsRect,
  })
  const minimumUsableMenuHeight = getMinimumUsableMenuHeight(sizes.menu.height)

  return {
    candidate: 'center-docked',
    fullHeightFits: menuMaxHeight >= sizes.menu.height,
    menu: {
      left: menuLeft,
      maxHeight: menuMaxHeight,
      maxWidth: dockWidth,
      placement: 'center-docked',
      top: menuTop,
    },
    menuOverflow: scored.menuOverflow,
    menuRect,
    menuTextOverlap: scored.menuTextOverlap,
    minimumUsableMenuHeight,
    mode: 'center-docked',
    moveHandle: {
      left: moveHandleLeft,
      top: moveHandleTop,
    },
    moveHandleRect,
    obstacleOverlap: scored.obstacleOverlap,
    previewOverflow: scored.previewOverflow,
    score: scored.score,
    tabs: {
      left: tabsLeft,
      maxWidth: dockWidth,
      top: tabsTop,
    },
    tabsRect,
    textOverlap: scored.textOverlap,
    usable:
      menuMaxHeight >= minimumUsableMenuHeight &&
      scored.previewOverflow <= 1 &&
      scored.menuOverflow <= 1 &&
      scored.textOverlap <= 1 &&
      scored.obstacleOverlap <= 1,
  }
}

function createDiscSideDockCandidate({
  anchorRect,
  candidate,
  obstacles,
  previewRect,
  sizes,
}: {
  anchorRect: InlinePreviewTextRect
  candidate: 'left' | 'right'
  obstacles: readonly InlinePreviewTextObstacle[]
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
}): InlinePreviewTextCandidateLayout {
  const previewWidth = getRectWidth(previewRect)
  const previewHeight = getRectHeight(previewRect)
  const availableWidth = Math.max(
    1,
    previewWidth - INLINE_PREVIEW_TEXT_EDGE_GAP * 2,
  )
  const availableHeight = Math.max(
    1,
    previewHeight - INLINE_PREVIEW_TEXT_EDGE_GAP * 2,
  )
  const dockWidth = clampValue(
    Math.min(
      Math.max(sizes.menu.width, sizes.tabs.width),
      previewWidth * INLINE_PREVIEW_TEXT_DISC_SIDE_DOCK_WIDTH_RATIO,
    ),
    Math.min(availableWidth, 240),
    availableWidth,
  )
  const dockHeight = clampValue(
    previewHeight * INLINE_PREVIEW_TEXT_DISC_CENTER_DOCK_HEIGHT_RATIO,
    Math.min(availableHeight, 190),
    availableHeight,
  )
  const dockLeft = candidate === 'left'
    ? previewRect.left + INLINE_PREVIEW_TEXT_EDGE_GAP
    : previewRect.right - INLINE_PREVIEW_TEXT_EDGE_GAP - dockWidth
  const anchorCenterY = anchorRect.top + getRectHeight(anchorRect) / 2
  const previewCenterY = previewRect.top + previewHeight / 2
  const dockTop = anchorCenterY >= previewCenterY
    ? previewRect.top + INLINE_PREVIEW_TEXT_EDGE_GAP
    : previewRect.bottom - INLINE_PREVIEW_TEXT_EDGE_GAP - dockHeight
  const tabsWidth = Math.min(sizes.tabs.width, dockWidth)
  const menuWidth = Math.min(sizes.menu.width, dockWidth)
  const menuMaxHeight = Math.max(
    1,
    dockHeight -
      sizes.tabs.height -
      sizes.moveHandle.height -
      INLINE_PREVIEW_TEXT_CONTROL_GAP * 2,
  )
  const menuLayoutHeight = Math.min(sizes.menu.height, menuMaxHeight)
  const tabsLeft = dockLeft + (dockWidth - tabsWidth) / 2
  const tabsTop = dockTop
  const menuLeft = dockLeft + (dockWidth - menuWidth) / 2
  const menuTop = tabsTop + sizes.tabs.height + INLINE_PREVIEW_TEXT_CONTROL_GAP
  const moveHandleLeft = clampLeftInsideBounds(
    dockLeft + dockWidth / 2 - sizes.moveHandle.width / 2,
    sizes.moveHandle,
    previewRect,
  )
  const moveHandleTop =
    dockTop + dockHeight - sizes.moveHandle.height
  const tabsRect = rectFromPosition({
    height: sizes.tabs.height,
    left: tabsLeft,
    top: tabsTop,
    width: tabsWidth,
  })
  const menuRect = rectFromPosition({
    height: menuLayoutHeight,
    left: menuLeft,
    top: menuTop,
    width: menuWidth,
  })
  const moveHandleRect = rectFromPosition({
    height: sizes.moveHandle.height,
    left: moveHandleLeft,
    top: moveHandleTop,
    width: sizes.moveHandle.width,
  })
  const scored = scoreCandidate({
    anchorRect,
    candidate,
    menuRect,
    moveHandleRect,
    obstacles: getDiscCenterDockObstacles(obstacles),
    previewRect,
    tabsRect,
  })
  const minimumUsableMenuHeight = getMinimumUsableMenuHeight(sizes.menu.height)

  return {
    candidate,
    fullHeightFits: menuMaxHeight >= sizes.menu.height,
    menu: {
      left: menuLeft,
      maxHeight: menuMaxHeight,
      maxWidth: dockWidth,
      placement: candidate,
      top: menuTop,
    },
    menuOverflow: scored.menuOverflow,
    menuRect,
    menuTextOverlap: scored.menuTextOverlap,
    minimumUsableMenuHeight,
    mode: 'side-docked',
    moveHandle: {
      left: moveHandleLeft,
      top: moveHandleTop,
    },
    moveHandleRect,
    obstacleOverlap: scored.obstacleOverlap,
    previewOverflow: scored.previewOverflow,
    score: scored.score,
    tabs: {
      left: tabsLeft,
      maxWidth: dockWidth,
      top: tabsTop,
    },
    tabsRect,
    textOverlap: scored.textOverlap,
    usable:
      menuMaxHeight >= minimumUsableMenuHeight &&
      scored.previewOverflow <= 1 &&
      scored.menuOverflow <= 1 &&
      scored.textOverlap <= 1 &&
      scored.obstacleOverlap <= 1,
  }
}

function chooseDiscDockCandidate({
  anchorRect,
  centerDockCandidate,
  previousPlacement,
  previewRect,
  sideDockCandidates,
}: {
  anchorRect: InlinePreviewTextRect
  centerDockCandidate: InlinePreviewTextCandidateLayout
  previousPlacement?: InlinePreviewTextEditorMenuPlacement
  previewRect: InlinePreviewTextRect
  sideDockCandidates: readonly InlinePreviewTextCandidateLayout[]
}) {
  if (centerDockCandidate.usable) return centerDockCandidate

  const previousDock = sideDockCandidates.find((candidate) =>
    candidate.candidate === previousPlacement)

  if (previousDock?.usable) return previousDock

  const previewCenterX = previewRect.left + getRectWidth(previewRect) / 2
  const preferredSide = anchorRect.left + getRectWidth(anchorRect) / 2 >=
      previewCenterX
    ? 'left'
    : 'right'
  const preferredCandidate = sideDockCandidates.find((candidate) =>
    candidate.candidate === preferredSide)
  const alternateCandidate = sideDockCandidates.find((candidate) =>
    candidate.candidate !== preferredSide)

  if (preferredCandidate?.usable) return preferredCandidate
  if (alternateCandidate?.usable) return alternateCandidate

  const scoredCandidates = [centerDockCandidate, ...sideDockCandidates]
    .sort((first, second) => first.score - second.score)

  return scoredCandidates[0] ?? centerDockCandidate
}

function chooseAnchoredCandidate({
  candidates,
  previousPlacement,
}: {
  candidates: readonly InlinePreviewTextCandidateLayout[]
  previousPlacement?: InlinePreviewTextEditorMenuPlacement
}) {
  const usableCandidates = candidates.filter((candidate) => candidate.usable)
  const fullHeightCandidates = usableCandidates.filter((candidate) =>
    candidate.fullHeightFits)
  const candidatesToScore =
    fullHeightCandidates.length > 0
      ? fullHeightCandidates
      : usableCandidates.length > 0
        ? usableCandidates
        : candidates
  const sortedCandidates = [...candidatesToScore].sort((first, second) =>
    first.score - second.score)
  const best = sortedCandidates[0]
  const previous = previousPlacement
    ? sortedCandidates.find((candidate) =>
      candidate.candidate === previousPlacement && candidate.usable)
    : undefined

  if (
    best &&
    previous &&
    previous.score <= best.score + INLINE_PREVIEW_TEXT_PLACEMENT_HYSTERESIS
  ) {
    return previous
  }

  return best
}

function chooseUnobstructedAnchoredCandidate({
  alternateVerticalCandidate,
  preferredVerticalCandidate,
}: {
  alternateVerticalCandidate: InlinePreviewTextCandidateLayout
  preferredVerticalCandidate: InlinePreviewTextCandidateLayout
}) {
  if (
    preferredVerticalCandidate.usable &&
    preferredVerticalCandidate.fullHeightFits
  ) {
    return preferredVerticalCandidate
  }

  if (
    alternateVerticalCandidate.usable &&
    alternateVerticalCandidate.fullHeightFits
  ) {
    return alternateVerticalCandidate
  }

  if (preferredVerticalCandidate.usable) {
    return preferredVerticalCandidate
  }

  if (alternateVerticalCandidate.usable) {
    return alternateVerticalCandidate
  }

  return preferredVerticalCandidate
}

function shouldUseEmergencyPlacement({
  anchorRect,
  anchoredCandidate,
  candidates,
  dockCandidate,
  previewRect,
  workspaceRect,
}: {
  anchorRect: InlinePreviewTextRect
  anchoredCandidate: InlinePreviewTextCandidateLayout
  candidates: readonly InlinePreviewTextCandidateLayout[]
  dockCandidate?: InlinePreviewTextCandidateLayout
  previewRect: InlinePreviewTextRect
  workspaceRect: InlinePreviewTextRect
}) {
  const previewArea = getRectArea(previewRect)
  const workspaceArea = getRectArea(workspaceRect)
  const selectedTextAreaRatio =
    previewArea > 0 ? getRectArea(anchorRect) / previewArea : 0
  const hasUsableCandidate = candidates.some((candidate) => candidate.usable)
  const hasUsableDock = Boolean(dockCandidate?.usable)
  const fallbackCandidate = dockCandidate ?? anchoredCandidate
  const hasMeaningfulDetachedWorkspace =
    workspaceArea > previewArea * 1.05 || workspaceArea > 0
  const hasLargeSelectedText =
    selectedTextAreaRatio >= INLINE_PREVIEW_TEXT_EMERGENCY_TEXT_AREA_RATIO

  return (
    hasMeaningfulDetachedWorkspace &&
    !hasUsableDock &&
    !hasUsableCandidate &&
    (
      hasLargeSelectedText ||
      fallbackCandidate.menu.maxHeight <
        fallbackCandidate.minimumUsableMenuHeight ||
      fallbackCandidate.previewOverflow > 1 ||
      fallbackCandidate.textOverlap > 1 ||
      fallbackCandidate.obstacleOverlap > 1
    )
  )
}

function createEmergencyLayout({
  anchor,
  obstacles,
  previewRect,
  sizes,
  workspaceRect,
}: {
  anchor: InlinePreviewTextAnchor
  obstacles: readonly InlinePreviewTextObstacle[]
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
  workspaceRect: InlinePreviewTextRect
}): InlinePreviewTextControlLayout {
  const workspaceWidth = getRectWidth(workspaceRect)
  const anchorRect = getAnchorRect(anchor)
  const tabsInsideTop = previewRect.top + INLINE_PREVIEW_TEXT_EDGE_GAP
  const tabsLeft = clampLeftInsideBounds(
    previewRect.left + getRectWidth(previewRect) / 2 - sizes.tabs.width / 2,
    sizes.tabs,
    workspaceRect,
  )
  const tabsInsideRect = rectFromPosition({
    height: sizes.tabs.height,
    left: tabsLeft,
    top: tabsInsideTop,
    width: sizes.tabs.width,
  })
  const shouldPlaceTabsAbovePreview =
    getOverlapArea(tabsInsideRect, anchorRect) > 1 &&
    previewRect.top - workspaceRect.top >=
      sizes.tabs.height + INLINE_PREVIEW_TEXT_CONTROL_GAP
  const tabsTop = shouldPlaceTabsAbovePreview
    ? Math.max(
      workspaceRect.top,
      previewRect.top - INLINE_PREVIEW_TEXT_CONTROL_GAP - sizes.tabs.height,
    )
    : tabsInsideTop
  const belowPreviewAvailableHeight = Math.max(
    0,
    workspaceRect.bottom - previewRect.bottom - INLINE_PREVIEW_TEXT_CONTROL_GAP,
  )
  const insideBottomAvailableHeight = Math.max(
    0,
    previewRect.bottom - workspaceRect.top - INLINE_PREVIEW_TEXT_EDGE_GAP,
  )
  const workspaceHeight = Math.max(1, getRectHeight(workspaceRect))
  const minimumUsableMenuHeight = getMinimumUsableMenuHeight(sizes.menu.height)
  const menuMaxHeight = Math.max(
    Math.min(minimumUsableMenuHeight, workspaceHeight),
    belowPreviewAvailableHeight >= INLINE_PREVIEW_TEXT_MIN_USABLE_MENU_HEIGHT
      ? Math.min(sizes.menu.height, belowPreviewAvailableHeight)
      : Math.min(sizes.menu.height, insideBottomAvailableHeight),
  )
  const menuLayoutHeight = Math.min(sizes.menu.height, menuMaxHeight)
  let menuTop =
    belowPreviewAvailableHeight >= INLINE_PREVIEW_TEXT_MIN_USABLE_MENU_HEIGHT
      ? previewRect.bottom + INLINE_PREVIEW_TEXT_CONTROL_GAP
      : Math.max(
        workspaceRect.top,
        previewRect.bottom - menuLayoutHeight - INLINE_PREVIEW_TEXT_EDGE_GAP,
      )
  let menuLeft = clampLeftInsideBounds(
    previewRect.left + getRectWidth(previewRect) / 2 - sizes.menu.width / 2,
    sizes.menu,
    workspaceRect,
  )
  const getMenuRect = () => rectFromPosition({
    height: menuLayoutHeight,
    left: menuLeft,
    top: menuTop,
    width: sizes.menu.width,
  })

  for (const obstacle of obstacles) {
    if (getOverlapArea(getMenuRect(), obstacle.rect) <= 0) continue

    const aboveObstacleTop =
      obstacle.rect.top - INLINE_PREVIEW_TEXT_CONTROL_GAP - menuLayoutHeight
    if (aboveObstacleTop >= workspaceRect.top) {
      menuTop = aboveObstacleTop
    }
  }

  menuTop = clampValue(
    menuTop,
    workspaceRect.top,
    Math.max(workspaceRect.top, workspaceRect.bottom - menuLayoutHeight),
  )
  menuLeft = clampLeftInsideBounds(menuLeft, sizes.menu, workspaceRect)

  const nearMoveHandleLeft = clampLeftInsideBounds(
    anchor.right + INLINE_PREVIEW_TEXT_CONTROL_GAP,
    sizes.moveHandle,
    previewRect,
  )
  const nearMoveHandleTop = clampTopInsideBounds(
    anchor.centerY - sizes.moveHandle.height / 2,
    sizes.moveHandle,
    previewRect,
  )
  const nearMoveHandleRect = rectFromPosition({
    height: sizes.moveHandle.height,
    left: nearMoveHandleLeft,
    top: nearMoveHandleTop,
    width: sizes.moveHandle.width,
  })
  const nearHandleAccessible =
    getOverlapArea(nearMoveHandleRect, anchorRect) <= 1 &&
    getOverflowArea(nearMoveHandleRect, previewRect) <= 1
  const moveHandleLeft = nearHandleAccessible
    ? nearMoveHandleLeft
    : clampLeftInsideBounds(
      tabsLeft + sizes.tabs.width + INLINE_PREVIEW_TEXT_CONTROL_GAP,
      sizes.moveHandle,
      workspaceRect,
    )
  const moveHandleTop = nearHandleAccessible
    ? nearMoveHandleTop
    : tabsTop + Math.max(0, (sizes.tabs.height - sizes.moveHandle.height) / 2)

  return {
    menu: {
      left: menuLeft,
      maxHeight: menuMaxHeight,
      maxWidth: workspaceWidth,
      placement: 'detached',
      top: menuTop,
    },
    mode: 'detached',
    moveHandle: {
      left: moveHandleLeft,
      top: moveHandleTop,
    },
    tabs: {
      left: tabsLeft,
      maxWidth: workspaceWidth,
      top: tabsTop,
    },
  }
}

function getInlinePreviewTextControlPlacementModel({
  anchor,
  obstacles = [],
  placementStrategy = 'default',
  previousPlacement,
  requestedMenuPlacement,
  previewRect,
  sizes,
  workspaceRect = previewRect,
}: {
  anchor: InlinePreviewTextAnchor
  obstacles?: readonly InlinePreviewTextObstacle[]
  placementStrategy?: InlinePreviewTextPlacementStrategy
  previousPlacement?: InlinePreviewTextEditorMenuPlacement
  requestedMenuPlacement: InlinePreviewTextEditorMenuPlacement
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
  workspaceRect?: InlinePreviewTextRect
}): {
  anchoredCandidate: InlinePreviewTextCandidateLayout
  anchorRect: InlinePreviewTextRect
  candidates: InlinePreviewTextCandidateLayout[]
  centerDockCandidate?: InlinePreviewTextCandidateLayout
  dockCandidate?: InlinePreviewTextCandidateLayout
  emergencyEligible: boolean
  selectedTextAreaRatio: number
} {
  const belowMenuTop = anchor.bottom + INLINE_PREVIEW_TEXT_CONTROL_GAP
  const belowAvailableHeight = Math.max(0, previewRect.bottom - belowMenuTop)
  const tabsTop = clampTopInsideBounds(
    anchor.top - sizes.tabs.height - INLINE_PREVIEW_TEXT_CONTROL_GAP,
    sizes.tabs,
    previewRect,
  )
  const aboveAvailableHeight = Math.max(
    0,
    tabsTop - INLINE_PREVIEW_TEXT_CONTROL_GAP - previewRect.top,
  )
  const verticalPreference = getPreferredVerticalMenuPlacement({
    aboveAvailableHeight,
    belowAvailableHeight,
    menuHeight: sizes.menu.height,
    requestedPlacement: requestedMenuPlacement,
  })
  const anchorRect = getAnchorRect(anchor)
  const preferredVerticalCandidate = createAnchoredVerticalCandidate({
    anchor,
    anchorRect,
    candidate: verticalPreference,
    obstacles,
    previewRect,
    sizes,
  })
  const alternateVerticalCandidate = createAnchoredVerticalCandidate({
    anchor,
    anchorRect,
    candidate: verticalPreference === 'below' ? 'above' : 'below',
    obstacles,
    previewRect,
    sizes,
  })
  const candidates = [
    preferredVerticalCandidate,
    alternateVerticalCandidate,
    createAnchoredSideCandidate({
      anchor,
      anchorRect,
      candidate: 'left',
      obstacles,
      previewRect,
      sizes,
    }),
    createAnchoredSideCandidate({
      anchor,
      anchorRect,
      candidate: 'right',
      obstacles,
      previewRect,
      sizes,
    }),
  ]
  const anchoredCandidate = obstacles.length > 0
    ? chooseAnchoredCandidate({
      candidates,
      previousPlacement,
    })
    : chooseUnobstructedAnchoredCandidate({
      alternateVerticalCandidate,
      preferredVerticalCandidate,
    })
  const centerDockCandidate =
    placementStrategy === 'disc-center-dock'
      ? createDiscCenterDockCandidate({
          anchorRect,
          obstacles,
          previewRect,
          sizes,
        })
      : undefined
  const sideDockCandidates =
    placementStrategy === 'disc-center-dock'
      ? ([
          createDiscSideDockCandidate({
            anchorRect,
            candidate: 'left',
            obstacles,
            previewRect,
            sizes,
          }),
          createDiscSideDockCandidate({
            anchorRect,
            candidate: 'right',
            obstacles,
            previewRect,
            sizes,
          }),
        ] as const)
      : []
  const dockCandidate = centerDockCandidate
    ? chooseDiscDockCandidate({
        anchorRect,
        centerDockCandidate,
        previousPlacement,
        previewRect,
        sideDockCandidates,
      })
    : undefined
  const dockCandidates = centerDockCandidate
    ? [centerDockCandidate, ...sideDockCandidates]
    : []
  const emergencyCandidates =
    placementStrategy === 'disc-center-dock' ? dockCandidates : candidates
  const previewArea = getRectArea(previewRect)
  const selectedTextAreaRatio =
    previewArea > 0 ? getRectArea(anchorRect) / previewArea : 0
  const emergencyEligible = shouldUseEmergencyPlacement({
    anchorRect,
    anchoredCandidate,
    candidates: emergencyCandidates,
    dockCandidate,
    previewRect,
    workspaceRect,
  })

  return {
    anchoredCandidate,
    anchorRect,
    candidates: [...candidates, ...dockCandidates],
    centerDockCandidate,
    dockCandidate,
    emergencyEligible,
    selectedTextAreaRatio,
  }
}

function getPlacementCandidateDiagnostics(
  candidates: readonly InlinePreviewTextCandidateLayout[],
): InlinePreviewTextPlacementCandidateDiagnostic[] {
  return candidates.map((candidate) => ({
    candidate: candidate.candidate,
    fullHeightFits: candidate.fullHeightFits,
    menuMaxHeight: candidate.menu.maxHeight,
    menuOverflow: candidate.menuOverflow,
    menuTextOverlap: candidate.menuTextOverlap,
    obstacleOverlap: candidate.obstacleOverlap,
    previewOverflow: candidate.previewOverflow,
    score: candidate.score,
    textOverlap: candidate.textOverlap,
    usable: candidate.usable,
  }))
}

export function getInlinePreviewTextLockedControlLayout({
  layout,
  sizes,
  workspaceRect,
}: {
  layout: InlinePreviewTextControlLayout
  sizes: InlinePreviewTextControlSizes
  workspaceRect: InlinePreviewTextRect
}): InlinePreviewTextControlLayout {
  const workspaceWidth = getRectWidth(workspaceRect)
  const workspaceHeight = Math.max(1, getRectHeight(workspaceRect))
  const menuMaxHeight = clampValue(
    Math.min(layout.menu.maxHeight, workspaceHeight),
    1,
    workspaceHeight,
  )
  const menuLayoutHeight = Math.min(sizes.menu.height, menuMaxHeight)
  const menuTop = clampTopInsideBounds(
    layout.menu.top,
    { ...sizes.menu, height: menuLayoutHeight },
    workspaceRect,
  )
  const menuLeft = clampLeftInsideBounds(
    layout.menu.left,
    sizes.menu,
    workspaceRect,
  )
  const tabsTop = clampTopInsideBounds(
    layout.tabs.top,
    sizes.tabs,
    workspaceRect,
  )
  const tabsLeft = clampLeftInsideBounds(
    layout.tabs.left,
    sizes.tabs,
    workspaceRect,
  )
  const moveHandleTop = clampTopInsideBounds(
    layout.moveHandle.top,
    sizes.moveHandle,
    workspaceRect,
  )
  const moveHandleLeft = clampLeftInsideBounds(
    layout.moveHandle.left,
    sizes.moveHandle,
    workspaceRect,
  )

  return {
    menu: {
      left: menuLeft,
      maxHeight: menuMaxHeight,
      maxWidth: workspaceWidth,
      placement: layout.menu.placement,
      top: menuTop,
    },
    mode: layout.mode,
    moveHandle: {
      left: moveHandleLeft,
      top: moveHandleTop,
    },
    tabs: {
      left: tabsLeft,
      maxWidth: workspaceWidth,
      top: tabsTop,
    },
  }
}

export function getInlinePreviewTextControlPlacementDiagnostics(
  input: Parameters<typeof getInlinePreviewTextControlLayout>[0],
): InlinePreviewTextPlacementDiagnostics {
  const model = getInlinePreviewTextControlPlacementModel(input)

  return {
    anchorRect: model.anchorRect,
    candidates: getPlacementCandidateDiagnostics(model.candidates),
    emergencyEligible: model.emergencyEligible,
    selectedPlacement: model.emergencyEligible
      ? 'detached'
      : model.dockCandidate
        ? model.dockCandidate.menu.placement
        : model.anchoredCandidate.menu.placement,
    selectedTextAreaRatio: model.selectedTextAreaRatio,
  }
}

export function getInlinePreviewTextControlLayout({
  anchor,
  obstacles = [],
  placementStrategy = 'default',
  previousPlacement,
  requestedMenuPlacement,
  previewRect,
  sizes,
  workspaceRect = previewRect,
}: {
  anchor: InlinePreviewTextAnchor
  obstacles?: readonly InlinePreviewTextObstacle[]
  placementStrategy?: InlinePreviewTextPlacementStrategy
  previousPlacement?: InlinePreviewTextEditorMenuPlacement
  requestedMenuPlacement: InlinePreviewTextEditorMenuPlacement
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
  workspaceRect?: InlinePreviewTextRect
}): InlinePreviewTextControlLayout {
  const model = getInlinePreviewTextControlPlacementModel({
    anchor,
    obstacles,
    placementStrategy,
    previewRect,
    previousPlacement,
    requestedMenuPlacement,
    sizes,
    workspaceRect,
  })

  if (model.emergencyEligible) {
    return createEmergencyLayout({
      anchor,
      obstacles,
      previewRect,
      sizes,
      workspaceRect,
    })
  }

  if (model.dockCandidate) {
    return {
      menu: model.dockCandidate.menu,
      mode: model.dockCandidate.mode,
      moveHandle: model.dockCandidate.moveHandle,
      tabs: model.dockCandidate.tabs,
    }
  }

  return {
    menu: model.anchoredCandidate.menu,
    mode: model.anchoredCandidate.mode,
    moveHandle: model.anchoredCandidate.moveHandle,
    tabs: model.anchoredCandidate.tabs,
  }
}

export const inlinePreviewTextPlacementInternals = {
  getOverlapArea,
  getOverflowArea,
  getRectArea,
}
