import type {
  AdditionalArtworkFrame,
  AdditionalArtworkFrameShape,
  AdditionalArtworkFrameStyle,
} from './projectTypes'

export type AdditionalArtworkFrameField = keyof AdditionalArtworkFrame

export const ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN = 0.25
export const ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX = 8
export const ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN = 0
export const ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX = 100
export const ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN = 0
export const ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX = 100
export const ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN = 0
export const ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX = 100

export const DEFAULT_ADDITIONAL_ARTWORK_FRAME: AdditionalArtworkFrame = {
  enabled: false,
  color: '#f9fafb',
  width: 2,
  shape: 'rectangle',
  style: 'solid',
  lumpiness: 50,
  jaggedness: 50,
  roughnessOffset: 0,
}

function isAdditionalArtworkFrameShape(
  value: unknown,
): value is AdditionalArtworkFrameShape {
  return value === 'rectangle' || value === 'circle'
}

function isAdditionalArtworkFrameStyle(
  value: unknown,
): value is AdditionalArtworkFrameStyle {
  return value === 'solid' || value === 'rocky'
}

function asFrameRecord(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Partial<AdditionalArtworkFrame>
    : null
}

function normalizeFrameNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

export function normalizeAdditionalArtworkFrame(
  value: unknown,
  defaults: AdditionalArtworkFrame = DEFAULT_ADDITIONAL_ARTWORK_FRAME,
): AdditionalArtworkFrame {
  const frame = asFrameRecord(value)
  const width = normalizeFrameNumber(
    frame?.width,
    defaults.width,
    ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN,
    ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
  )

  return {
    enabled:
      typeof frame?.enabled === 'boolean'
        ? frame.enabled
        : defaults.enabled,
    color:
      typeof frame?.color === 'string' && frame.color.trim()
        ? frame.color
        : defaults.color,
    width,
    shape: isAdditionalArtworkFrameShape(frame?.shape)
      ? frame.shape
      : defaults.shape,
    style: isAdditionalArtworkFrameStyle(frame?.style)
      ? frame.style
      : defaults.style,
    lumpiness: normalizeFrameNumber(
      frame?.lumpiness,
      defaults.lumpiness,
      ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN,
      ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX,
    ),
    jaggedness: normalizeFrameNumber(
      frame?.jaggedness,
      defaults.jaggedness,
      ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN,
      ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX,
    ),
    roughnessOffset: normalizeFrameNumber(
      frame?.roughnessOffset,
      defaults.roughnessOffset,
      ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN,
      ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX,
    ),
  }
}
