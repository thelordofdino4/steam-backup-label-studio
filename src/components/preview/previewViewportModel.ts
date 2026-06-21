export type PreviewViewportState = {
  panX: number
  panY: number
  zoom: number
}

export type PreviewViewportBounds = {
  contentHeight: number
  contentWidth: number
  viewportHeight: number
  viewportWidth: number
}

export type PreviewViewportPoint = {
  x: number
  y: number
}

export type PreviewViewportPanBounds = {
  maxX: number
  maxY: number
  minX: number
  minY: number
}

export type PreviewViewportRailSizingInput = {
  contentHeight: number
  contentWidth: number
  stageHeight: number
  surfaceWindowGap: number
  viewportHeight: number
  viewportWidth: number
}

export const PREVIEW_VIEWPORT_DEFAULT_STATE: PreviewViewportState = {
  panX: 0,
  panY: 0,
  zoom: 1,
}

export const PREVIEW_VIEWPORT_MIN_ZOOM = 0.25
export const PREVIEW_VIEWPORT_MAX_ZOOM = 4
export const PREVIEW_VIEWPORT_BUTTON_ZOOM_FACTOR = 1.12
export const PREVIEW_VIEWPORT_RAIL_COLUMNS = 2
export const PREVIEW_VIEWPORT_RAIL_ROWS = 5
export const PREVIEW_VIEWPORT_MIN_RAIL_BUTTON_SIZE = 24
export const PREVIEW_VIEWPORT_MAX_RAIL_BUTTON_SIZE = 48
export const PREVIEW_VIEWPORT_DEFAULT_RAIL_BUTTON_SIZE =
  PREVIEW_VIEWPORT_MIN_RAIL_BUTTON_SIZE

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isPositiveFinite(value: number) {
  return Number.isFinite(value) && value > 0
}

export function clampPreviewViewportZoom(zoom: number) {
  return clampNumber(
    Number.isFinite(zoom) ? zoom : PREVIEW_VIEWPORT_DEFAULT_STATE.zoom,
    PREVIEW_VIEWPORT_MIN_ZOOM,
    PREVIEW_VIEWPORT_MAX_ZOOM,
  )
}

export function normalizePreviewViewportZoom(zoom: number) {
  return Math.round(clampPreviewViewportZoom(zoom) * 1000) / 1000
}

export function getPreviewViewportZoomPercent(zoom: number) {
  return Math.round(clampPreviewViewportZoom(zoom) * 100)
}

export function getPreviewViewportRailWidth(buttonSize: number) {
  return PREVIEW_VIEWPORT_RAIL_COLUMNS * clampNumber(
    Number.isFinite(buttonSize)
      ? buttonSize
      : PREVIEW_VIEWPORT_DEFAULT_RAIL_BUTTON_SIZE,
    PREVIEW_VIEWPORT_MIN_RAIL_BUTTON_SIZE,
    PREVIEW_VIEWPORT_MAX_RAIL_BUTTON_SIZE,
  )
}

export function getPreviewViewportRailHeight(buttonSize: number) {
  return PREVIEW_VIEWPORT_RAIL_ROWS * clampNumber(
    Number.isFinite(buttonSize)
      ? buttonSize
      : PREVIEW_VIEWPORT_DEFAULT_RAIL_BUTTON_SIZE,
    PREVIEW_VIEWPORT_MIN_RAIL_BUTTON_SIZE,
    PREVIEW_VIEWPORT_MAX_RAIL_BUTTON_SIZE,
  )
}

export function choosePreviewViewportRailButtonSize({
  contentHeight,
  contentWidth,
  stageHeight,
  surfaceWindowGap,
  viewportHeight,
  viewportWidth,
}: PreviewViewportRailSizingInput) {
  if (
    !isPositiveFinite(contentHeight) ||
    !isPositiveFinite(contentWidth) ||
    !isPositiveFinite(stageHeight) ||
    !isPositiveFinite(viewportHeight) ||
    !isPositiveFinite(viewportWidth)
  ) {
    return PREVIEW_VIEWPORT_DEFAULT_RAIL_BUTTON_SIZE
  }

  const safeGap = Number.isFinite(surfaceWindowGap) && surfaceWindowGap >= 0
    ? surfaceWindowGap
    : 4
  const minimumRailWidth = getPreviewViewportRailWidth(
    PREVIEW_VIEWPORT_MIN_RAIL_BUTTON_SIZE,
  )
  const contentAspectRatio = contentWidth / contentHeight
  const minimumStageWidth = Math.max(
    0,
    viewportWidth - safeGap - safeGap - minimumRailWidth,
  )
  const fittedWidthAtMinimumRail = Math.min(
    minimumStageWidth,
    stageHeight * contentAspectRatio,
  )
  const horizontalResidualGutter = Math.max(
    0,
    minimumStageWidth - fittedWidthAtMinimumRail,
  )
  const rightResidualGutter = horizontalResidualGutter / 2
  const maxButtonSizeFromHorizontalSlack =
    (minimumRailWidth + rightResidualGutter) / PREVIEW_VIEWPORT_RAIL_COLUMNS
  const maxButtonSizeFromVerticalSpace =
    viewportHeight / PREVIEW_VIEWPORT_RAIL_ROWS
  const rawButtonSize = Math.min(
    PREVIEW_VIEWPORT_MAX_RAIL_BUTTON_SIZE,
    maxButtonSizeFromHorizontalSlack,
    maxButtonSizeFromVerticalSpace,
  )

  return Math.round(clampNumber(
    rawButtonSize,
    PREVIEW_VIEWPORT_MIN_RAIL_BUTTON_SIZE,
    PREVIEW_VIEWPORT_MAX_RAIL_BUTTON_SIZE,
  ) * 100) / 100
}

export function getPreviewViewportPanBounds(
  state: PreviewViewportState,
  bounds: PreviewViewportBounds,
): PreviewViewportPanBounds {
  const zoom = clampPreviewViewportZoom(state.zoom)
  const scaledWidth = bounds.contentWidth * zoom
  const scaledHeight = bounds.contentHeight * zoom

  const horizontalOverflow = Math.max(0, scaledWidth - bounds.viewportWidth)
  const verticalOverflow = Math.max(0, scaledHeight - bounds.viewportHeight)

  return {
    minX: -horizontalOverflow / 2,
    maxX: horizontalOverflow / 2,
    minY: -verticalOverflow,
    maxY: 0,
  }
}

export function clampPreviewViewportState(
  state: PreviewViewportState,
  bounds: PreviewViewportBounds | null,
): PreviewViewportState {
  const zoom = normalizePreviewViewportZoom(state.zoom)

  if (
    !bounds ||
    !isPositiveFinite(bounds.viewportWidth) ||
    !isPositiveFinite(bounds.viewportHeight) ||
    !isPositiveFinite(bounds.contentWidth) ||
    !isPositiveFinite(bounds.contentHeight)
  ) {
    return {
      zoom,
      panX: Number.isFinite(state.panX) ? state.panX : 0,
      panY: Number.isFinite(state.panY) ? state.panY : 0,
    }
  }

  const panBounds = getPreviewViewportPanBounds(
    { ...state, zoom },
    bounds,
  )

  return {
    zoom,
    panX: clampNumber(
      Number.isFinite(state.panX) ? state.panX : 0,
      panBounds.minX,
      panBounds.maxX,
    ),
    panY: clampNumber(
      Number.isFinite(state.panY) ? state.panY : 0,
      panBounds.minY,
      panBounds.maxY,
    ),
  }
}

export function panPreviewViewportBy(
  state: PreviewViewportState,
  delta: PreviewViewportPoint,
  bounds: PreviewViewportBounds | null,
): PreviewViewportState {
  return clampPreviewViewportState(
    {
      ...state,
      panX: state.panX + delta.x,
      panY: state.panY + delta.y,
    },
    bounds,
  )
}

export function zoomPreviewViewportAroundPoint(
  state: PreviewViewportState,
  requestedZoom: number,
  point: PreviewViewportPoint,
  bounds: PreviewViewportBounds | null,
): PreviewViewportState {
  const oldZoom = clampPreviewViewportZoom(state.zoom)
  const nextZoom = normalizePreviewViewportZoom(requestedZoom)

  if (!bounds || !isPositiveFinite(bounds.viewportWidth)) {
    return clampPreviewViewportState(
      {
        ...state,
        zoom: nextZoom,
      },
      bounds,
    )
  }

  const originX = bounds.viewportWidth / 2
  const originY = 0
  const contentX = originX + (point.x - originX - state.panX) / oldZoom
  const contentY = originY + (point.y - originY - state.panY) / oldZoom

  return clampPreviewViewportState(
    {
      zoom: nextZoom,
      panX: point.x - originX - (contentX - originX) * nextZoom,
      panY: point.y - originY - (contentY - originY) * nextZoom,
    },
    bounds,
  )
}

export function resetPreviewViewportToFit(): PreviewViewportState {
  return PREVIEW_VIEWPORT_DEFAULT_STATE
}
