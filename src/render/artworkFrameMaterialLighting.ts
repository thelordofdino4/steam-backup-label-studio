export type ArtworkFrameMaterialLightVector = {
  x: number
  y: number
  z: number
}

export type ArtworkFrameMaterialLightEditorPosition = {
  x: number
  y: number
}

export const ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR:
  ArtworkFrameMaterialLightVector = {
    x: 0,
    y: 0,
    z: 1,
  }

const LIGHT_VECTOR_EPSILON = 0.000001
const HALF_PI = Math.PI / 2

export function normalizeArtworkFrameMaterialLightVector(
  vector: ArtworkFrameMaterialLightVector,
): ArtworkFrameMaterialLightVector {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  }
}

function clampMaterialLightUnit(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}

function formatMaterialLightNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(6) : '0.000000'
}

export function createArtworkFrameMaterialHemisphereLightVector(
  position: ArtworkFrameMaterialLightEditorPosition,
): ArtworkFrameMaterialLightVector {
  const x = Number.isFinite(position.x) ? position.x : 0
  const y = Number.isFinite(position.y) ? position.y : 0
  const radius = Math.hypot(x, y)

  if (radius <= LIGHT_VECTOR_EPSILON) {
    return { x: 0, y: 0, z: 1 }
  }

  const clampedRadius = clampMaterialLightUnit(radius)
  const inclination = clampedRadius * HALF_PI
  const horizontalLength = Math.sin(inclination)

  return normalizeArtworkFrameMaterialLightVector({
    x: (x / radius) * horizontalLength,
    y: (y / radius) * horizontalLength,
    z: Math.cos(inclination),
  })
}

export function getArtworkFrameMaterialHemisphereLightEditorPosition(
  vector: ArtworkFrameMaterialLightVector,
): ArtworkFrameMaterialLightEditorPosition {
  const normalized = normalizeArtworkFrameMaterialLightVector(vector)
  const horizontalLength = Math.hypot(normalized.x, normalized.y)

  if (horizontalLength <= LIGHT_VECTOR_EPSILON) {
    return { x: 0, y: 0 }
  }

  const inclination = Math.acos(clampMaterialLightUnit(normalized.z))
  const radius = clampMaterialLightUnit(inclination / HALF_PI)

  return {
    x: (normalized.x / horizontalLength) * radius,
    y: (normalized.y / horizontalLength) * radius,
  }
}

export function resolveArtworkFrameMaterialLightVector(
  lightVector: ArtworkFrameMaterialLightVector | null | undefined,
): ArtworkFrameMaterialLightVector {
  if (
    lightVector &&
    Number.isFinite(lightVector.x) &&
    Number.isFinite(lightVector.y) &&
    Number.isFinite(lightVector.z)
  ) {
    const normalized =
      normalizeArtworkFrameMaterialLightVector(lightVector)

    if (
      Math.hypot(normalized.x, normalized.y, normalized.z) >
        LIGHT_VECTOR_EPSILON
    ) {
      return normalized
    }
  }

  return ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR
}

export function getArtworkFrameMaterialLightVectorKey(
  vector: ArtworkFrameMaterialLightVector | null | undefined,
) {
  if (!vector) {
    return 'no-material-light-vector'
  }

  return [
    formatMaterialLightNumber(vector.x),
    formatMaterialLightNumber(vector.y),
    formatMaterialLightNumber(vector.z),
  ].join(',')
}
