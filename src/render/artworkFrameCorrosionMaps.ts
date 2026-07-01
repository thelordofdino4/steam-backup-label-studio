import {
  getArtworkFrameCorrosionSampleCoordinates,
  type ArtworkFrameCorrosionField,
} from './artworkFrameCorrosionField.ts'
import {
  resolveArtworkFrameMaterialLightVector,
  type ArtworkFrameMaterialLightVector,
} from './artworkFrameMaterialLighting.ts'
import {
  getArtworkFrameMaterialMacroLightingFactors,
  getArtworkFrameMaterialMacroLightingPositionFromMaterialPoint,
  type ArtworkFrameMaterialMacroLightingFactors,
} from './artworkFrameMaterialMacroLighting.ts'
import {
  measureArtworkFrameMaterialPerformance,
  type ArtworkFrameMaterialPerformanceRecorder,
} from './artworkFrameMaterialPerformance.ts'
import {
  buildArtworkFrameMaterialHeightSelfShadowMap,
  getArtworkFrameMaterialHeightSelfShadowMacroMultiplier,
} from './artworkFrameMaterialSelfShadow.ts'
import type { ArtworkFrameMaterialShadingCoordinateContext } from './artworkFrameMaterialShading.ts'
import type { ArtworkFrameSteelFinishDerivedMaps } from './artworkFrameSteelFinish.ts'

type RgbUnit = readonly [number, number, number]

export type ArtworkFrameCorrosionDerivedMaps = {
  albedo: Float32Array
  ambientOcclusion: Float32Array
  crackMask: Float32Array
  flakeBodyMask: Float32Array
  flakeCastShadow: Float32Array
  flakeCurlX: Float32Array
  flakeCurlY: Float32Array
  flakeLiftHeight: Float32Array
  flakeLipMask: Float32Array
  flakeMask: Float32Array
  flakeRootMask: Float32Array
  flakeUndercutAO: Float32Array
  height: Float32Array
  metalExposure: Float32Array
  normalX: Float32Array
  normalY: Float32Array
  normalZ: Float32Array
  poreMask: Float32Array
  roughness: Float32Array
  heightPixels: number
  widthPixels: number
}

export type ArtworkFrameCorrosionShadingOptions = {
  coordinates?: ArtworkFrameMaterialShadingCoordinateContext | null
  lightVector: ArtworkFrameMaterialLightVector
  normalStrength?: number
  performance?: ArtworkFrameMaterialPerformanceRecorder | null
  steelFinishMaps?: ArtworkFrameSteelFinishDerivedMaps | null
}

export type ArtworkFrameCorrosionDerivedMapOptions = {
  performance?: ArtworkFrameMaterialPerformanceRecorder | null
}

const ACTIVE_ORANGE: RgbUnit = [0.74, 0.29, 0.08]
const YOUNG_RUST: RgbUnit = [0.58, 0.18, 0.06]
const OLD_RUST: RgbUnit = [0.31, 0.15, 0.07]
const DARK_OXIDE: RgbUnit = [0.09, 0.075, 0.06]
const BLACK_IRON_RUST_BIAS: RgbUnit = [0.07, 0.062, 0.055]
const CORROSION_NORMAL_HEIGHT_STRENGTH = 2.5
const CORROSION_NORMAL_FLAKE_CURL_STRENGTH = 0.38
const NEUTRAL_CORROSION_MACRO_LIGHTING: ArtworkFrameMaterialMacroLightingFactors = {
  farShadowRamp: 0,
  grazingStrength: 0,
  macroDiffuse: 1,
  macroShadow: 0,
  nearLightRamp: 0,
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

function interpolate(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function mixRgb(a: RgbUnit, b: RgbUnit, t: number): RgbUnit {
  const unit = clampNumber(t, 0, 1)

  return [
    interpolate(a[0], b[0], unit),
    interpolate(a[1], b[1], unit),
    interpolate(a[2], b[2], unit),
  ]
}

function hashUnit(seed: number, x: number, y = 0) {
  let hash = seed >>> 0
  hash ^= Math.imul(x + 0x9e3779b9, 0x85ebca6b)
  hash ^= Math.imul(y + 0xc2b2ae35, 0x27d4eb2f)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x2c1b3c6d)
  hash ^= hash >>> 12
  hash = Math.imul(hash, 0x297a2d39)
  hash ^= hash >>> 15

  return (hash >>> 0) / 4294967295
}

function valueNoise2d(seed: number, x: number, y: number, frequency: number) {
  const scaledX = x * frequency
  const scaledY = y * frequency
  const ix = Math.floor(scaledX)
  const iy = Math.floor(scaledY)
  const fx = scaledX - ix
  const fy = scaledY - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hashUnit(seed, ix, iy)
  const b = hashUnit(seed, ix + 1, iy)
  const c = hashUnit(seed, ix, iy + 1)
  const d = hashUnit(seed, ix + 1, iy + 1)

  return interpolate(interpolate(a, b, ux), interpolate(c, d, ux), uy)
}

function fractalNoise2d(seed: number, x: number, y: number) {
  const low = valueNoise2d(seed, x, y, 3.5)
  const mid = valueNoise2d(seed + 97, x, y, 10.5)
  const high = valueNoise2d(seed + 211, x, y, 31)

  return low * 0.48 + mid * 0.34 + high * 0.18
}

function crackNetworkField(seed: number, x: number, y: number) {
  const broad = valueNoise2d(seed, x * 1.15, y * 1.15, 7.4)
  const branch = valueNoise2d(seed + 151, x * 1.9 + broad * 0.12, y * 1.9, 12.8)
  const ridge = 1 - smoothStep(0.018, 0.09, Math.abs(broad - branch))
  const breakup = valueNoise2d(seed + 283, x, y, 24)

  return ridge * smoothStep(0.36, 0.78, breakup)
}

function seedSpeckleField(
  seed: number,
  xUnit: number,
  yUnit: number,
  attractor: number,
) {
  const pixelSpark = valueNoise2d(
    seed,
    xUnit + attractor * 0.015,
    yUnit - attractor * 0.012,
    96,
  )
  const subPixelSpark = valueNoise2d(
    seed + 31,
    xUnit + pixelSpark * 0.01,
    yUnit - pixelSpark * 0.01,
    192,
  )
  const localBreakup = valueNoise2d(seed + 59, xUnit, yUnit, 72)
  const attractorGate = smoothStep(0.05, 0.42, attractor)
  const activation = attractor * 0.64 + pixelSpark * 0.25 +
    localBreakup * 0.11
  const core = smoothStep(0.57, 0.91, activation) *
    (0.28 + attractorGate * 0.72)
  const pin = smoothStep(0.9, 0.99, subPixelSpark + attractor * 0.18) *
    (0.2 + attractorGate * 0.8)

  return clampNumber(core * (0.7 + subPixelSpark * 0.4) + pin * 0.55, 0, 1)
}

function youngRustClusterField(
  seed: number,
  xUnit: number,
  yUnit: number,
  attractor: number,
  populationUnit: number,
) {
  const basin = valueNoise2d(seed, xUnit + attractor * 0.04, yUnit, 8.5)
  const cellular = valueNoise2d(
    seed + 43,
    xUnit + basin * 0.08,
    yUnit - basin * 0.05,
    24,
  )
  const fineCells = valueNoise2d(
    seed + 89,
    xUnit + attractor * 0.03,
    yUnit + basin * 0.04,
    58,
  )
  const freckleSpark = valueNoise2d(
    seed + 131,
    xUnit + cellular * 0.03,
    yUnit - basin * 0.02,
    96,
  )
  const basinGate = smoothStep(
    0.28 - populationUnit * 0.06,
    0.84,
    basin * 0.44 + attractor * 0.56,
  )
  const threshold = 0.78 - populationUnit * 0.22
  const clusteredDots = smoothStep(
    threshold,
    0.98,
    attractor * 0.48 +
      cellular * 0.26 +
      fineCells * 0.16 +
      freckleSpark * 0.1,
  )
  const satelliteDots = smoothStep(
    0.86 - populationUnit * 0.18,
    0.995,
    attractor * 0.4 +
      fineCells * 0.23 +
      freckleSpark * 0.37,
  )

  return clampNumber(
    (clusteredDots * 0.78 + satelliteDots * 0.34) *
      (0.32 + basinGate * 0.68),
    0,
    1,
  )
}

function patchBasinField(
  seed: number,
  xUnit: number,
  yUnit: number,
  moisture: number,
  pitCenter: number,
  potential: number,
  protectedMetal: number,
  populationUnit: number,
) {
  const basin = valueNoise2d(
    seed,
    xUnit + moisture * 0.08,
    yUnit - potential * 0.06,
    5.6,
  )
  const cellular = valueNoise2d(
    seed + 67,
    xUnit + basin * 0.12,
    yUnit + moisture * 0.08,
    15,
  )
  const brokenBoundary = valueNoise2d(
    seed + 139,
    xUnit + cellular * 0.05,
    yUnit - basin * 0.04,
    39,
  )
  const attractor = clampNumber(
    moisture * 0.34 +
      potential * 0.34 +
      pitCenter * 0.22 +
      basin * 0.2 +
      cellular * 0.18 -
      protectedMetal * 0.3,
    0,
    1,
  )
  const body = smoothStep(
    0.48 - populationUnit * 0.18,
    0.9,
    attractor * 0.58 + basin * 0.26 + cellular * 0.16,
  )
  const brokenMask = smoothStep(
    0.2,
    0.78,
    brokenBoundary * 0.7 + attractor * 0.22 + populationUnit * 0.08,
  )

  return clampNumber(body * (0.38 + brokenMask * 0.62), 0, 1)
}

function scaleCrustField(
  seed: number,
  xUnit: number,
  yUnit: number,
  moisture: number,
  pitCenter: number,
  potential: number,
  coverage: number,
  protectedMetal: number,
  populationUnit: number,
) {
  const basin = valueNoise2d(
    seed,
    xUnit + moisture * 0.12,
    yUnit - potential * 0.1,
    4.4,
  )
  const cellular = valueNoise2d(
    seed + 79,
    xUnit + basin * 0.18,
    yUnit + moisture * 0.12,
    12.5,
  )
  const brokenCrust = valueNoise2d(
    seed + 151,
    xUnit + cellular * 0.08,
    yUnit - basin * 0.06,
    31,
  )
  const attractor = clampNumber(
    coverage * 0.38 +
      moisture * 0.26 +
      potential * 0.26 +
      pitCenter * 0.22 +
      basin * 0.18 +
      cellular * 0.18 -
      protectedMetal * 0.2,
    0,
    1,
  )
  const crust = smoothStep(
    0.34 - populationUnit * 0.16,
    0.9,
    attractor * 0.58 + basin * 0.2 + cellular * 0.22,
  )
  const breakup = smoothStep(
    0.2,
    0.82,
    brokenCrust * 0.72 + attractor * 0.2 + populationUnit * 0.08,
  )

  return clampNumber(crust * (0.46 + breakup * 0.54), 0, 1)
}

function flakeLipField(
  seed: number,
  xUnit: number,
  yUnit: number,
  scaleCrust: number,
  crack: number,
  potential: number,
  moisture: number,
  protectedMetal: number,
  populationUnit: number,
) {
  const peelBasin = valueNoise2d(
    seed,
    xUnit + moisture * 0.1,
    yUnit - potential * 0.08,
    7.2,
  )
  const tornA = valueNoise2d(
    seed + 83,
    xUnit + peelBasin * 0.1,
    yUnit - scaleCrust * 0.08,
    13.5,
  )
  const tornB = valueNoise2d(
    seed + 167,
    xUnit - peelBasin * 0.08,
    yUnit + crack * 0.12,
    18.5,
  )
  const tornEdge = 1 - smoothStep(0.018, 0.085, Math.abs(tornA - tornB))
  const branching = crackNetworkField(
    seed + 251,
    xUnit + tornA * 0.06,
    yUnit - tornB * 0.06,
  )
  const jaggedness = valueNoise2d(
    seed + 337,
    xUnit + branching * 0.04,
    yUnit - tornEdge * 0.04,
    48,
  )
  const liftGate = smoothStep(
    0.36 - populationUnit * 0.12,
    0.92,
    scaleCrust * 0.44 +
      crack * 0.24 +
      potential * 0.22 +
      moisture * 0.14 +
      peelBasin * 0.14 -
      protectedMetal * 0.14,
  )

  return clampNumber(
    (tornEdge * 0.72 + branching * 0.28) *
      liftGate *
      (0.42 + jaggedness * 0.58),
    0,
    1,
  )
}

type LiftedFlakePlateGeometry = {
  body: number
  castShadow: number
  curlAngle: number
  curlStrength: number
  lip: number
  root: number
  undercut: number
}

function liftedFlakePlateGeometry(
  seed: number,
  xUnit: number,
  yUnit: number,
  scaleCrust: number,
  crack: number,
  potential: number,
  moisture: number,
  protectedMetal: number,
  populationUnit: number,
): LiftedFlakePlateGeometry {
  const plateBasin = valueNoise2d(
    seed,
    xUnit + moisture * 0.11,
    yUnit - potential * 0.09,
    5.8,
  )
  const plateCell = valueNoise2d(
    seed + 79,
    xUnit + plateBasin * 0.12,
    yUnit - scaleCrust * 0.08,
    11.4,
  )
  const tornA = valueNoise2d(
    seed + 157,
    xUnit + plateCell * 0.12,
    yUnit - crack * 0.08,
    16.6,
  )
  const tornB = valueNoise2d(
    seed + 233,
    xUnit - plateBasin * 0.1,
    yUnit + crack * 0.13,
    22.5,
  )
  const tornBoundary = 1 - smoothStep(0.016, 0.078, Math.abs(tornA - tornB))
  const brokenSurface = valueNoise2d(
    seed + 311,
    xUnit + tornBoundary * 0.05,
    yUnit - plateCell * 0.05,
    39,
  )
  const edgeBreakup = valueNoise2d(
    seed + 389,
    xUnit + brokenSurface * 0.04,
    yUnit - tornBoundary * 0.04,
    71,
  )
  const plateAttractor = clampNumber(
    scaleCrust * 0.38 +
      crack * 0.24 +
      potential * 0.2 +
      moisture * 0.18 +
      plateBasin * 0.18 +
      plateCell * 0.14 -
      protectedMetal * 0.16,
    0,
    1,
  )
  const plateMass = smoothStep(
    0.34 - populationUnit * 0.12,
    0.88,
    plateAttractor,
  ) * populationUnit
  const fracturedInterior = smoothStep(
    0.22,
    0.88,
    brokenSurface * 0.5 +
      plateCell * 0.22 +
      crack * 0.16 +
      scaleCrust * 0.12,
  )
  const body = clampNumber(
    plateMass * (0.48 + fracturedInterior * 0.52),
    0,
    1,
  )
  const rootSelector = valueNoise2d(
    seed + 461,
    xUnit + plateBasin * 0.13,
    yUnit - plateCell * 0.1,
    12.4,
  )
  const root = body *
    smoothStep(
      0.42,
      0.86,
      rootSelector * 0.38 +
        scaleCrust * 0.34 +
        (1 - crack) * 0.16 +
        protectedMetal * 0.12,
    ) *
    (1 - tornBoundary * 0.72)
  const freeEdgeGate = smoothStep(
    0.26,
    0.9,
    edgeBreakup * 0.42 +
      crack * 0.22 +
      moisture * 0.16 +
      potential * 0.12 +
      plateBasin * 0.08,
  )
  const plateLip = tornBoundary * body * freeEdgeGate * (1 - root * 0.68)
  const crackLip = crack * body *
    smoothStep(
      0.38,
      0.86,
      edgeBreakup * 0.42 + tornBoundary * 0.28 + plateCell * 0.18,
    ) *
    (0.16 + populationUnit * 0.24)
  const lip = clampNumber(plateLip + crackLip, 0, 1)
  const undercut = lip *
    smoothStep(
      0.14,
      0.78,
      crack * 0.28 +
        scaleCrust * 0.22 +
        moisture * 0.18 +
        plateBasin * 0.16 +
        edgeBreakup * 0.16,
    ) *
    (0.42 + populationUnit * 0.58)
  const castShadow = clampNumber(
    undercut * (0.72 + lip * 0.2) + crackLip * 0.16,
    0,
    1,
  )
  const curlAngle = valueNoise2d(
    seed + 547,
    xUnit + lip * 0.04,
    yUnit - undercut * 0.04,
    8.7,
  ) * Math.PI * 2
  const curlStrength = clampNumber(
    lip * (0.46 + undercut * 0.44 + crackLip * 0.1),
    0,
    1,
  )

  return {
    body,
    castShadow,
    curlAngle,
    curlStrength,
    lip,
    root,
    undercut,
  }
}

function advancedScaleField(
  seed: number,
  xUnit: number,
  yUnit: number,
  coverage: number,
  moisture: number,
  pitCenter: number,
  potential: number,
  protectedMetal: number,
  scaleCrust: number,
  flakeLips: number,
  populationUnit: number,
) {
  const broadBasin = valueNoise2d(
    seed,
    xUnit + moisture * 0.14,
    yUnit - potential * 0.11,
    3.2,
  )
  const cellularMass = valueNoise2d(
    seed + 97,
    xUnit + broadBasin * 0.16,
    yUnit + moisture * 0.1,
    8.8,
  )
  const brokenSurface = valueNoise2d(
    seed + 181,
    xUnit + cellularMass * 0.12,
    yUnit - broadBasin * 0.09,
    27,
  )
  const attractor = clampNumber(
    coverage * 0.42 +
      moisture * 0.24 +
      potential * 0.24 +
      pitCenter * 0.18 +
      scaleCrust * 0.22 +
      broadBasin * 0.2 +
      cellularMass * 0.18 +
      flakeLips * 0.12 -
      protectedMetal * 0.2,
    0,
    1,
  )
  const substrate = smoothStep(
    0.18 - populationUnit * 0.08,
    0.84,
    attractor,
  )
  const openCrust = smoothStep(
    0.22,
    0.88,
    brokenSurface * 0.48 +
      cellularMass * 0.24 +
      pitCenter * 0.16 +
      flakeLips * 0.12,
  )

  return clampNumber(substrate * (0.44 + openCrust * 0.56), 0, 1)
}

function getScalarMapSample(
  values: Float32Array,
  widthPixels: number,
  heightPixels: number,
  x: number,
  y: number,
  fallback: number,
) {
  const clampedX = Math.round(clampNumber(x, 0, widthPixels - 1))
  const clampedY = Math.round(clampNumber(y, 0, heightPixels - 1))

  return values[clampedY * widthPixels + clampedX] ?? fallback
}

function writeCorrosionNormalMaps({
  flakeCurlX,
  flakeCurlY,
  flakeLiftHeight,
  flakeLipMask,
  flakeUndercutAO,
  frameMask,
  height,
  heightPixels,
  normalX,
  normalY,
  normalZ,
  widthPixels,
}: {
  flakeCurlX: Float32Array
  flakeCurlY: Float32Array
  flakeLiftHeight: Float32Array
  flakeLipMask: Float32Array
  flakeUndercutAO: Float32Array
  frameMask: Float32Array
  height: Float32Array
  heightPixels: number
  normalX: Float32Array
  normalY: Float32Array
  normalZ: Float32Array
  widthPixels: number
}) {
  for (let y = 0; y < heightPixels; y += 1) {
    for (let x = 0; x < widthPixels; x += 1) {
      const index = y * widthPixels + x

      if ((frameMask[index] ?? 0) <= 0) {
        normalX[index] = 0
        normalY[index] = 0
        normalZ[index] = 1
        continue
      }

      const left = getScalarMapSample(
        height,
        widthPixels,
        heightPixels,
        x - 1,
        y,
        0.5,
      )
      const right = getScalarMapSample(
        height,
        widthPixels,
        heightPixels,
        x + 1,
        y,
        0.5,
      )
      const up = getScalarMapSample(
        height,
        widthPixels,
        heightPixels,
        x,
        y - 1,
        0.5,
      )
      const down = getScalarMapSample(
        height,
        widthPixels,
        heightPixels,
        x,
        y + 1,
        0.5,
      )
      const gradientX = (right - left) * CORROSION_NORMAL_HEIGHT_STRENGTH
      const gradientY = (down - up) * CORROSION_NORMAL_HEIGHT_STRENGTH
      const curlPresence = clampNumber(
        (flakeLiftHeight[index] ?? 0) * 2.2 +
          (flakeLipMask[index] ?? 0) * 0.32 +
          (flakeUndercutAO[index] ?? 0) * 0.16,
        0,
        1,
      )
      const curlX = (flakeCurlX[index] ?? 0) *
        curlPresence *
        CORROSION_NORMAL_FLAKE_CURL_STRENGTH
      const curlY = (flakeCurlY[index] ?? 0) *
        curlPresence *
        CORROSION_NORMAL_FLAKE_CURL_STRENGTH
      const xComponent = -gradientX + curlX
      const yComponent = -gradientY + curlY
      const zComponent = 1
      const normalLength =
        Math.hypot(xComponent, yComponent, zComponent) || 1

      normalX[index] = xComponent / normalLength
      normalY[index] = yComponent / normalLength
      normalZ[index] = zComponent / normalLength
    }
  }
}

function resolveCorrosionLightVector(
  options: Pick<ArtworkFrameCorrosionShadingOptions, 'lightVector'>,
): ArtworkFrameMaterialLightVector {
  return resolveArtworkFrameMaterialLightVector(options.lightVector)
}

function getCorrosionMacroLightingPosition({
  coordinates,
  index,
  width,
}: {
  coordinates: ArtworkFrameMaterialShadingCoordinateContext
  index: number
  width: number
}) {
  const x = index % width
  const y = Math.floor(index / width)
  const materialX = coordinates.samplingBounds.x +
    (x + 0.5) * coordinates.materialPixelSize.x
  const materialY = coordinates.samplingBounds.y +
    (y + 0.5) * coordinates.materialPixelSize.y

  return getArtworkFrameMaterialMacroLightingPositionFromMaterialPoint({
    frameBounds: coordinates.frameBounds,
    frameCenter: coordinates.frameCenter,
    materialPoint: {
      x: materialX,
      y: materialY,
    },
  })
}

export function buildArtworkFrameCorrosionDerivedMaps(
  field: ArtworkFrameCorrosionField,
  options: ArtworkFrameCorrosionDerivedMapOptions = {},
): ArtworkFrameCorrosionDerivedMaps {
  const widthPixels = field.fieldSize.width
  const heightPixels = field.fieldSize.height
  const length = widthPixels * heightPixels
  const albedo = new Float32Array(length * 3)
  const ambientOcclusion = new Float32Array(length)
  const crackMask = new Float32Array(length)
  const flakeBodyMask = new Float32Array(length)
  const flakeCastShadow = new Float32Array(length)
  const flakeCurlX = new Float32Array(length)
  const flakeCurlY = new Float32Array(length)
  const flakeLiftHeight = new Float32Array(length)
  const flakeLipMask = new Float32Array(length)
  const flakeMask = new Float32Array(length)
  const flakeRootMask = new Float32Array(length)
  const flakeUndercutAO = new Float32Array(length)
  const height = new Float32Array(length)
  const metalExposure = new Float32Array(length)
  const normalX = new Float32Array(length)
  const normalY = new Float32Array(length)
  const normalZ = new Float32Array(length)
  const poreMask = new Float32Array(length)
  const roughness = new Float32Array(length)
  const stage = field.stageUnits
  const polishUnit = clampNumber(field.frame.metalPolish / 100, 0, 1)
  const blackIronOxideUnit = field.frame.metalType === 'blackIron' ? 1 : 0
  const roughMetalUnit = 1 - smoothStep(0.22, 0.92, polishUnit)
  const rustStageWeight = clampNumber(
    stage.seed * 0.18 +
      stage.young * 0.34 +
      stage.patch * 0.54 +
      stage.scale * 0.76 +
      stage.flake * 0.9 +
      stage.advanced,
    0,
    1,
  )

  measureArtworkFrameMaterialPerformance(
    options.performance,
    'corrosion-derived-maps',
    () => {
  for (let y = 0; y < heightPixels; y += 1) {
    for (let x = 0; x < widthPixels; x += 1) {
      const { xUnit, yUnit } =
        getArtworkFrameCorrosionSampleCoordinates(field, x, y)
      const index = y * widthPixels + x
      const rgbIndex = index * 3
      const mask = field.fields.frameMask[index] ?? 0
      const edge = field.fields.edgeExposure[index] ?? 0
      const defect = field.fields.defectExposure[index] ?? 0
      const moisture = field.fields.moistureBasins[index] ?? 0
      const pitCenter = field.fields.cellularPitCenters[index] ?? 0
      const protectedMetal = field.fields.protectedMetalIslands[index] ?? 0
      const potential = field.fields.corrosionPotential[index] ?? 0
      const coverage = field.fields.stageCoverage[index] ?? 0
      const grain = fractalNoise2d(field.geometrySeed + 1301, xUnit, yUnit)
      const crust = fractalNoise2d(
        field.geometrySeed + 1451,
        xUnit * 1.7 + potential * 0.08,
        yUnit * 1.7,
      )
      const finePores = valueNoise2d(
        field.geometrySeed + 1601,
        xUnit + defect * 0.05,
        yUnit + moisture * 0.05,
        42,
      )
      const youngPopulationUnit = smoothStep(0.16, 0.29, field.tarnishUnit)
      const youngSeedReplacementUnit = smoothStep(
        0.3,
        0.42,
        field.tarnishUnit,
      )
      const seedMaturationFade = 1 - smoothStep(0.18, 0.3, field.tarnishUnit) *
        0.45
      const seedMaturationUnit = stage.seed * seedMaturationFade
      const seedIgnitionBoostUnit = 1 -
        smoothStep(0.18, 0.3, field.tarnishUnit) * 0.55
      const lateYoungBasinUnit = smoothStep(0.27, 0.39, field.tarnishUnit) *
        (1 - stage.scale * 0.6) *
        (1 - stage.advanced * 0.8)
      const patchPopulationUnit = Math.max(
        smoothStep(0.36, 0.55, field.tarnishUnit),
        lateYoungBasinUnit * 0.68,
      )
      const latePatchCoalescenceUnit = (1 - blackIronOxideUnit) *
        smoothStep(0.46, 0.5, field.tarnishUnit) *
        (1 - stage.scale * 0.8) *
        (1 - stage.advanced)
      const scalePopulationUnit = smoothStep(0.54, 0.72, field.tarnishUnit)
      const flakePopulationUnit = smoothStep(0.7, 0.89, field.tarnishUnit)
      const advancedPopulationUnit = smoothStep(0.86, 1, field.tarnishUnit)
      const matureScaleOxideUnit = 1 - smoothStep(0.68, 0.76, field.tarnishUnit)
      const liftedScaleReliefUnit = smoothStep(0.72, 0.86, field.tarnishUnit) *
        (1 - advancedPopulationUnit * 0.18)
      const contourFade = 1 - advancedPopulationUnit
      const seedOnlyUnit = seedMaturationUnit *
        (1 - stage.young * 0.58) *
        (1 - youngSeedReplacementUnit * 0.72) *
        (1 - stage.patch * 0.72) *
        (1 - stage.scale * 0.86) *
        (1 - protectedMetal * 0.38) *
        (0.9 - stage.seed * 0.1)
      const seedAttractor = clampNumber(
        edge * 0.36 +
          defect * 0.28 +
          pitCenter * 0.24 +
          potential * 0.22 +
          moisture * 0.1 -
          protectedMetal * 0.18,
        0,
        1,
      ) * mask
      const seedSpeckles = seedOnlyUnit * seedSpeckleField(
        field.geometrySeed + 1217,
        xUnit,
        yUnit,
        seedAttractor,
      ) * mask
      const seedPitAo = seedOnlyUnit * smoothStep(
        0.66,
        0.995,
        valueNoise2d(field.geometrySeed + 1277, xUnit, yUnit, 128) * 0.36 +
          pitCenter * 0.34 +
          defect * 0.17 +
          edge * 0.13 +
          potential * 0.1,
      ) * (0.32 + pitCenter * 0.38) * mask
      const seedOxidation = clampNumber(
        seedSpeckles * (0.92 + stage.seed * 0.46) +
          seedPitAo * (0.26 + stage.seed * 0.14),
        0,
        1,
      )
      const seedRustBody = clampNumber(
        seedSpeckles * (0.44 + stage.seed * 0.28) +
          smoothStep(
            0.055,
            0.2,
            seedOxidation + seedPitAo * 0.36,
          ) * (0.28 + stage.seed * 0.74),
        0,
        1,
      )
      const youngOnlyUnit = youngPopulationUnit *
        (1 - stage.patch * 0.54) *
        (1 - stage.scale * 0.72) *
        (1 - stage.advanced * 0.84) *
        (1 - protectedMetal * 0.34)
      const youngAttractor = clampNumber(
        seedAttractor * 0.44 +
          edge * 0.18 +
          defect * 0.24 +
          pitCenter * 0.3 +
          potential * 0.34 +
          moisture * 0.22 -
          protectedMetal * 0.2,
        0,
        1,
      ) * mask
      const youngClusters = youngOnlyUnit * youngRustClusterField(
        field.geometrySeed + 1357,
        xUnit,
        yUnit,
        youngAttractor,
        youngPopulationUnit,
      ) * mask
      const youngPitAo = youngOnlyUnit * smoothStep(
        0.56 - youngPopulationUnit * 0.12,
        0.96,
        youngClusters * 0.46 +
          pitCenter * 0.26 +
          defect * 0.14 +
          edge * 0.1 +
          valueNoise2d(field.geometrySeed + 1423, xUnit, yUnit, 112) * 0.12,
      ) * (0.2 + pitCenter * 0.34 + youngClusters * 0.68) * mask
      const patchRaw = patchPopulationUnit * patchBasinField(
        field.geometrySeed + 1531,
        xUnit,
        yUnit,
        moisture,
        pitCenter,
        potential,
        protectedMetal,
        patchPopulationUnit,
      ) * mask
      const patchBody = smoothStep(
        0.055 - lateYoungBasinUnit * 0.018,
        0.64,
        patchRaw,
      ) * mask
      const patchCenter = smoothStep(
        0.42,
        0.9,
        patchRaw * 0.78 + crust * 0.22,
      ) * patchBody
      const patchRim = smoothStep(0.08, 0.54, patchRaw) *
        (1 - smoothStep(0.66, 0.96, patchRaw)) *
        (0.56 + finePores * 0.44) *
        contourFade *
        mask
      const patchPinholes = patchBody * smoothStep(
        0.78 - patchPopulationUnit * 0.06,
        0.99,
        protectedMetal * 0.34 +
          finePores * 0.24 +
          valueNoise2d(field.geometrySeed + 1663, xUnit, yUnit, 66) * 0.22 +
          valueNoise2d(field.geometrySeed + 1667, xUnit, yUnit, 144) * 0.2,
      ) * (0.16 + patchPopulationUnit * 0.36) * mask
      const scaleCrust = (stage.scale * 0.34 + scalePopulationUnit * 0.66) *
        scaleCrustField(
          field.geometrySeed + 1711,
          xUnit,
          yUnit,
          moisture,
          pitCenter,
          potential,
          coverage,
          protectedMetal,
          scalePopulationUnit,
        ) * mask
      const scaleUnderlayer = scaleCrust * smoothStep(
        0.34,
        0.9,
        moisture * 0.28 +
          pitCenter * 0.24 +
          crust * 0.28 +
          valueNoise2d(field.geometrySeed + 1733, xUnit, yUnit, 18) * 0.2,
      )
      const scaleGranules = scaleCrust * smoothStep(
        0.38 - scalePopulationUnit * 0.06,
        0.96,
          finePores * 0.22 +
          valueNoise2d(field.geometrySeed + 1747, xUnit, yUnit, 84) * 0.34 +
          valueNoise2d(field.geometrySeed + 1753, xUnit, yUnit, 147) * 0.2 +
          valueNoise2d(field.geometrySeed + 1759, xUnit, yUnit, 168) * 0.24,
      ) * (0.42 + scalePopulationUnit * 0.58)
      const scaleMicroPores = scaleCrust * smoothStep(
        0.4 - scalePopulationUnit * 0.08,
        0.94,
        pitCenter * 0.26 +
          finePores * 0.24 +
          valueNoise2d(field.geometrySeed + 1763, xUnit, yUnit, 58) * 0.3 +
          valueNoise2d(field.geometrySeed + 1769, xUnit, yUnit, 132) * 0.2,
      ) * (0.56 + scalePopulationUnit * 0.66)
      const rawScaleCracks = crackNetworkField(
        field.geometrySeed + 1781,
        xUnit + scaleCrust * 0.04,
        yUnit - scaleUnderlayer * 0.04,
      ) * scaleCrust *
        smoothStep(0.32, 0.84, potential + moisture * 0.34 + scaleCrust * 0.28) *
        (0.18 + scalePopulationUnit * 0.54)
      const scaleCracks = rawScaleCracks * (0.16 + contourFade * 0.84)
      const scaleExposedIslands = scaleCrust * smoothStep(
        0.74 - scalePopulationUnit * 0.08,
        0.98,
          protectedMetal * 0.38 +
          valueNoise2d(field.geometrySeed + 1793, xUnit, yUnit, 26) * 0.24 +
          valueNoise2d(field.geometrySeed + 1799, xUnit, yUnit, 71) * 0.18 +
          valueNoise2d(field.geometrySeed + 1807, xUnit, yUnit, 96) * 0.2 -
          scaleUnderlayer * 0.12,
      ) * (0.12 + scalePopulationUnit * 0.26)
      const flakeLips = clampNumber(
        flakePopulationUnit * flakeLipField(
          field.geometrySeed + 1811,
          xUnit,
          yUnit,
          scaleCrust,
          scaleCracks,
          potential,
          moisture,
          protectedMetal,
          flakePopulationUnit,
        ) * (1.45 + flakePopulationUnit * 0.55),
        0,
        1,
      ) * mask
      const flakeBranchCracks = crackNetworkField(
        field.geometrySeed + 1823,
        xUnit + flakeLips * 0.08,
        yUnit - scaleCrust * 0.05,
      ) * scaleCrust *
        smoothStep(0.26, 0.84, scaleCracks + flakeLips * 0.72 + potential * 0.2) *
        flakePopulationUnit *
        (0.44 + flakePopulationUnit * 0.56)
      const flakeUndercut = flakeLips *
        smoothStep(
          0.2,
          0.86,
          scaleUnderlayer * 0.32 +
            scaleCracks * 0.28 +
            flakeBranchCracks * 0.26 +
            valueNoise2d(field.geometrySeed + 1831, xUnit, yUnit, 33) * 0.14,
        ) *
        (0.44 + flakePopulationUnit * 0.56)
      const freshSteelChips = smoothStep(
        0.08,
        0.32,
        flakeLips * (0.74 + flakePopulationUnit * 0.18) +
          flakeUndercut * 0.26 +
          flakeBranchCracks * 0.1 +
          protectedMetal * 0.06 +
          valueNoise2d(field.geometrySeed + 1847, xUnit, yUnit, 42) * 0.06 +
          valueNoise2d(field.geometrySeed + 1861, xUnit, yUnit, 132) * 0.04,
      ) * flakePopulationUnit * clampNumber(
        0.22 + flakePopulationUnit * 0.42 + flakeLips * 0.72,
        0,
        1,
      )
      const advancedScale = advancedPopulationUnit * advancedScaleField(
        field.geometrySeed + 1873,
        xUnit,
        yUnit,
        coverage,
        moisture,
        pitCenter,
        potential,
        protectedMetal,
        scaleCrust,
        flakeLips,
        advancedPopulationUnit,
      ) * mask
      const advancedGranules = advancedScale * smoothStep(
        0.25 - advancedPopulationUnit * 0.04,
        0.92,
          finePores * 0.18 +
          valueNoise2d(field.geometrySeed + 1889, xUnit, yUnit, 118) * 0.3 +
          valueNoise2d(field.geometrySeed + 1901, xUnit, yUnit, 231) * 0.2 +
          valueNoise2d(field.geometrySeed + 1907, xUnit, yUnit, 176) * 0.32,
      ) * (0.6 + advancedPopulationUnit * 0.4)
      const advancedMicroPores = advancedScale * smoothStep(
        0.32 - advancedPopulationUnit * 0.08,
        0.94,
        pitCenter * 0.18 +
          finePores * 0.22 +
          valueNoise2d(field.geometrySeed + 1913, xUnit, yUnit, 72) * 0.28 +
          valueNoise2d(field.geometrySeed + 1919, xUnit, yUnit, 165) * 0.18 +
          valueNoise2d(field.geometrySeed + 1931, xUnit, yUnit, 144) * 0.18,
      ) * (0.62 + advancedPopulationUnit * 0.38)
      const advancedCavities = advancedScale * smoothStep(
        0.42 - advancedPopulationUnit * 0.06,
        0.96,
        advancedMicroPores * 0.34 +
          crackNetworkField(
            field.geometrySeed + 1949,
            xUnit + advancedScale * 0.06,
            yUnit - moisture * 0.05,
          ) * 0.22 +
          valueNoise2d(field.geometrySeed + 1957, xUnit, yUnit, 39) * 0.24 +
          pitCenter * 0.2,
      ) * (0.58 + advancedPopulationUnit * 0.42)
      const advancedFlakeRelief = advancedScale * flakeLipField(
        field.geometrySeed + 1973,
        xUnit + advancedCavities * 0.04,
        yUnit - advancedGranules * 0.03,
        clampNumber(scaleCrust + advancedScale * 0.54, 0, 1),
        clampNumber(scaleCracks + advancedCavities * 0.44, 0, 1),
        potential,
        moisture,
        protectedMetal,
        advancedPopulationUnit,
      ) * (0.34 + advancedPopulationUnit * 0.66)
      const residualSteelFlecks = advancedScale * smoothStep(
        0.78,
        0.99,
        protectedMetal * 0.22 +
          edge * 0.12 +
          valueNoise2d(field.geometrySeed + 1987, xUnit, yUnit, 96) * 0.28 +
          valueNoise2d(field.geometrySeed + 1993, xUnit, yUnit, 181) * 0.16 +
          valueNoise2d(field.geometrySeed + 1997, xUnit, yUnit, 160) * 0.28 -
          advancedCavities * 0.12,
      ) * (0.16 + advancedPopulationUnit * 0.26)
      const growthPresence = clampNumber(
        coverage *
          (stage.young * 0.16 + stage.patch * 0.7 + stage.scale * 0.9 +
            stage.flake * 0.96 + stage.advanced) +
          youngClusters * (0.78 + youngPopulationUnit * 0.32) +
          youngPitAo * 0.3 +
          patchBody * (0.56 + patchPopulationUnit * 0.3) +
          scaleCrust * (0.78 + scalePopulationUnit * 0.22) +
          flakeLips * 0.32 +
          advancedScale * 0.84 +
          advancedGranules * 0.44,
        0,
        1,
      )
      const rustPresence = clampNumber(
        seedRustBody * 0.92 +
          seedOxidation * 1.12 +
          seedPitAo * 0.34 +
          youngClusters * 1.05 +
          youngPitAo * 0.56 +
          patchBody * 0.95 +
          patchRim * 0.42 +
          scaleCrust * 0.92 +
          scaleGranules * 0.35 +
          flakeLips * 0.34 +
          advancedScale * 0.88 +
          advancedGranules * 0.56 +
          advancedMicroPores * 0.2 +
          growthPresence * (0.34 + rustStageWeight * 0.8) +
          defect * stage.young * 0.08,
        0,
        1,
      ) * mask
      const pores = clampNumber(
        smoothStep(
          0.44 - stage.advanced * 0.1,
          0.92,
          pitCenter * 0.45 +
            defect * 0.22 +
            moisture * 0.12 +
            finePores * 0.18 +
            growthPresence * 0.22,
        ) * growthPresence *
          (0.24 + stage.young * 0.28 + stage.scale * 0.34 +
            stage.advanced * 0.34) +
          seedPitAo * 0.34 +
          youngPitAo * 0.42 +
          patchCenter * 0.18 +
          scaleMicroPores * 0.72 +
          scaleGranules * 0.18 +
          flakeUndercut * 0.22 +
          advancedMicroPores * 0.86 +
          advancedCavities * 0.62 +
          advancedGranules * 0.18,
        0,
        1,
      )
      const cracks = clampNumber(
        crackNetworkField(field.geometrySeed + 1801, xUnit, yUnit) *
        smoothStep(0.28, 0.86, potential + moisture * 0.34) *
        rustPresence *
        (stage.scale * 0.28 + stage.flake * 0.78 + stage.advanced * 0.18) *
        (0.34 + contourFade * 0.66) +
          scaleCracks +
          flakeBranchCracks * (0.48 + contourFade * 0.52) +
          advancedCavities * 0.24,
        0,
        1,
      )
      const flakeNoise = fractalNoise2d(
        field.geometrySeed + 2003,
        xUnit * 0.78 + cracks * 0.12,
        yUnit * 0.78,
      )
      const plateGeometry = liftedFlakePlateGeometry(
        field.geometrySeed + 2039,
        xUnit,
        yUnit,
        clampNumber(scaleCrust + advancedScale * 0.48, 0, 1),
        clampNumber(cracks + flakeBranchCracks * 0.36, 0, 1),
        potential,
        moisture,
        protectedMetal,
        clampNumber(flakePopulationUnit + advancedPopulationUnit * 0.42, 0, 1),
      )
      const looseFlakeBody = smoothStep(
        0.5,
        0.88,
        flakeNoise * 0.52 +
          cracks * 0.24 +
          flakeLips * 0.18 +
          edge * 0.12 +
          (1 - protectedMetal) * 0.12,
      ) * rustPresence * (stage.flake * 0.74 + stage.advanced * 0.28)
      const flakeBody = clampNumber(
        plateGeometry.body * rustPresence +
          looseFlakeBody * (0.18 + plateGeometry.body * 0.18),
        0,
        1,
      ) * mask
      const liftedFlakeLip = clampNumber(
        plateGeometry.lip * (1 + liftedScaleReliefUnit * 2.35) +
          flakeLips *
            (0.28 + plateGeometry.body * 0.22 + liftedScaleReliefUnit * 0.46) +
          advancedFlakeRelief * (0.5 + advancedPopulationUnit * 0.46),
        0,
        1,
      ) * mask
      const flakes = clampNumber(
        flakeBody + liftedFlakeLip + advancedFlakeRelief * 0.34,
        0,
        1,
      )
      const flakeRoot = clampNumber(
        plateGeometry.root * rustPresence +
          flakeBody *
            smoothStep(
              0.22,
              0.78,
              scaleCrust + scaleUnderlayer * 0.32 + advancedScale * 0.18,
            ) *
            (1 - liftedFlakeLip * 0.42),
        0,
        1,
      ) * mask
      const flakeCurlStrength = clampNumber(
        plateGeometry.curlStrength +
          liftedFlakeLip *
            (0.16 + flakeUndercut * 0.18 + flakeBranchCracks * 0.08),
        0,
        1,
      ) * mask
      const flakeCurlAngle = plateGeometry.curlAngle
      const flakeUndercutAOInput = clampNumber(
        plateGeometry.undercut * (1 + liftedScaleReliefUnit * 2.25) +
          flakeUndercut * (0.34 + liftedScaleReliefUnit * 0.5) +
          liftedFlakeLip *
            (
              0.16 +
              flakePopulationUnit * 0.12 +
              liftedScaleReliefUnit * 0.34
            ) +
          flakeBranchCracks * 0.14 +
          advancedFlakeRelief * advancedCavities * 0.12,
        0,
        1,
      ) * mask
      const flakeCastShadowInput = clampNumber(
        plateGeometry.castShadow * (1 + liftedScaleReliefUnit * 2.55) +
          flakeUndercutAOInput * (0.42 + liftedScaleReliefUnit * 0.62) +
          liftedFlakeLip * flakeBranchCracks * 0.28 +
          advancedFlakeRelief * advancedCavities * 0.18,
        0,
        1,
      ) * mask
      const exposedChips = clampNumber(
        smoothStep(
          0.58,
          0.9,
          valueNoise2d(field.geometrySeed + 2207, xUnit, yUnit, 33) * 0.46 +
            flakes * 0.48 +
            protectedMetal * 0.24,
        ) * (stage.flake * 0.34 + stage.advanced * 0.42) +
          freshSteelChips +
          residualSteelFlecks,
        0,
        1,
      )
      const chipHoleMask = clampNumber(
        exposedChips *
          (1 - liftedFlakeLip * 0.62) *
          (
            0.5 +
            flakeBody * 0.25 +
            flakeRoot * 0.2 +
            flakeUndercutAOInput * 0.18
          ),
        0,
        1,
      )
      const residualSteel = smoothStep(
        0.68,
        0.96,
        valueNoise2d(field.geometrySeed + 2309, xUnit, yUnit, 57) * 0.62 +
          edge * 0.18 +
          protectedMetal * 0.2,
      ) * stage.advanced * 0.14 + residualSteelFlecks
      const advancedExposedMetalDamping = 1 - advancedPopulationUnit * 0.52
      const residualSteelChipMetal = smoothStep(
        0.22,
        0.4,
        residualSteelFlecks,
      ) * (0.6 + polishUnit * 0.06) * advancedPopulationUnit
      const baseMetal = mask * clampNumber(
        1 -
          seedRustBody *
            (1 + stage.seed * 0.55 + seedIgnitionBoostUnit * 0.28) -
          seedOxidation *
            (0.74 + stage.seed * 0.3 + seedIgnitionBoostUnit * 0.2) -
          seedPitAo * 0.32 -
          youngClusters *
            (0.52 + youngPopulationUnit * 0.32 + lateYoungBasinUnit * 0.48) -
          youngPitAo * (0.34 + lateYoungBasinUnit * 0.16) -
          patchBody *
            (
              0.34 +
              patchPopulationUnit * 0.3 +
              patchPopulationUnit * patchPopulationUnit * 0.38 +
              lateYoungBasinUnit * 0.22 +
              latePatchCoalescenceUnit * 0.05
            ) -
          patchRim * (0.08 + patchPopulationUnit * 0.16) -
          patchCenter * 0.12 -
          scaleCrust * (0.36 + scalePopulationUnit * 0.28) -
          scaleUnderlayer * 0.18 -
          scaleMicroPores * 0.1 -
          blackIronOxideUnit *
            matureScaleOxideUnit *
            scalePopulationUnit *
            (
              scaleCrust * 0.7 +
              scaleUnderlayer * 0.7 +
              scaleMicroPores * 0.65
            ) -
          flakes * (0.24 + flakePopulationUnit * 0.24) -
          flakeUndercut * 0.16 -
          advancedScale * (0.62 + advancedPopulationUnit * 0.28) -
          advancedGranules * 0.22 -
          advancedMicroPores * 0.16 -
          advancedCavities * 0.26 -
          growthPresence * (0.5 + field.tarnishUnit * 0.4) +
          protectedMetal *
            (0.3 + polishUnit * 0.35) *
            (1 - stage.scale * (0.74 + scalePopulationUnit * 0.2)) +
          patchPinholes *
            (0.48 + polishUnit * 0.24) *
            (1 - patchPopulationUnit * patchPopulationUnit * 0.05) *
            (1 - scalePopulationUnit * 0.68) +
          scaleExposedIslands * (0.55 + polishUnit * 0.24) +
          chipHoleMask *
            (1.35 + polishUnit * 0.18) *
            advancedExposedMetalDamping +
          freshSteelChips *
            (0.38 + polishUnit * 0.12) *
            (1 - liftedFlakeLip * 0.62) *
            advancedExposedMetalDamping +
          residualSteel *
            (0.72 + polishUnit * 0.12) *
            advancedExposedMetalDamping,
        0,
        1,
      )
      const broadMetal = Math.max(
        baseMetal,
        chipHoleMask *
          (1.28 + polishUnit * 0.14) *
          advancedExposedMetalDamping,
        freshSteelChips *
          (0.32 + polishUnit * 0.08) *
          (1 - liftedFlakeLip * 0.62) *
          advancedExposedMetalDamping,
        residualSteelFlecks *
          (0.48 + polishUnit * 0.1) *
          advancedExposedMetalDamping,
        residualSteelChipMetal,
      )
      const residualChipThresholdMetal = advancedPopulationUnit *
        smoothStep(0.36, 0.5, broadMetal) *
        smoothStep(0.03, 0.22, pores + flakes * 0.28 + cracks * 0.42) *
        0.72
      const metal = mask * clampNumber(
        Math.max(broadMetal, residualChipThresholdMetal),
        0,
        1,
      )
      const raisedDeposit = rustPresence *
        (0.018 + stage.young * 0.08 + stage.patch * 0.16 +
          stage.scale * 0.24 + stage.advanced * 0.28) *
        (0.45 + moisture * 0.28 + crust * 0.27) +
        seedRustBody *
          (0.004 + stage.seed * 0.012) *
          (0.5 + edge * 0.18 + defect * 0.12 + pitCenter * 0.08) +
        seedOxidation *
          (0.006 + stage.seed * 0.02) *
          (0.56 + edge * 0.2 + defect * 0.14 + pitCenter * 0.1) +
        youngClusters *
          (0.032 + youngPopulationUnit * 0.08) *
          (0.62 + crust * 0.22 + moisture * 0.16) +
        patchBody *
          (0.04 +
            patchPopulationUnit * 0.12 +
            patchPopulationUnit * patchPopulationUnit * 1.2) *
          (0.54 + crust * 0.3 + moisture * 0.16) +
        patchRim * (0.016 + patchPopulationUnit * 0.032) +
        scaleCrust *
          (0.075 + scalePopulationUnit * 0.16) *
          (0.5 + crust * 0.28 + moisture * 0.22) +
        blackIronOxideUnit *
          matureScaleOxideUnit *
          scalePopulationUnit *
          scaleCrust *
          0.11 +
        scaleGranules * (0.018 + scalePopulationUnit * 0.045) +
        flakeLips *
          (0.1 + flakePopulationUnit * 0.22) *
          (0.6 + crust * 0.22 + moisture * 0.18) +
        advancedScale *
          (0.12 + advancedPopulationUnit * 0.16) *
          (0.42 + crust * 0.3 + moisture * 0.28) +
        advancedGranules * (0.03 + advancedPopulationUnit * 0.08)
      const flakeBodyHeight = flakeBody *
        (
          0.045 +
          stage.flake * 0.09 +
          liftedScaleReliefUnit * 0.08 +
          stage.advanced * 0.055
        ) *
        (0.68 + crust * 0.2 + moisture * 0.12)
      const flakeRootHeight = flakeRoot *
        (0.018 + stage.flake * 0.038 + stage.advanced * 0.026) *
        (0.74 + scaleCrust * 0.26)
      const flakeLipHeight = liftedFlakeLip *
        (
          2.35 +
          stage.flake * 1.35 +
          liftedScaleReliefUnit * 1.9 +
          stage.advanced * 0.48
        ) *
        (0.68 + crust * 0.2 + moisture * 0.12)
      const flakeHeightCavityMask = flakeUndercutAOInput *
        (1 - liftedFlakeLip * (0.86 - liftedScaleReliefUnit * 0.08))
      const flakeUndercutDepth = flakeHeightCavityMask *
        (
          0.09 +
          stage.flake * 0.105 +
          liftedScaleReliefUnit * 0.095 +
          stage.advanced * 0.055
        )
      const chipCutDepth = chipHoleMask *
        (0.34 + stage.flake * 0.22 + stage.advanced * 0.12) +
        freshSteelChips * (1 - liftedFlakeLip * 0.62) * 0.2
      const flakeSetbackMask = clampNumber(
          flakeBody * (1 - liftedFlakeLip * 0.58) +
          flakeRoot * 0.42 +
          liftedFlakeLip * 0.08 +
          advancedFlakeRelief * 0.18,
        0,
        1,
      )
      const flakeSubstrateSetback = clampNumber(
          flakeSetbackMask *
          (
            0.035 +
            stage.flake * 0.075 +
            liftedScaleReliefUnit * 0.055 +
            stage.advanced * 0.055
          ) +
          flakeHeightCavityMask *
            (0.06 + stage.flake * 0.08 + liftedScaleReliefUnit * 0.08),
        0,
        0.36,
      )
      const flakePositiveRelief = flakeBodyHeight + flakeRootHeight +
        flakeLipHeight
      const flakeReliefHeight = clampNumber(
        flakePositiveRelief - flakeSubstrateSetback,
        -0.1,
        0.64,
      ) * mask
      const flakeBodyInteriorSetback = flakeBody *
        (1 - liftedFlakeLip * 0.82) *
        (0.22 + stage.flake * 0.18 + stage.advanced * 0.08)
      const cavityDepth = pores * 0.22 +
        cracks * 0.2 +
        seedPitAo * 0.09 +
        youngPitAo * 0.08 +
        scaleMicroPores * 0.12 +
        scaleCracks * 0.14 +
        scaleUnderlayer * 0.04 +
        flakeUndercut * 0.12 +
        flakeUndercutDepth +
        advancedMicroPores * 0.14 +
        advancedCavities * 0.24 +
        chipCutDepth
      const mapHeight = mask * clampNumber(
        0.5 +
          raisedDeposit * (1 - flakes * 0.44 - flakeUndercutAOInput * 0.18) +
          flakeReliefHeight -
          flakeBodyInteriorSetback -
          cavityDepth -
          patchPinholes * 0.035,
        0,
        1,
      )
      const ao = mask * clampNumber(
          seedPitAo * 0.38 +
          seedRustBody * 0.12 +
          seedOxidation * 0.08 +
          youngClusters *
            (0.08 + lateYoungBasinUnit * 0.16 + patchPopulationUnit * 0.12) +
          youngPitAo * (0.58 + lateYoungBasinUnit * 0.36) +
          patchBody *
            (
              0.46 +
              patchPopulationUnit * 0.48 +
              patchPopulationUnit * patchPopulationUnit * 0.08 +
              patchPopulationUnit * patchPopulationUnit * patchPopulationUnit *
                blackIronOxideUnit * 0.12 +
              lateYoungBasinUnit * 0.32
            ) +
          patchRim *
            (0.72 + patchPopulationUnit * 0.75 + lateYoungBasinUnit * 0.4) +
          patchCenter * (0.62 + patchPopulationUnit * 0.42) +
          scaleUnderlayer * (0.4 + scalePopulationUnit * 0.65) +
          scaleMicroPores * (0.5 + scalePopulationUnit * 0.7) +
          scaleCracks * (0.64 + scalePopulationUnit * 0.9) +
          scaleGranules * (0.12 + scalePopulationUnit * 0.42) +
          flakeLips * 0.16 +
          flakeUndercut * 0.24 +
          flakeUndercutAOInput * 3.6 +
          flakeBranchCracks * 0.52 +
          exposedChips * 0.08 +
          advancedScale * 0.12 +
          advancedGranules * 0.16 +
          advancedMicroPores * 0.52 +
          advancedCavities * 0.74 +
          advancedFlakeRelief * 0.38 +
          blackIronOxideUnit *
            scalePopulationUnit *
            matureScaleOxideUnit *
            (1 - advancedPopulationUnit) *
            (
              scaleUnderlayer * 7 +
              scaleMicroPores * 6 +
              scaleCracks * 6 +
              scaleGranules * 3.5 +
              pores * 2
            ) +
          pores * 0.5 +
          cracks * 0.46 +
          flakes * 0.34 +
          growthPresence * (1 - metal) * (0.18 + stage.scale * 0.16),
        0,
        1,
      )
      const rustRoughness = clampNumber(
        0.2 +
          roughMetalUnit * 0.12 +
          seedRustBody * 0.34 +
          seedOxidation * 0.52 +
          seedPitAo * 0.2 +
          youngClusters * 0.54 +
          youngPitAo * 0.3 +
          patchBody * 0.32 +
          patchCenter * 0.16 -
          patchPinholes * 0.08 +
          scaleCrust * (0.36 + scalePopulationUnit * 0.26) +
          scaleGranules * 0.3 +
          scaleMicroPores * 0.16 +
          scaleCracks * 0.12 -
          scaleExposedIslands * 0.16 +
          flakeLips * (0.18 + liftedScaleReliefUnit * 0.12) +
          flakeUndercut * (0.18 + liftedScaleReliefUnit * 0.1) -
          chipHoleMask * (0.58 + polishUnit * 0.12) -
          freshSteelChips * 0.22 +
          advancedScale * 0.54 +
          advancedGranules * 0.34 +
          advancedMicroPores * 0.18 +
          advancedCavities * 0.14 +
          advancedFlakeRelief * 0.14 -
          residualSteelFlecks * 0.18 +
          growthPresence * 0.58 +
          pores * 0.16 +
          cracks * 0.1 -
          metal * polishUnit * 0.18,
        0,
        1,
      )
      const exposedChipRoughness = clampNumber(
        0.34 + roughMetalUnit * 0.16 + cracks * 0.04 - polishUnit * 0.08,
        0.26,
        0.58,
      )
      const mapRoughness = mask * interpolate(
        rustRoughness,
        exposedChipRoughness,
        smoothStep(0.04, 0.42, chipHoleMask) *
          (1 - advancedPopulationUnit * 0.45),
      )
      const activeWarmth = clampNumber(
        seedRustBody * 4 +
          seedOxidation * 3.8 +
          seedPitAo * 1.2 +
          youngClusters *
            (1.18 + youngPopulationUnit * 0.55 + lateYoungBasinUnit * 1.8) +
          youngPitAo *
            (0.62 + youngPopulationUnit * 0.3 + lateYoungBasinUnit * 1.2) +
          patchBody *
            (0.22 + patchPopulationUnit * 1.8 + lateYoungBasinUnit * 1.45) +
          patchRim *
            (1.05 + patchPopulationUnit * 2 + lateYoungBasinUnit * 1.3) +
          scaleGranules * 0.18 +
          flakeLips * 0.38 +
          flakes * 0.12 +
          advancedGranules * 0.24 * (1 - advancedCavities * 0.45) +
          stage.young * (defect * 0.32 + grain * 0.2) +
          stage.patch * edge * 0.18,
        0,
        1,
      )
      const ageDarkening = clampNumber(
        stage.scale * 0.44 +
          stage.flake * 0.42 +
          stage.advanced * 0.38 +
          patchCenter * 0.34 +
          scaleUnderlayer * 0.46 +
          scaleCrust * 0.3 +
          scaleMicroPores * 0.3 +
          scaleCracks * 0.38 +
          flakeUndercut * 0.32 +
          flakeBranchCracks * 0.24 +
          advancedScale * 0.18 +
          advancedGranules * 0.16 +
          advancedMicroPores * 0.34 +
          advancedCavities * 0.58 +
          pores * 0.4 +
          cracks * 0.36 +
          moisture * 0.18,
        0,
        1,
      )
      const baseRust = mixRgb(
        mixRgb(ACTIVE_ORANGE, YOUNG_RUST, stage.young * 0.8),
        OLD_RUST,
        ageDarkening,
      )
      const darkenedRust = mixRgb(baseRust, DARK_OXIDE, clampNumber(
        pores * 0.34 +
          cracks * 0.44 +
          scaleUnderlayer * 0.36 +
          scaleCrust * 0.18 +
          scaleMicroPores * 0.16 +
          advancedMicroPores * 0.2 +
          advancedCavities * 0.52 +
          advancedScale * 0.08 +
          stage.scale * 0.22 +
          stage.advanced * 0.12,
        0,
        1,
      ))
      const blackIronRust = field.frame.metalType === 'blackIron'
        ? mixRgb(darkenedRust, BLACK_IRON_RUST_BIAS, 0.32)
        : darkenedRust
      const rustColor = mixRgb(
        blackIronRust,
        ACTIVE_ORANGE,
        activeWarmth * (1 - stage.advanced * 0.58),
      )

      albedo[rgbIndex] = rustColor[0] * mask
      albedo[rgbIndex + 1] = rustColor[1] * mask
      albedo[rgbIndex + 2] = rustColor[2] * mask
      ambientOcclusion[index] = ao
      crackMask[index] = cracks
      flakeBodyMask[index] = flakeBody
      flakeCastShadow[index] = flakeCastShadowInput
      flakeCurlX[index] = Math.cos(flakeCurlAngle) * flakeCurlStrength
      flakeCurlY[index] = Math.sin(flakeCurlAngle) * flakeCurlStrength
      flakeLiftHeight[index] = Math.max(0, flakeReliefHeight)
      flakeLipMask[index] = liftedFlakeLip
      flakeMask[index] = flakes
      flakeRootMask[index] = flakeRoot
      flakeUndercutAO[index] = flakeUndercutAOInput
      height[index] = mask > 0 ? mapHeight : 0.5
      metalExposure[index] = metal
      poreMask[index] = pores
      roughness[index] = mapRoughness
    }
  }
    },
  )

  measureArtworkFrameMaterialPerformance(
    options.performance,
    'normal-generation',
    () => writeCorrosionNormalMaps({
      flakeCurlX,
      flakeCurlY,
      flakeLiftHeight,
      flakeLipMask,
      flakeUndercutAO,
      frameMask: field.fields.frameMask,
      height,
      heightPixels,
      normalX,
      normalY,
      normalZ,
      widthPixels,
    }),
  )

  return {
    albedo,
    ambientOcclusion,
    crackMask,
    flakeBodyMask,
    flakeCastShadow,
    flakeCurlX,
    flakeCurlY,
    flakeLiftHeight,
    flakeLipMask,
    flakeMask,
    flakeRootMask,
    flakeUndercutAO,
    height,
    heightPixels,
    metalExposure,
    normalX,
    normalY,
    normalZ,
    poreMask,
    roughness,
    widthPixels,
  }
}

export function shadeArtworkFrameCorrosionImageData(
  imageData: ImageData,
  maps: ArtworkFrameCorrosionDerivedMaps,
  options: ArtworkFrameCorrosionShadingOptions,
) {
  if (
    imageData.width !== maps.widthPixels ||
    imageData.height !== maps.heightPixels
  ) {
    throw new Error('Corrosion maps must match the image data dimensions.')
  }

  const data = imageData.data
  const light = resolveCorrosionLightVector(options)
  const horizontalLightStrength = clampNumber(Math.hypot(light.x, light.y), 0, 1)
  const directionalLightStrength = smoothStep(0.08, 0.72, horizontalLightStrength)
  const normalStrength = clampNumber(options.normalStrength ?? 1.65, 0.2, 1.65)
  const heightSelfShadowMap = measureArtworkFrameMaterialPerformance(
    options.performance,
    'self-shadow-pass',
    () => buildArtworkFrameMaterialHeightSelfShadowMap({
      heightMap: maps.height,
      heightPixels: maps.heightPixels,
      lightVector: light,
      maskMap: maps.roughness,
      maxSteps: 4,
      strength: 0.34,
      widthPixels: maps.widthPixels,
    }),
  )

  measureArtworkFrameMaterialPerformance(options.performance, 'final-shading', () => {
  for (let y = 0; y < maps.heightPixels; y += 1) {
    for (let x = 0; x < maps.widthPixels; x += 1) {
      const index = y * maps.widthPixels + x
      const dataIndex = index * 4
      const alpha = data[dataIndex + 3] ?? 0

      if (alpha <= 0) {
        continue
      }

      const metal = maps.metalExposure[index] ?? 1
      const ao = maps.ambientOcclusion[index] ?? 0
      const pores = maps.poreMask[index] ?? 0
      const cracks = maps.crackMask[index] ?? 0
      const flakeCastShadow = maps.flakeCastShadow[index] ?? 0
      const flakeCurlX = maps.flakeCurlX[index] ?? 0
      const flakeCurlY = maps.flakeCurlY[index] ?? 0
      const flakeLiftHeight = maps.flakeLiftHeight[index] ?? 0
      const flakeLip = maps.flakeLipMask[index] ?? 0
      const flakes = maps.flakeMask[index] ?? 0
      const flakeUndercut = maps.flakeUndercutAO[index] ?? 0
      const roughness = maps.roughness[index] ?? 0.35
      const corrosionPresence = clampNumber(
        (1 - metal) + ao * 0.7 + pores * 0.5 + cracks * 0.55 + flakes * 0.45,
        0,
        1,
      )

      if (corrosionPresence <= 0.001) {
        continue
      }

      const normalInputX = (maps.normalX[index] ?? 0) * normalStrength
      const normalInputY = (maps.normalY[index] ?? 0) * normalStrength
      const normalInputZ = maps.normalZ[index] ?? 1
      const normalLength =
        Math.hypot(normalInputX, normalInputY, normalInputZ) || 1
      const normal = {
        x: normalInputX / normalLength,
        y: normalInputY / normalLength,
        z: normalInputZ / normalLength,
      }
      const normalLight = clampNumber(
        normal.x * light.x + normal.y * light.y + normal.z * light.z,
        -1,
        1,
      )
      const macroLighting = options.coordinates
        ? getArtworkFrameMaterialMacroLightingFactors({
            aspectRatio: options.coordinates.frameAspectRatio,
            lightVector: light,
            position: getCorrosionMacroLightingPosition({
              coordinates: options.coordinates,
              index,
              width: maps.widthPixels,
            }),
          })
        : NEUTRAL_CORROSION_MACRO_LIGHTING
      const heightSelfShadow = heightSelfShadowMap[index] ?? 0
      const baseRed = (data[dataIndex] ?? 0) / 255
      const baseGreen = (data[dataIndex + 1] ?? 0) / 255
      const baseBlue = (data[dataIndex + 2] ?? 0) / 255
      const steelRoughness =
        options.steelFinishMaps?.steelRoughness[index] ?? roughness
      const steelGloss = options.steelFinishMaps?.steelGloss[index] ??
        (1 - steelRoughness)
      const steelRecovery = clampNumber(
        smoothStep(0.58, 0.94, metal) *
          smoothStep(0.018, 0.18, flakes + cracks * 0.42 + flakeUndercut * 0.3) *
          clampNumber(steelGloss * (1 - steelRoughness * 0.74), 0, 1),
        0,
        1,
      )
      const albedoIndex = index * 3
      const rustRed = maps.albedo[albedoIndex] ?? 0
      const rustGreen = maps.albedo[albedoIndex + 1] ?? 0
      const rustBlue = maps.albedo[albedoIndex + 2] ?? 0
      const oxidizedSeedGlaze = smoothStep(0.18, 0.5, roughness) *
        smoothStep(0.018, 0.12, corrosionPresence) *
        (1 - smoothStep(0.12, 0.24, corrosionPresence)) *
        (1 - smoothStep(0.08, 0.32, pores + cracks + flakes))
      const rustBlend = clampNumber(
        ((1 - metal) * 0.82 +
          ao * 0.08 +
          pores * 0.05 +
          flakes * 0.12 +
          oxidizedSeedGlaze * 8) * (1 - steelRecovery * 0.78),
        0,
        0.94,
      )
      const flakeCurlLength = Math.hypot(flakeCurlX, flakeCurlY)
      const flakeLightFacing = flakeCurlLength > 0.000001
        ? clampNumber(
          (flakeCurlX * light.x + flakeCurlY * light.y) / flakeCurlLength,
          -1,
          1,
        )
        : 0
      const directionalFlakeFacing = flakeLightFacing * directionalLightStrength
      const liftedLip = smoothStep(
        0.018,
        0.22,
        flakeLip * (0.62 + flakeLiftHeight * 3 + flakeUndercut * 0.55),
      )
      const lipFacingLight = liftedLip *
        smoothStep(0.06, 0.78, normalLight) *
        (
          smoothStep(-0.1, 0.72, directionalFlakeFacing) *
            directionalLightStrength +
          smoothStep(0.38, 0.92, normalLight) *
            (1 - directionalLightStrength) *
            0.18
        )
      const macroContactMultiplier =
        getArtworkFrameMaterialHeightSelfShadowMacroMultiplier({
          farShadowRamp: macroLighting.farShadowRamp,
          grazingStrength: macroLighting.grazingStrength,
        })
      const lipFacingAway = liftedLip *
        smoothStep(
          0.02,
          0.82,
          -normalLight * 0.42 - directionalFlakeFacing * 0.58,
        ) *
        (0.28 + directionalLightStrength * 0.72)
      const undercutFacingAway = smoothStep(
        -0.18,
        0.74,
        -directionalFlakeFacing * 0.72 - normalLight * 0.28,
      ) * (0.18 + directionalLightStrength * 0.82)
      const directionalContactShadow = clampNumber(
        (
          flakeUndercut * (0.28 + undercutFacingAway * 0.76) +
          flakeCastShadow * (0.16 + undercutFacingAway * 0.58) +
          lipFacingAway * (0.18 + flakeUndercut * 0.32)
        ) * macroContactMultiplier,
        0,
        0.9,
      )
      const exposedChip = smoothStep(0.68, 0.92, metal) *
        smoothStep(0.018, 0.14, flakes + cracks * 0.42 + flakeUndercut * 0.3) *
        (1 - smoothStep(0.72, 0.96, rustBlend))
      const matteRust = smoothStep(
        0.62,
        0.94,
        roughness + flakes * 0.16 + pores * 0.08 + ao * 0.08,
      )
      const macroDiffuse = clampNumber(
        1 + (macroLighting.macroDiffuse - 1) *
          (0.48 + corrosionPresence * 0.18 + (1 - metal) * 0.12),
        0.78,
        1.18,
      )
      const macroShadow = macroLighting.macroShadow *
        (0.34 + corrosionPresence * 0.16 + matteRust * 0.1)
      const macroCavityMultiplier = 1 +
        macroLighting.farShadowRamp *
          (0.1 + macroLighting.grazingStrength * 0.2)
      const macroLipHighlightMultiplier = clampNumber(
        1 + macroLighting.nearLightRamp * 0.2 -
          macroLighting.farShadowRamp * 0.1,
        0.82,
        1.22,
      )
      const macroChipHighlightMultiplier = clampNumber(
        1 + macroLighting.nearLightRamp * 0.26 -
          macroLighting.farShadowRamp * 0.16,
        0.76,
        1.3,
      )
      const diffuse = clampNumber(
        (0.78 + normalLight * (0.28 - matteRust * 0.12)) *
          macroDiffuse -
          macroShadow,
        0.16,
        1.18,
      )
      const cavityShadow = Math.max(0, -normalLight) *
        (0.24 + directionalLightStrength * 0.32)
      const occlusion = clampNumber(
        ao * (0.34 + cavityShadow * 0.24) +
          pores * (0.1 + cavityShadow * 0.2) * macroCavityMultiplier +
          cracks * (0.14 + cavityShadow * 0.24) * macroCavityMultiplier +
          flakes * (0.09 + cavityShadow * 0.22) *
            (1 + macroLighting.farShadowRamp * 0.16) +
          directionalContactShadow +
          heightSelfShadow *
            macroContactMultiplier *
            (0.2 + pores * 0.12 + flakes * 0.28 + flakeLiftHeight * 0.2),
        0,
        0.82,
      )
      const specular = Math.pow(
        Math.max(0, normalLight),
        interpolate(
          18,
          54,
          clampNumber(
            exposedChip > 0 ? 1 - steelRoughness : 1 - roughness,
            0,
            1,
          ),
        ),
      ) * (
        exposedChip * interpolate(0.26, 0.62, steelGloss) +
        metal * (1 - smoothStep(0.018, 0.18, flakes)) * 0.08 *
          (1 - rustBlend)
      )
      const lipRimHighlight = lipFacingLight *
        (0.22 + flakeLiftHeight * 0.32) *
        (1 - matteRust * 0.36) *
        (1 - flakeUndercut * 0.32) *
        macroLipHighlightMultiplier
      const flakeBackShadow = lipFacingAway * (0.18 + flakeUndercut * 0.32)
      const chipSpark = exposedChip *
        Math.pow(Math.max(0, normalLight), 30) *
        (0.08 + clampNumber(steelGloss * (1 - steelRoughness), 0, 1) * 0.32) *
        macroChipHighlightMultiplier
      const chipDirectionalHighlight = exposedChip *
        directionalLightStrength *
        smoothStep(0.18, 0.88, normalLight) *
        (0.025 + clampNumber(steelGloss * (1 - steelRoughness), 0, 1) * 0.12) *
        macroChipHighlightMultiplier
      const lightValue = clampNumber(
        diffuse * (1 - occlusion) +
          specular +
          lipRimHighlight +
          chipDirectionalHighlight +
          chipSpark -
          flakeBackShadow,
        0.18,
        1.55,
      )
      const shadedRed = interpolate(baseRed, rustRed, rustBlend) * lightValue
      const shadedGreen = interpolate(baseGreen, rustGreen, rustBlend) * lightValue
      const shadedBlue = interpolate(baseBlue, rustBlue, rustBlend) * lightValue

      data[dataIndex] = Math.round(
        clampNumber(interpolate(baseRed, shadedRed, corrosionPresence), 0, 1) *
          255,
      )
      data[dataIndex + 1] = Math.round(
        clampNumber(
          interpolate(baseGreen, shadedGreen, corrosionPresence),
          0,
          1,
        ) * 255,
      )
      data[dataIndex + 2] = Math.round(
        clampNumber(interpolate(baseBlue, shadedBlue, corrosionPresence), 0, 1) *
          255,
      )
    }
  }
  })

  return imageData
}
