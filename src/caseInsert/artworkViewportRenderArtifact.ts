import {
  normalizeProjectCaseInsertReservedArtworkViewport,
  type CaseInsertReservedArtworkViewportOwner,
} from './artworkViewportState.ts'
import {
  getImageContentBounds,
  getImageContentSourceRect,
  isEmptyImageContentBounds,
} from '../image/imageContentBounds.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
} from '../project/projectTypes.ts'
import {
  createImageRenderArtifact,
  type ImageRenderArtifact,
  type RenderPixelRect,
  type RenderTransformedBox,
} from '../render/imageRenderArtifact.ts'

export type CaseInsertArtworkViewportLayout = Readonly<{
  templateId: string
  width: number
  height: number
  regions: readonly Readonly<{
    regionId: string
    surfaceId: string
    bounds: RenderPixelRect
  }>[]
}>

export type CaseInsertArtworkViewportRenderOwner =
  | 'cover'
  | 'tray'
  | 'left-spine'
  | 'right-spine'

export type CaseInsertArtworkViewportActiveFit = Exclude<
  ProjectCaseInsertImageFit,
  'scale'
>

export type CaseInsertArtworkViewportRenderArtifact = Readonly<
  ImageRenderArtifact & {
    owner: CaseInsertArtworkViewportRenderOwner
    coordinateBasis: string
    fit: CaseInsertArtworkViewportActiveFit
    focalPosition: Readonly<{ xPercent: number; yPercent: number }>
    zoom: number
    basisRect: Readonly<RenderPixelRect>
    outerRect: Readonly<RenderPixelRect>
    box: Readonly<RenderTransformedBox>
    boundingRect: Readonly<RenderPixelRect>
    localFrameRect: Readonly<RenderPixelRect>
    contentSourceRect: Readonly<RenderPixelRect>
    visibleSourceRect: Readonly<RenderPixelRect>
    renderedContentRect: Readonly<RenderPixelRect>
    destinationRect: Readonly<RenderPixelRect>
    clipRect: Readonly<RenderPixelRect>
    sourcePixelsPerLayoutUnit: number
    hasVisibleClipping: boolean
    hasEmptySpace: boolean
  }
>

export type CaseInsertArtworkViewportRenderResult =
  | Readonly<{ status: 'legacy' }>
  | Readonly<{
      status: 'empty'
      reason: 'disabled' | 'missing-image' | 'empty-content'
    }>
  | Readonly<{
      status: 'unavailable'
      reason:
        | 'invalid-viewport'
        | 'template-mismatch'
        | 'basis-unavailable'
        | 'unsupported-fit'
        | 'invalid-layout'
        | 'numeric-result-invalid'
    }>
  | Readonly<{
      status: 'resolved'
      artifact: CaseInsertArtworkViewportRenderArtifact
    }>

export type ResolveCaseInsertArtworkViewportRenderArtifactInput = Readonly<{
  owner: CaseInsertArtworkViewportRenderOwner
  slot: ProjectCaseInsertImageSlot
  layout: CaseInsertArtworkViewportLayout
}>

const OWNER_STATE_KEYS: Readonly<Record<
  CaseInsertArtworkViewportRenderOwner,
  CaseInsertReservedArtworkViewportOwner
>> = Object.freeze({
  cover: 'cover',
  tray: 'tray',
  'left-spine': 'leftSpine',
  'right-spine': 'rightSpine',
})

const OWNER_SURFACES = Object.freeze({
  cover: 'front',
  tray: 'back',
  'left-spine': 'back',
  'right-spine': 'back',
} satisfies Readonly<Record<CaseInsertArtworkViewportRenderOwner, string>>)

const LEGACY_RESULT = Object.freeze({ status: 'legacy' } as const)
const MIN_RENDER_MAGNITUDE = 1e-9
const MAX_RENDER_MAGNITUDE = 1e6
const MAX_SOURCE_PROJECTION_RATIO = 10_000
const MAX_ABSOLUTE_RENDER_DEMAND = 1e6

function isActiveFit(
  value: unknown,
): value is CaseInsertArtworkViewportActiveFit {
  return value === 'contain' || value === 'cover' || value === 'crop'
}

function isOperationalNumber(value: number) {
  const magnitude = Math.abs(value)
  return Number.isFinite(value) && magnitude <= MAX_RENDER_MAGNITUDE
}

function isOperationalPositiveNumber(value: number) {
  return isOperationalNumber(value) && value >= MIN_RENDER_MAGNITUDE
}

function hasOnlyOperationalNumbers(
  value: unknown,
  seen = new Set<object>(),
): boolean {
  if (typeof value === 'number') return isOperationalNumber(value)
  if (value === null || typeof value !== 'object') return true
  if (seen.has(value)) return false

  seen.add(value)
  const valid = Object.values(value).every((entry) =>
    hasOnlyOperationalNumbers(entry, seen))
  seen.delete(value)
  return valid
}

function freezeRect(rect: RenderPixelRect) {
  return Object.freeze({ ...rect })
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function normalizeRotation(rotation: number) {
  const normalized = ((rotation % 360) + 360) % 360
  return normalized > 180 ? normalized - 360 : normalized
}

function getRotatedBoundingSize(
  width: number,
  height: number,
  rotationDegrees: number,
) {
  const radians = rotationDegrees * Math.PI / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))

  return {
    width: width * cosine + height * sine,
    height: width * sine + height * cosine,
  }
}

type BasisRectResolution =
  | Readonly<{ status: 'resolved'; rect: RenderPixelRect }>
  | Readonly<{ status: 'missing' }>
  | Readonly<{ status: 'invalid' }>

function resolveBasisRect(
  layout: CaseInsertArtworkViewportLayout,
  owner: CaseInsertArtworkViewportRenderOwner,
  coordinateBasis: string,
): BasisRectResolution {
  const expectedSurface = OWNER_SURFACES[owner]
  let matchingRegions: CaseInsertArtworkViewportLayout['regions']
  try {
    if (!Array.isArray(layout.regions)) return { status: 'invalid' }
    matchingRegions = layout.regions.filter(
      (candidate) => candidate.regionId === coordinateBasis &&
        candidate.surfaceId === expectedSurface,
    )
  } catch {
    return { status: 'invalid' }
  }

  if (matchingRegions.length === 0) return { status: 'missing' }
  if (matchingRegions.length !== 1) return { status: 'invalid' }

  const rect = matchingRegions[0].bounds
  const values = [rect?.x, rect?.y, rect?.width, rect?.height]
  if (values.some((value) =>
    typeof value !== 'number' || !isOperationalNumber(value)) ||
      !isOperationalPositiveNumber(rect.width) ||
      !isOperationalPositiveNumber(rect.height) ||
      rect.x < 0 || rect.y < 0) {
    return { status: 'invalid' }
  }

  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  if (!isOperationalNumber(right) || !isOperationalNumber(bottom) ||
      right > layout.width || bottom > layout.height) {
    return { status: 'invalid' }
  }

  return { status: 'resolved', rect }
}

function getOuterGeometry(
  basisRect: RenderPixelRect,
  widthPercent: number,
  heightPercent: number,
  layout: ProjectCaseInsertImageSlot['layout'],
) {
  if (![layout.x, layout.y, layout.scale, layout.rotation]
    .every((value) => typeof value === 'number' && Number.isFinite(value)) ||
      layout.scale <= 0) {
    return null
  }

  const rotationDegrees = normalizeRotation(layout.rotation)
  const requestedWidth = basisRect.width * widthPercent / 100 * layout.scale
  const requestedHeight = basisRect.height * heightPercent / 100 * layout.scale
  const requestedBoundingSize = getRotatedBoundingSize(
    requestedWidth,
    requestedHeight,
    rotationDegrees,
  )
  const containmentScale = Math.min(
    1,
    basisRect.width / requestedBoundingSize.width,
    basisRect.height / requestedBoundingSize.height,
  )
  const width = requestedWidth * containmentScale
  const height = requestedHeight * containmentScale
  const boundingSize = getRotatedBoundingSize(width, height, rotationDegrees)
  const requestedCenter = {
    x: basisRect.x + basisRect.width * clamp(layout.x, 0, 100) / 100,
    y: basisRect.y + basisRect.height * clamp(layout.y, 0, 100) / 100,
  }
  const center = {
    x: clamp(
      requestedCenter.x,
      basisRect.x + boundingSize.width / 2,
      basisRect.x + basisRect.width - boundingSize.width / 2,
    ),
    y: clamp(
      requestedCenter.y,
      basisRect.y + boundingSize.height / 2,
      basisRect.y + basisRect.height - boundingSize.height / 2,
    ),
  }
  const outerRect = {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  }
  const boundingRect = {
    x: center.x - boundingSize.width / 2,
    y: center.y - boundingSize.height / 2,
    width: boundingSize.width,
    height: boundingSize.height,
  }

  if ([
    ...Object.values(center),
    ...Object.values(outerRect),
    ...Object.values(boundingRect),
  ].some((value) => !Number.isFinite(value)) || width <= 0 || height <= 0) {
    return null
  }

  return {
    outerRect,
    box: {
      center,
      width,
      height,
      rotationDegrees,
    },
    boundingRect,
    localFrameRect: {
      x: -width / 2,
      y: -height / 2,
      width,
      height,
    },
  }
}

function getCoverWindow(
  frame: Pick<RenderPixelRect, 'width' | 'height'>,
  content: RenderPixelRect,
) {
  const scale = Math.max(
    frame.width / content.width,
    frame.height / content.height,
  )
  const width = frame.width / scale
  const height = frame.height / scale

  return {
    scale,
    rect: {
      x: content.x + (content.width - width) / 2,
      y: content.y + (content.height - height) / 2,
      width,
      height,
    },
  }
}

function getCropWindow(
  frame: Pick<RenderPixelRect, 'width' | 'height'>,
  content: RenderPixelRect,
  focalPosition: { xPercent: number; yPercent: number },
  zoom: number,
) {
  const cover = getCoverWindow(frame, content)
  const width = cover.rect.width / zoom
  const height = cover.rect.height / zoom
  const centerX = content.x + content.width * focalPosition.xPercent / 100
  const centerY = content.y + content.height * focalPosition.yPercent / 100

  return {
    scale: frame.width / width,
    rect: {
      x: clamp(
        centerX - width / 2,
        content.x,
        content.x + content.width - width,
      ),
      y: clamp(
        centerY - height / 2,
        content.y,
        content.y + content.height - height,
      ),
      width,
      height,
    },
  }
}

function getFitting(
  fit: CaseInsertArtworkViewportActiveFit,
  localFrameRect: RenderPixelRect,
  content: RenderPixelRect,
  focalPosition: { xPercent: number; yPercent: number },
  zoom: number,
) {
  if (fit === 'contain') {
    const scale = Math.min(
      localFrameRect.width / content.width,
      localFrameRect.height / content.height,
    )
    const width = content.width * scale
    const height = content.height * scale
    const renderedContentRect = {
      x: -width / 2,
      y: -height / 2,
      width,
      height,
    }

    return {
      scale,
      visibleSourceRect: { ...content },
      renderedContentRect,
      destinationRect: { ...renderedContentRect },
      hasVisibleClipping: false,
      hasEmptySpace:
        width < localFrameRect.width || height < localFrameRect.height,
    }
  }

  const window = fit === 'cover'
    ? getCoverWindow(localFrameRect, content)
    : getCropWindow(localFrameRect, content, focalPosition, zoom)
  const renderedContentRect = {
    x: localFrameRect.x - (window.rect.x - content.x) * window.scale,
    y: localFrameRect.y - (window.rect.y - content.y) * window.scale,
    width: content.width * window.scale,
    height: content.height * window.scale,
  }

  return {
    scale: window.scale,
    visibleSourceRect: window.rect,
    renderedContentRect,
    destinationRect: { ...localFrameRect },
    hasVisibleClipping:
      window.rect.width < content.width || window.rect.height < content.height,
    hasEmptySpace: false,
  }
}

function hasOperationalSourceProjection(
  imageSize: Readonly<{ width: number; height: number }>,
  visibleSourceRect: RenderPixelRect,
  destinationRect: RenderPixelRect,
) {
  const horizontalRatio = imageSize.width / visibleSourceRect.width
  const verticalRatio = imageSize.height / visibleSourceRect.height
  const ratios = [
    horizontalRatio,
    verticalRatio,
    Math.abs(visibleSourceRect.x) / visibleSourceRect.width,
    Math.abs(visibleSourceRect.y) / visibleSourceRect.height,
  ]
  const absoluteDemands = [
    destinationRect.width * horizontalRatio,
    destinationRect.height * verticalRatio,
  ]

  return ratios.every((value) =>
    isOperationalNumber(value) && value <= MAX_SOURCE_PROJECTION_RATIO) &&
    absoluteDemands.every((value) =>
      isOperationalPositiveNumber(value) &&
      value <= MAX_ABSOLUTE_RENDER_DEMAND)
}

function cloneImageArtifact(artifact: ImageRenderArtifact): ImageRenderArtifact {
  return {
    ...artifact,
    ...(artifact.imageSize
      ? {
          imageSize: {
            ...artifact.imageSize,
            ...(artifact.imageSize.contentBounds
              ? { contentBounds: { ...artifact.imageSize.contentBounds } }
              : {}),
            ...(artifact.imageSize.contentShape
              ? { contentShape: { ...artifact.imageSize.contentShape } }
              : {}),
          },
        }
      : {}),
    ...(artifact.contentBounds
      ? { contentBounds: { ...artifact.contentBounds } }
      : {}),
    ...(artifact.contentShape
      ? { contentShape: { ...artifact.contentShape } }
      : {}),
  }
}

function freezeArtifact(
  artifact: CaseInsertArtworkViewportRenderArtifact,
): CaseInsertArtworkViewportRenderArtifact {
  if (artifact.imageSize) {
    if (artifact.imageSize.contentBounds) {
      Object.freeze(artifact.imageSize.contentBounds)
    }
    if (artifact.imageSize.contentShape) {
      Object.freeze(artifact.imageSize.contentShape)
    }
    Object.freeze(artifact.imageSize)
  }
  if (artifact.contentBounds) Object.freeze(artifact.contentBounds)
  if (artifact.contentShape) Object.freeze(artifact.contentShape)
  Object.freeze(artifact.focalPosition)
  Object.freeze(artifact.basisRect)
  Object.freeze(artifact.outerRect)
  Object.freeze(artifact.box.center)
  Object.freeze(artifact.box)
  Object.freeze(artifact.boundingRect)
  Object.freeze(artifact.localFrameRect)
  Object.freeze(artifact.contentSourceRect)
  Object.freeze(artifact.visibleSourceRect)
  Object.freeze(artifact.renderedContentRect)
  Object.freeze(artifact.destinationRect)
  Object.freeze(artifact.clipRect)
  return Object.freeze(artifact)
}

/**
 * Resolves the sole source-independent viewport state into shared preview and
 * export geometry. Legacy slots are identified explicitly so callers can keep
 * their existing render paths byte-for-byte unchanged.
 */
export function resolveCaseInsertArtworkViewportRenderArtifact({
  owner,
  slot,
  layout,
}: ResolveCaseInsertArtworkViewportRenderArtifactInput):
CaseInsertArtworkViewportRenderResult {
  if (slot.reservedArtworkViewport == null) return LEGACY_RESULT

  if (!isOperationalPositiveNumber(layout.width) ||
      !isOperationalPositiveNumber(layout.height)) {
    return Object.freeze({ status: 'unavailable', reason: 'invalid-layout' })
  }

  const viewport = normalizeProjectCaseInsertReservedArtworkViewport(
    slot.reservedArtworkViewport,
    OWNER_STATE_KEYS[owner],
  )
  if (!viewport) {
    return Object.freeze({ status: 'unavailable', reason: 'invalid-viewport' })
  }
  if (layout.templateId !== viewport.templateId ||
      viewport.templateRevision !== null) {
    return Object.freeze({ status: 'unavailable', reason: 'template-mismatch' })
  }
  if (!isActiveFit(slot.fit)) {
    return Object.freeze({ status: 'unavailable', reason: 'unsupported-fit' })
  }
  if (!slot.enabled) {
    return Object.freeze({ status: 'empty', reason: 'disabled' })
  }
  if (!slot.imageDataUrl || !slot.imageSize ||
      !Number.isFinite(slot.imageSize.width) ||
      !Number.isFinite(slot.imageSize.height) ||
      slot.imageSize.width <= 0 || slot.imageSize.height <= 0) {
    return Object.freeze({ status: 'empty', reason: 'missing-image' })
  }
  const storedBounds = getImageContentBounds(slot.imageSize)
  if (storedBounds && isEmptyImageContentBounds(storedBounds)) {
    return Object.freeze({ status: 'empty', reason: 'empty-content' })
  }
  const contentSourceRect = getImageContentSourceRect(slot.imageSize)
  if (!contentSourceRect) {
    return Object.freeze({ status: 'empty', reason: 'empty-content' })
  }

  const basisResolution = resolveBasisRect(
    layout,
    owner,
    viewport.coordinateBasis,
  )
  if (basisResolution.status === 'missing') {
    return Object.freeze({ status: 'unavailable', reason: 'basis-unavailable' })
  }
  if (basisResolution.status === 'invalid') {
    return Object.freeze({ status: 'unavailable', reason: 'invalid-layout' })
  }
  const basisRect = basisResolution.rect
  const geometry = getOuterGeometry(
    basisRect,
    viewport.widthPercent,
    viewport.heightPercent,
    slot.layout,
  )
  if (!geometry) {
    return Object.freeze({ status: 'unavailable', reason: 'invalid-layout' })
  }
  const fitting = getFitting(
    slot.fit,
    geometry.localFrameRect,
    contentSourceRect,
    viewport.focalPosition,
    viewport.zoom,
  )
  if (!hasOperationalSourceProjection(
    slot.imageSize,
    fitting.visibleSourceRect,
    fitting.destinationRect,
  )) {
    return Object.freeze({
      status: 'unavailable',
      reason: 'numeric-result-invalid',
    })
  }
  const imageArtifact = createImageRenderArtifact({
    imageDataUrl: slot.imageDataUrl,
    imageSize: slot.imageSize,
    label: slot.label,
    alt: '',
  })
  if (!imageArtifact) {
    return Object.freeze({ status: 'empty', reason: 'empty-content' })
  }

  const sourcePixelsPerLayoutUnit = 1 / fitting.scale
  const numbers = [
    fitting.scale,
    sourcePixelsPerLayoutUnit,
    ...Object.values(geometry.outerRect),
    ...Object.values(geometry.boundingRect),
    ...Object.values(fitting.visibleSourceRect),
    ...Object.values(fitting.renderedContentRect),
    ...Object.values(fitting.destinationRect),
  ]
  if (numbers.some((value) => !Number.isFinite(value)) || fitting.scale <= 0) {
    return Object.freeze({
      status: 'unavailable',
      reason: 'numeric-result-invalid',
    })
  }

  const artifact: CaseInsertArtworkViewportRenderArtifact = {
    ...cloneImageArtifact(imageArtifact),
    owner,
    coordinateBasis: viewport.coordinateBasis,
    fit: slot.fit,
    focalPosition: { ...viewport.focalPosition },
    zoom: viewport.zoom,
    basisRect: freezeRect(basisRect),
    outerRect: freezeRect(geometry.outerRect),
    box: {
      center: { ...geometry.box.center },
      width: geometry.box.width,
      height: geometry.box.height,
      rotationDegrees: geometry.box.rotationDegrees,
    },
    boundingRect: freezeRect(geometry.boundingRect),
    localFrameRect: freezeRect(geometry.localFrameRect),
    contentSourceRect: freezeRect(contentSourceRect),
    visibleSourceRect: freezeRect(fitting.visibleSourceRect),
    renderedContentRect: freezeRect(fitting.renderedContentRect),
    destinationRect: freezeRect(fitting.destinationRect),
    clipRect: freezeRect(geometry.localFrameRect),
    sourcePixelsPerLayoutUnit,
    hasVisibleClipping: fitting.hasVisibleClipping,
    hasEmptySpace: fitting.hasEmptySpace,
  }

  const positiveMeasures = [
    artifact.imageSize?.width,
    artifact.imageSize?.height,
    artifact.zoom,
    artifact.basisRect.width,
    artifact.basisRect.height,
    artifact.outerRect.width,
    artifact.outerRect.height,
    artifact.box.width,
    artifact.box.height,
    artifact.boundingRect.width,
    artifact.boundingRect.height,
    artifact.localFrameRect.width,
    artifact.localFrameRect.height,
    artifact.contentSourceRect.width,
    artifact.contentSourceRect.height,
    artifact.visibleSourceRect.width,
    artifact.visibleSourceRect.height,
    artifact.renderedContentRect.width,
    artifact.renderedContentRect.height,
    artifact.destinationRect.width,
    artifact.destinationRect.height,
    artifact.clipRect.width,
    artifact.clipRect.height,
    artifact.sourcePixelsPerLayoutUnit,
  ]
  if (!hasOnlyOperationalNumbers(artifact) ||
      positiveMeasures.some((value) =>
        typeof value !== 'number' || !isOperationalPositiveNumber(value))) {
    return Object.freeze({
      status: 'unavailable',
      reason: 'numeric-result-invalid',
    })
  }

  return Object.freeze({ status: 'resolved', artifact: freezeArtifact(artifact) })
}
