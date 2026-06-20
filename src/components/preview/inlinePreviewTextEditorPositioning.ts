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
  | 'detached'
  | 'left'
  | 'right'

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
  mode: 'anchored' | 'detached'
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
const INLINE_PREVIEW_TEXT_MIN_USABLE_MENU_HEIGHT = 48
const INLINE_PREVIEW_TEXT_EMERGENCY_TEXT_AREA_RATIO = 0.8
const INLINE_PREVIEW_TEXT_PLACEMENT_HYSTERESIS = 24

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
  const obstacleOverlap = obstacles.reduce((total, obstacle) =>
    total + controlRects.reduce(
      (controlTotal, rect) => controlTotal + getOverlapArea(rect, obstacle.rect),
      0,
    ),
  0)
  const menuOverflow = getOverflowArea(menuRect, previewRect)

  return {
    menuOverflow,
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
  const moveHandleLeft = clampLeftInsideBounds(
    anchor.right + INLINE_PREVIEW_TEXT_CONTROL_GAP,
    sizes.moveHandle,
    previewRect,
  )
  const moveHandleTop = clampTopInsideBounds(
    anchor.centerY - sizes.moveHandle.height / 2,
    sizes.moveHandle,
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
    obstacles,
    previewRect,
    tabsRect,
  })

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
    mode: 'anchored',
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
      maxWidth: previewWidth,
      top: tabsTop,
    },
    tabsRect,
    textOverlap: scored.textOverlap,
    usable:
      menuMaxHeight >= INLINE_PREVIEW_TEXT_MIN_USABLE_MENU_HEIGHT &&
      scored.previewOverflow <= 1 &&
      scored.primaryTextOverlap <= 1,
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
  const moveHandleLeft =
    candidate === 'left'
      ? clampLeftInsideBounds(
        anchorRect.left - INLINE_PREVIEW_TEXT_CONTROL_GAP - sizes.moveHandle.width,
        sizes.moveHandle,
        previewRect,
      )
      : clampLeftInsideBounds(
        anchor.right + INLINE_PREVIEW_TEXT_CONTROL_GAP,
        sizes.moveHandle,
        previewRect,
      )
  const moveHandleTop = clampTopInsideBounds(
    anchor.centerY - sizes.moveHandle.height / 2,
    sizes.moveHandle,
    previewRect,
  )
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
    obstacles,
    previewRect,
    tabsRect,
  })

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
    mode: 'anchored',
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
      maxWidth: previewWidth,
      top: tabsRect.top,
    },
    tabsRect,
    textOverlap: scored.textOverlap,
    usable:
      maxMenuHeight >= INLINE_PREVIEW_TEXT_MIN_USABLE_MENU_HEIGHT &&
      scored.previewOverflow <= 1 &&
      scored.primaryTextOverlap <= 1,
  }
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
  previewRect,
  workspaceRect,
}: {
  anchorRect: InlinePreviewTextRect
  anchoredCandidate: InlinePreviewTextCandidateLayout
  candidates: readonly InlinePreviewTextCandidateLayout[]
  previewRect: InlinePreviewTextRect
  workspaceRect: InlinePreviewTextRect
}) {
  const previewArea = getRectArea(previewRect)
  const workspaceArea = getRectArea(workspaceRect)
  const selectedTextAreaRatio =
    previewArea > 0 ? getRectArea(anchorRect) / previewArea : 0
  const hasUsableCandidate = candidates.some((candidate) => candidate.usable)
  const hasMeaningfulDetachedWorkspace =
    workspaceArea > previewArea * 1.05
  const hasLargeSelectedText =
    selectedTextAreaRatio >= INLINE_PREVIEW_TEXT_EMERGENCY_TEXT_AREA_RATIO

  return (
    hasMeaningfulDetachedWorkspace &&
    !hasUsableCandidate &&
    (hasLargeSelectedText || anchoredCandidate.textOverlap > 1)
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
    INLINE_PREVIEW_TEXT_MIN_USABLE_MENU_HEIGHT,
    previewRect.bottom - workspaceRect.top - INLINE_PREVIEW_TEXT_EDGE_GAP,
  )
  const menuMaxHeight = Math.max(
    INLINE_PREVIEW_TEXT_MIN_USABLE_MENU_HEIGHT,
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
  previousPlacement,
  requestedMenuPlacement,
  previewRect,
  sizes,
  workspaceRect = previewRect,
}: {
  anchor: InlinePreviewTextAnchor
  obstacles?: readonly InlinePreviewTextObstacle[]
  previousPlacement?: InlinePreviewTextEditorMenuPlacement
  requestedMenuPlacement: InlinePreviewTextEditorMenuPlacement
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
  workspaceRect?: InlinePreviewTextRect
}): {
  anchoredCandidate: InlinePreviewTextCandidateLayout
  anchorRect: InlinePreviewTextRect
  candidates: InlinePreviewTextCandidateLayout[]
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
  const previewArea = getRectArea(previewRect)
  const selectedTextAreaRatio =
    previewArea > 0 ? getRectArea(anchorRect) / previewArea : 0
  const emergencyEligible = shouldUseEmergencyPlacement({
    anchorRect,
    anchoredCandidate,
    candidates,
    previewRect,
    workspaceRect,
  })

  return {
    anchoredCandidate,
    anchorRect,
    candidates,
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
    obstacleOverlap: candidate.obstacleOverlap,
    previewOverflow: candidate.previewOverflow,
    score: candidate.score,
    textOverlap: candidate.textOverlap,
    usable: candidate.usable,
  }))
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
      : model.anchoredCandidate.menu.placement,
    selectedTextAreaRatio: model.selectedTextAreaRatio,
  }
}

export function getInlinePreviewTextControlLayout({
  anchor,
  obstacles = [],
  previousPlacement,
  requestedMenuPlacement,
  previewRect,
  sizes,
  workspaceRect = previewRect,
}: {
  anchor: InlinePreviewTextAnchor
  obstacles?: readonly InlinePreviewTextObstacle[]
  previousPlacement?: InlinePreviewTextEditorMenuPlacement
  requestedMenuPlacement: InlinePreviewTextEditorMenuPlacement
  previewRect: InlinePreviewTextRect
  sizes: InlinePreviewTextControlSizes
  workspaceRect?: InlinePreviewTextRect
}): InlinePreviewTextControlLayout {
  const model = getInlinePreviewTextControlPlacementModel({
    anchor,
    obstacles,
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
