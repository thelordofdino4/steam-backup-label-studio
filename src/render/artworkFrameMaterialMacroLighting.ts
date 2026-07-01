import {
  resolveArtworkFrameMaterialLightVector,
  type ArtworkFrameMaterialLightVector,
} from './artworkFrameMaterialLighting.ts'

export type ArtworkFrameMaterialMacroLightingPosition = {
  x: number
  y: number
}

export type ArtworkFrameMaterialMacroLightingFactors = {
  farShadowRamp: number
  grazingStrength: number
  macroDiffuse: number
  macroShadow: number
  nearLightRamp: number
}

export type ArtworkFrameMaterialMacroLightingInput = {
  aspectRatio?: number | null
  lightVector: ArtworkFrameMaterialLightVector | null | undefined
  /**
   * Normalized visual frame-space position. X points right, Y points up.
   */
  position: ArtworkFrameMaterialMacroLightingPosition
}

export type ArtworkFrameMaterialMacroLightingMaterialPointInput = {
  frameBounds: {
    height: number
    width: number
  }
  frameCenter: {
    x: number
    y: number
  }
  materialPoint: {
    x: number
    y: number
  }
}

const MACRO_LIGHT_EPSILON = 0.000001

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function smoothStep(min: number, max: number, value: number) {
  if (min === max) {
    return value >= max ? 1 : 0
  }

  const unit = clampNumber((value - min) / (max - min), 0, 1)
  return unit * unit * (3 - 2 * unit)
}

function getFiniteNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function getClampedPosition(position: ArtworkFrameMaterialMacroLightingPosition) {
  return {
    x: clampNumber(getFiniteNumber(position.x, 0), -1, 1),
    y: clampNumber(getFiniteNumber(position.y, 0), -1, 1),
  }
}

export function getArtworkFrameMaterialMacroLightingPositionFromMaterialPoint({
  frameBounds,
  frameCenter,
  materialPoint,
}: ArtworkFrameMaterialMacroLightingMaterialPointInput):
  ArtworkFrameMaterialMacroLightingPosition {
  const halfFrameWidth = Math.max(1, getFiniteNumber(frameBounds.width, 1) / 2)
  const halfFrameHeight = Math.max(
    1,
    getFiniteNumber(frameBounds.height, 1) / 2,
  )
  const centerX = getFiniteNumber(frameCenter.x, 0)
  const centerY = getFiniteNumber(frameCenter.y, 0)

  return {
    x: clampNumber(
      (getFiniteNumber(materialPoint.x, centerX) - centerX) / halfFrameWidth,
      -1,
      1,
    ),
    y: clampNumber(
      (centerY - getFiniteNumber(materialPoint.y, centerY)) /
        halfFrameHeight,
      -1,
      1,
    ),
  }
}

function getAspectScales(aspectRatio: number | null | undefined) {
  const aspect = typeof aspectRatio === 'number' &&
      Number.isFinite(aspectRatio) &&
      aspectRatio > 0
    ? clampNumber(aspectRatio, 0.01, 100)
    : 1

  return {
    x: aspect >= 1 ? aspect : 1,
    y: aspect >= 1 ? 1 : 1 / aspect,
  }
}

export function getArtworkFrameMaterialMacroLightingFactors({
  aspectRatio,
  lightVector,
  position,
}: ArtworkFrameMaterialMacroLightingInput): ArtworkFrameMaterialMacroLightingFactors {
  const light = resolveArtworkFrameMaterialLightVector(lightVector)
  const horizontalLightLength = Math.hypot(light.x, light.y)
  const grazingStrength = smoothStep(0.08, 0.96, horizontalLightLength)

  if (grazingStrength <= MACRO_LIGHT_EPSILON) {
    return {
      farShadowRamp: 0,
      grazingStrength: 0,
      macroDiffuse: 1,
      macroShadow: 0,
      nearLightRamp: 0,
    }
  }

  const clampedPosition = getClampedPosition(position)
  const aspectScales = getAspectScales(aspectRatio)
  const shadowDirectionX = light.x / horizontalLightLength
  const shadowDirectionY = light.y / horizontalLightLength
  const litDirectionX = -shadowDirectionX
  const litDirectionY = -shadowDirectionY
  const scaledX = clampedPosition.x * aspectScales.x
  const scaledY = clampedPosition.y * aspectScales.y
  const maxProjection = Math.hypot(
    litDirectionX * aspectScales.x,
    litDirectionY * aspectScales.y,
  )
  const directionalPosition = maxProjection > MACRO_LIGHT_EPSILON
    ? clampNumber(
      (scaledX * litDirectionX + scaledY * litDirectionY) /
        maxProjection,
      -1,
      1,
    )
    : 0
  const nearLightRamp = smoothStep(-0.2, 1, directionalPosition) *
    grazingStrength
  const farShadowRamp = (1 - smoothStep(-1, 0.2, directionalPosition)) *
    grazingStrength
  const macroDiffuse = clampNumber(
    1 + nearLightRamp * 0.22 - farShadowRamp * 0.08,
    0.72,
    1.28,
  )
  const macroShadow = clampNumber(
    farShadowRamp * (0.2 + grazingStrength * 0.28),
    0,
    0.52,
  )

  return {
    farShadowRamp,
    grazingStrength,
    macroDiffuse,
    macroShadow,
    nearLightRamp,
  }
}
