import type {
  AdditionalArtworkFrame,
  AdditionalArtworkFrameShape,
  AdditionalArtworkFrameStyle,
  AdditionalArtworkMetalPattern,
  AdditionalArtworkMetalProfile,
  AdditionalArtworkMetalType,
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
export const ADDITIONAL_ARTWORK_FRAME_METAL_DEPTH_MIN = 0
export const ADDITIONAL_ARTWORK_FRAME_METAL_DEPTH_MAX = 100
export const ADDITIONAL_ARTWORK_FRAME_METAL_BEVEL_WIDTH_MIN = 0
export const ADDITIONAL_ARTWORK_FRAME_METAL_BEVEL_WIDTH_MAX = 100
export const ADDITIONAL_ARTWORK_FRAME_METAL_BRUSH_ANGLE_MIN = 0
export const ADDITIONAL_ARTWORK_FRAME_METAL_BRUSH_ANGLE_MAX = 180
export const ADDITIONAL_ARTWORK_FRAME_METAL_POLISH_MIN = 0
export const ADDITIONAL_ARTWORK_FRAME_METAL_POLISH_MAX = 100
export const ADDITIONAL_ARTWORK_FRAME_METAL_TARNISH_MIN = 0
export const ADDITIONAL_ARTWORK_FRAME_METAL_TARNISH_MAX = 100
export const ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_SCALE_MIN = 20
export const ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_SCALE_MAX = 200
export const ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_STRENGTH_MIN = 0
export const ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_STRENGTH_MAX = 100

export const DEFAULT_ADDITIONAL_ARTWORK_FRAME: AdditionalArtworkFrame = {
  enabled: false,
  color: '#f9fafb',
  width: 2,
  shape: 'rectangle',
  style: 'solid',
  lumpiness: 50,
  jaggedness: 50,
  roughnessOffset: 0,
  metalType: 'steel',
  metalProfile: 'raised',
  metalPattern: 'none',
  metalDepth: 55,
  metalBevelWidth: 55,
  metalBrushAngle: 0,
  metalPolish: 65,
  metalTarnish: 10,
  metalPatternScale: 100,
  metalPatternStrength: 45,
}

function isAdditionalArtworkFrameShape(
  value: unknown,
): value is AdditionalArtworkFrameShape {
  return value === 'rectangle' || value === 'circle'
}

function isAdditionalArtworkFrameStyle(
  value: unknown,
): value is AdditionalArtworkFrameStyle {
  return value === 'solid' || value === 'rocky' || value === 'metal'
}

function isAdditionalArtworkMetalType(
  value: unknown,
): value is AdditionalArtworkMetalType {
  return value === 'steel' ||
    value === 'chrome' ||
    value === 'gunmetal' ||
    value === 'brass' ||
    value === 'bronze' ||
    value === 'gold' ||
    value === 'copper' ||
    value === 'blackIron'
}

function isAdditionalArtworkMetalProfile(
  value: unknown,
): value is AdditionalArtworkMetalProfile {
  return value === 'flat' ||
    value === 'raised' ||
    value === 'inset' ||
    value === 'double' ||
    value === 'rounded' ||
    value === 'stepped'
}

function isAdditionalArtworkMetalPattern(
  value: unknown,
): value is AdditionalArtworkMetalPattern {
  return value === 'none' ||
    value === 'rivets' ||
    value === 'engraved' ||
    value === 'hammered' ||
    value === 'brushed'
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
    metalType: isAdditionalArtworkMetalType(frame?.metalType)
      ? frame.metalType
      : defaults.metalType,
    metalProfile: isAdditionalArtworkMetalProfile(frame?.metalProfile)
      ? frame.metalProfile
      : defaults.metalProfile,
    metalPattern: isAdditionalArtworkMetalPattern(frame?.metalPattern)
      ? frame.metalPattern
      : defaults.metalPattern,
    metalDepth: normalizeFrameNumber(
      frame?.metalDepth,
      defaults.metalDepth,
      ADDITIONAL_ARTWORK_FRAME_METAL_DEPTH_MIN,
      ADDITIONAL_ARTWORK_FRAME_METAL_DEPTH_MAX,
    ),
    metalBevelWidth: normalizeFrameNumber(
      frame?.metalBevelWidth,
      defaults.metalBevelWidth,
      ADDITIONAL_ARTWORK_FRAME_METAL_BEVEL_WIDTH_MIN,
      ADDITIONAL_ARTWORK_FRAME_METAL_BEVEL_WIDTH_MAX,
    ),
    metalBrushAngle: normalizeFrameNumber(
      frame?.metalBrushAngle,
      defaults.metalBrushAngle,
      ADDITIONAL_ARTWORK_FRAME_METAL_BRUSH_ANGLE_MIN,
      ADDITIONAL_ARTWORK_FRAME_METAL_BRUSH_ANGLE_MAX,
    ),
    metalPolish: normalizeFrameNumber(
      frame?.metalPolish,
      defaults.metalPolish,
      ADDITIONAL_ARTWORK_FRAME_METAL_POLISH_MIN,
      ADDITIONAL_ARTWORK_FRAME_METAL_POLISH_MAX,
    ),
    metalTarnish: normalizeFrameNumber(
      frame?.metalTarnish,
      defaults.metalTarnish,
      ADDITIONAL_ARTWORK_FRAME_METAL_TARNISH_MIN,
      ADDITIONAL_ARTWORK_FRAME_METAL_TARNISH_MAX,
    ),
    metalPatternScale: normalizeFrameNumber(
      frame?.metalPatternScale,
      defaults.metalPatternScale,
      ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_SCALE_MIN,
      ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_SCALE_MAX,
    ),
    metalPatternStrength: normalizeFrameNumber(
      frame?.metalPatternStrength,
      defaults.metalPatternStrength,
      ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_STRENGTH_MIN,
      ADDITIONAL_ARTWORK_FRAME_METAL_PATTERN_STRENGTH_MAX,
    ),
  }
}
