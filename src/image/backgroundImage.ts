import { clampNumber } from '../disc/geometry.ts'
import type { BackgroundImageSize, BackgroundOffset } from '../project/projectTypes'

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

export function updateBackgroundScale(value: number) {
  return clampNumber(value, BACKGROUND_SCALE_MIN, BACKGROUND_SCALE_MAX)
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

  if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0 || size <= 0) {
    return {
      width: size,
      height: size,
    }
  }

  const aspectRatio = imageSize.width / imageSize.height

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
  const size = Number.isFinite(previewSize) && previewSize > 0 ? previewSize : 0
  const drawSize = getBackgroundDrawSize(imageSize, scale, size)

  return {
    x: normalizeBackgroundOffsetRange((size + drawSize.width) / 2),
    y: normalizeBackgroundOffsetRange((size + drawSize.height) / 2),
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

export function getBackgroundPreviewSize(
  imageSize: BackgroundImageSize | null,
) {
  if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
    return {
      width: '100%',
      height: '100%',
    }
  }

  const aspectRatio = imageSize.width / imageSize.height

  if (aspectRatio >= 1) {
    return {
      width: `${aspectRatio * 100}%`,
      height: '100%',
    }
  }

  return {
    width: '100%',
    height: `${(1 / aspectRatio) * 100}%`,
  }
}
