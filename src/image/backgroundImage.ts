import { clampNumber } from '../disc/geometry.ts'
import { clampDiscPresetScaleControlValue } from '../editor/discPresetScaleControlRange.ts'
import type { BackgroundImageSize, BackgroundOffset } from '../project/projectTypes'
import type { RenderPixelPoint, RenderPixelRect } from '../render/imageRenderArtifact.ts'
import { getImageContentSize } from './imageContentBounds.ts'

export const DEFAULT_BACKGROUND_SCALE = 1
export const BACKGROUND_SCALE_MIN = 0.1
export const BACKGROUND_SCALE_MAX = 2
const BACKGROUND_OFFSET_SLIDER_STEP = 0.1

export type BackgroundOffsetField = keyof BackgroundOffset

export type BackgroundOffsetSliderRanges = {
  x: {
    min: number
    max: number
  }
  y: {
    min: number
    max: number
  }
}

export type BackgroundImageState = {
  imageUrl: string | null
  imageSize: BackgroundImageSize | null
  scale: number
  offset: BackgroundOffset
}

// Coordinates are untransformed Disc preview pixels, never viewport/screen pixels.
// The background's editable region intentionally remains the entire Disc surface.
export type BackgroundImageLayout = Readonly<{
  coordinateSize: number
  contentRect: Readonly<RenderPixelRect>
  interactionRect: Readonly<RenderPixelRect>
  clip: Readonly<{ center: Readonly<RenderPixelPoint>; radius: number }>
}>

export function resolveBackgroundImageLayout(
  imageSize: BackgroundImageSize | null,
  scale: number,
  offset: BackgroundOffset,
  coordinateSize: number,
): BackgroundImageLayout {
  const size = Number.isFinite(coordinateSize) && coordinateSize > 0 ? coordinateSize : 0
  const drawSize = getBackgroundDrawSize(imageSize, scale, size)
  return Object.freeze({
    coordinateSize: size,
    contentRect: Object.freeze({
      x: (size - drawSize.width) / 2 + offset.x,
      y: (size - drawSize.height) / 2 + offset.y,
      ...drawSize,
    }),
    interactionRect: Object.freeze({ x: 0, y: 0, width: size, height: size }),
    clip: Object.freeze({
      center: Object.freeze({ x: size / 2, y: size / 2 }),
      radius: size / 2,
    }),
  })
}

// Only a uniform unit conversion and output origin belong to an adapter. No
// fitting, centering, content-bound interpretation, or viewport state is repeated.
export function projectBackgroundImageLayout(
  layout: BackgroundImageLayout,
  outputSize: number,
  origin: Readonly<RenderPixelPoint> = { x: 0, y: 0 },
): BackgroundImageLayout {
  const size = Number.isFinite(outputSize) && outputSize > 0 ? outputSize : 0
  const ratio = layout.coordinateSize > 0 ? size / layout.coordinateSize : 0
  const projectRect = (rect: Readonly<RenderPixelRect>) => Object.freeze({
    x: origin.x + rect.x * ratio,
    y: origin.y + rect.y * ratio,
    width: rect.width * ratio,
    height: rect.height * ratio,
  })
  return Object.freeze({
    coordinateSize: size,
    contentRect: projectRect(layout.contentRect),
    interactionRect: projectRect(layout.interactionRect),
    clip: Object.freeze({
      center: Object.freeze({
        x: origin.x + layout.clip.center.x * ratio,
        y: origin.y + layout.clip.center.y * ratio,
      }),
      radius: layout.clip.radius * ratio,
    }),
  })
}

export function createDefaultBackgroundOffset(): BackgroundOffset {
  return { x: 0, y: 0 }
}

export function createEmptyBackgroundImageState(): BackgroundImageState {
  return {
    imageUrl: null,
    imageSize: null,
    scale: DEFAULT_BACKGROUND_SCALE,
    offset: createDefaultBackgroundOffset(),
  }
}

export function createSelectedBackgroundImageState(
  imageUrl: string,
  imageSize: BackgroundImageSize,
): BackgroundImageState {
  return {
    imageUrl,
    imageSize,
    scale: DEFAULT_BACKGROUND_SCALE,
    offset: createDefaultBackgroundOffset(),
  }
}

export function updateBackgroundScale(
  value: number,
  currentScale = DEFAULT_BACKGROUND_SCALE,
) {
  return clampDiscPresetScaleControlValue({
    value,
    currentScale,
    nominalMin: BACKGROUND_SCALE_MIN,
    nominalMax: BACKGROUND_SCALE_MAX,
  })
}

function normalizeSliderRangeValue(value: number) {
  const normalizedValue = Number(value.toFixed(4))

  return Object.is(normalizedValue, -0) ? 0 : normalizedValue
}

function getBackgroundCoverSize(
  imageSize: BackgroundImageSize | null,
  previewSize: number,
) {
  const size = Number.isFinite(previewSize) && previewSize > 0 ? previewSize : 0

  if (imageSize) {
    const contentSize = getImageContentSize(imageSize)

    if (!contentSize || size <= 0) {
      return {
        width: 0,
        height: 0,
      }
    }

    const aspectRatio = contentSize.width / contentSize.height

    if (aspectRatio >= 1) {
      return {
        width: aspectRatio * size,
        height: size,
      }
    }

    return {
      width: size,
      height: (1 / aspectRatio) * size,
    }
  }

  if (size <= 0) {
    return {
      width: size,
      height: size,
    }
  }

  return {
    width: size,
    height: size,
  }
}

export function getBackgroundDrawSize(
  imageSize: BackgroundImageSize | null,
  scale: number,
  previewSize: number,
) {
  const coverSize = getBackgroundCoverSize(imageSize, previewSize)
  const drawScale = Number.isFinite(scale) ? Math.max(0, scale) : DEFAULT_BACKGROUND_SCALE

  return {
    width: coverSize.width * drawScale,
    height: coverSize.height * drawScale,
  }
}

function normalizeBackgroundOffsetRange(halfTravel: number) {
  const boundedHalfTravel = Number.isFinite(halfTravel)
    ? Math.max(0, halfTravel)
    : 0

  return {
    min: normalizeSliderRangeValue(
      Math.ceil((-boundedHalfTravel) / BACKGROUND_OFFSET_SLIDER_STEP) *
      BACKGROUND_OFFSET_SLIDER_STEP,
    ),
    max: normalizeSliderRangeValue(
      Math.floor(boundedHalfTravel / BACKGROUND_OFFSET_SLIDER_STEP) *
      BACKGROUND_OFFSET_SLIDER_STEP,
    ),
  }
}

export function getBackgroundOffsetSliderRanges(
  imageSize: BackgroundImageSize | null,
  scale: number,
  previewSize: number,
): BackgroundOffsetSliderRanges {
  const layout = resolveBackgroundImageLayout(imageSize, scale, { x: 0, y: 0 }, previewSize)

  return {
    x: normalizeBackgroundOffsetRange((layout.interactionRect.width + layout.contentRect.width) / 2),
    y: normalizeBackgroundOffsetRange((layout.interactionRect.height + layout.contentRect.height) / 2),
  }
}

export function clampBackgroundOffsetToImageBounds(
  offset: BackgroundOffset,
  imageSize: BackgroundImageSize | null,
  scale: number,
  previewSize: number,
): BackgroundOffset {
  const ranges = getBackgroundOffsetSliderRanges(imageSize, scale, previewSize)

  return {
    x: clampNumber(offset.x, ranges.x.min, ranges.x.max),
    y: clampNumber(offset.y, ranges.y.min, ranges.y.max),
  }
}

export function updateBackgroundOffsetField(
  offset: BackgroundOffset,
  field: BackgroundOffsetField,
  value: number,
  imageSize: BackgroundImageSize | null,
  scale: number,
  previewSize: number,
): BackgroundOffset {
  return clampBackgroundOffsetToImageBounds(
    {
      ...offset,
      [field]: value,
    },
    imageSize,
    scale,
    previewSize,
  )
}
