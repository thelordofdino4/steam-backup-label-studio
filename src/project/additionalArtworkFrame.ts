import type {
  AdditionalArtworkFrame,
  AdditionalArtworkFrameShape,
} from './projectTypes'

export type AdditionalArtworkFrameField = keyof AdditionalArtworkFrame

export const ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN = 0.25
export const ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX = 8

export const DEFAULT_ADDITIONAL_ARTWORK_FRAME: AdditionalArtworkFrame = {
  enabled: false,
  color: '#f9fafb',
  width: 2,
  shape: 'rectangle',
}

function isAdditionalArtworkFrameShape(
  value: unknown,
): value is AdditionalArtworkFrameShape {
  return value === 'rectangle' || value === 'circle'
}

function asFrameRecord(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Partial<AdditionalArtworkFrame>
    : null
}

export function normalizeAdditionalArtworkFrame(
  value: unknown,
  defaults: AdditionalArtworkFrame = DEFAULT_ADDITIONAL_ARTWORK_FRAME,
): AdditionalArtworkFrame {
  const frame = asFrameRecord(value)
  const width =
    typeof frame?.width === 'number' && Number.isFinite(frame.width)
      ? Math.min(
          ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
          Math.max(ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN, frame.width),
        )
      : defaults.width

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
  }
}
