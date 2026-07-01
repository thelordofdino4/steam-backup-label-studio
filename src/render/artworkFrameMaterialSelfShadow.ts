import type { ArtworkFrameMaterialLightVector } from './artworkFrameMaterialLighting.ts'

export type ArtworkFrameMaterialHeightSelfShadowInput = {
  heightMap: Float32Array
  heightPixels: number
  lightVector: ArtworkFrameMaterialLightVector
  maskMap?: Float32Array | null
  maxSteps?: number
  strength?: number
  widthPixels: number
  x: number
  y: number
}

export type ArtworkFrameMaterialHeightSelfShadowMapInput = Omit<
  ArtworkFrameMaterialHeightSelfShadowInput,
  'x' | 'y'
>

export type ArtworkFrameMaterialHeightSelfShadowMacroInput = {
  farShadowRamp: number
  grazingStrength: number
}

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

function isActiveMask(maskMap: Float32Array | null | undefined, index: number) {
  return !maskMap || (maskMap[index] ?? 0) > 0
}

export function getArtworkFrameMaterialHeightSelfShadow({
  heightMap,
  heightPixels,
  lightVector,
  maskMap = null,
  maxSteps = 4,
  strength = 1,
  widthPixels,
  x,
  y,
}: ArtworkFrameMaterialHeightSelfShadowInput) {
  const index = y * widthPixels + x

  if (!isActiveMask(maskMap, index)) {
    return 0
  }

  const horizontalLength = Math.hypot(lightVector.x, lightVector.y)

  if (horizontalLength <= 0.000001) {
    return 0
  }

  const directionalStrength = smoothStep(0.08, 0.96, horizontalLength)

  if (directionalStrength <= 0.000001) {
    return 0
  }

  const shadowSideX = lightVector.x / horizontalLength
  const shadowSideY = lightVector.y / horizontalLength
  const sampleSteps = Math.max(
    1,
    Math.min(maxSteps, Math.ceil(1 + directionalStrength * (maxSteps - 1))),
  )
  const currentHeight = heightMap[index] ?? 0
  const slopeClearanceBase =
    Math.max(0, lightVector.z) / Math.max(0.08, horizontalLength)
  let shadow = 0

  for (let step = 1; step <= sampleSteps; step += 1) {
    // Light vectors are visual frame-space control vectors: x right, y up,
    // and the handle side is the shadow side. Height occlusion is found by
    // sampling back toward the lit side, converted into raster y-down space.
    const sampleX = Math.round(x - shadowSideX * step)
    const sampleY = Math.round(y + shadowSideY * step)

    if (
      sampleX < 0 ||
      sampleX >= widthPixels ||
      sampleY < 0 ||
      sampleY >= heightPixels
    ) {
      continue
    }

    const sampleIndex = sampleY * widthPixels + sampleX

    if (!isActiveMask(maskMap, sampleIndex)) {
      continue
    }

    const sampleHeight = heightMap[sampleIndex] ?? currentHeight
    const clearance = 0.006 + slopeClearanceBase * step * 0.022
    const occluderHeight = sampleHeight - currentHeight - clearance
    const distanceFade = 1 - (step - 1) / (sampleSteps + 1)
    const sampleShadow = smoothStep(0.002, 0.08, occluderHeight) *
      distanceFade

    shadow = Math.max(shadow, sampleShadow)
  }

  return clampNumber(shadow * directionalStrength * strength, 0, 0.42)
}

export function getArtworkFrameMaterialHeightSelfShadowMacroMultiplier({
  farShadowRamp,
  grazingStrength,
}: ArtworkFrameMaterialHeightSelfShadowMacroInput) {
  const farSide = clampNumber(farShadowRamp, 0, 1)
  const grazing = clampNumber(grazingStrength, 0, 1)

  return clampNumber(1 + farSide * (0.12 + grazing * 0.24), 1, 1.36)
}

export function buildArtworkFrameMaterialHeightSelfShadowMap(
  input: ArtworkFrameMaterialHeightSelfShadowMapInput,
) {
  const shadows = new Float32Array(input.widthPixels * input.heightPixels)

  for (let y = 0; y < input.heightPixels; y += 1) {
    for (let x = 0; x < input.widthPixels; x += 1) {
      shadows[y * input.widthPixels + x] =
        getArtworkFrameMaterialHeightSelfShadow({
          ...input,
          x,
          y,
        })
    }
  }

  return shadows
}
