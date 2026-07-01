import type {
  AdditionalArtworkFrame,
  AdditionalArtworkMetalType,
} from '../project/projectTypes.ts'
import {
  getMetalArtworkFrameEdgeInsets,
  type ArtworkFrameRect,
} from './artworkFrame.ts'
import type { ArtworkFrameMaterialSeed } from './artworkFrameMaterialSeed.ts'

type ArtworkFrameCorrosionFieldFrameSettings = Pick<
  AdditionalArtworkFrame,
  | 'metalBrushAngle'
  | 'metalPattern'
  | 'metalPatternScale'
  | 'metalPatternStrength'
  | 'metalPolish'
  | 'metalTarnish'
  | 'metalType'
  | 'shape'
  | 'style'
  | 'width'
>

export type ArtworkFrameCorrosionFieldSize = {
  height: number
  width: number
}

type ArtworkFrameCorrosionTextureSizeInput = {
  height: number
  width: number
}

export type ArtworkFrameCorrosionStageUnits = {
  advanced: number
  clean: number
  flake: number
  patch: number
  scale: number
  seed: number
  young: number
}

export type ArtworkFrameCorrosionFieldRequest = {
  bounds: ArtworkFrameRect
  fieldSize: ArtworkFrameCorrosionFieldSize
  frame: ArtworkFrameCorrosionFieldFrameSettings
  geometrySeed: number
  geometrySeedKey: string
  materialSeed: ArtworkFrameMaterialSeed | null
  samplingBounds: ArtworkFrameRect
  stageUnits: ArtworkFrameCorrosionStageUnits
  strokeWidth: number
  tarnishUnit: number
}

export type ArtworkFrameCorrosionScalarFields = {
  cellularPitCenters: Float32Array
  corrosionPotential: Float32Array
  defectExposure: Float32Array
  edgeExposure: Float32Array
  frameMask: Float32Array
  moistureBasins: Float32Array
  protectedMetalIslands: Float32Array
  stageCoverage: Float32Array
}

export type ArtworkFrameCorrosionField = ArtworkFrameCorrosionFieldRequest & {
  fields: ArtworkFrameCorrosionScalarFields
}

export type ArtworkFrameCorrosionFieldSummary = {
  max: number
  mean: number
  min: number
}

const CORROSION_GEOMETRY_POLISH_REFERENCE_UNIT = 0.36
const CORROSION_GEOMETRY_POLISH_INDEPENDENT_ANCHOR =
  (CORROSION_GEOMETRY_POLISH_REFERENCE_UNIT * 100).toFixed(3)
const CORROSION_GEOMETRY_BOUNDS_REFERENCE_WIDTH = '128.000'
const CORROSION_GEOMETRY_BOUNDS_REFERENCE_HEIGHT = '96.000'
const CORROSION_GEOMETRY_DEFECT_REFERENCE_ANGLE_DEGREES = 12
const CORROSION_GEOMETRY_EDGE_REFERENCE_MIN_AXIS_SHARE = 0.08
const CORROSION_GEOMETRY_STABLE_HASH_GRID = 4096

export function isRustingArtworkFrameMetalType(
  metalType: AdditionalArtworkMetalType,
) {
  return metalType === 'steel' || metalType === 'blackIron'
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

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
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
  const low = valueNoise2d(seed, x, y, 2.2)
  const mid = valueNoise2d(seed + 101, x, y, 5.4)
  const high = valueNoise2d(seed + 211, x, y, 13.5)

  return low * 0.52 + mid * 0.32 + high * 0.16
}

function cellularCenterField(seed: number, x: number, y: number, cells: number) {
  const scaledX = x * cells
  const scaledY = y * cells
  const cellX = Math.floor(scaledX)
  const cellY = Math.floor(scaledY)
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const nextCellX = cellX + offsetX
      const nextCellY = cellY + offsetY
      const pointX = nextCellX + 0.18 + hashUnit(seed, nextCellX, nextCellY) * 0.64
      const pointY = nextCellY + 0.18 +
        hashUnit(seed + 73, nextCellX, nextCellY) * 0.64
      const distance = Math.hypot(scaledX - pointX, scaledY - pointY)

      nearestDistance = Math.min(nearestDistance, distance)
    }
  }

  return 1 - smoothStep(0.02, 0.42, nearestDistance)
}

function getStageUnits(tarnishUnit: number): ArtworkFrameCorrosionStageUnits {
  const seed = tarnishUnit <= 0.11
    ? smoothStep(0.04, 0.11, tarnishUnit) * 0.4
    : 0.4 + smoothStep(0.11, 0.22, tarnishUnit) * 0.6

  return {
    advanced: smoothStep(0.86, 1, tarnishUnit),
    clean: 1 - smoothStep(0.04, 0.1, tarnishUnit),
    flake: smoothStep(0.7, 0.89, tarnishUnit),
    patch: smoothStep(0.32, 0.55, tarnishUnit),
    scale: smoothStep(0.49, 0.74, tarnishUnit),
    seed,
    young: smoothStep(0.18, 0.38, tarnishUnit),
  }
}

function getCorrosionGeometrySeedKey(
  frame: ArtworkFrameCorrosionFieldFrameSettings,
  materialSeed: ArtworkFrameMaterialSeed | null,
) {
  return [
    ...(materialSeed ? [`material-seed:${materialSeed.key}`] : []),
    frame.style,
    frame.metalType,
    frame.shape,
    CORROSION_GEOMETRY_POLISH_INDEPENDENT_ANCHOR,
    frame.metalPattern,
    frame.metalPatternScale.toFixed(3),
    frame.metalPatternStrength.toFixed(3),
    CORROSION_GEOMETRY_BOUNDS_REFERENCE_WIDTH,
    CORROSION_GEOMETRY_BOUNDS_REFERENCE_HEIGHT,
  ].join('|')
}

function resolveFieldSize(
  textureSize?: ArtworkFrameCorrosionTextureSizeInput | null,
): ArtworkFrameCorrosionFieldSize {
  return {
    height: Math.max(1, Math.round(textureSize?.height ?? 256)),
    width: Math.max(1, Math.round(textureSize?.width ?? 256)),
  }
}

export function createArtworkFrameCorrosionFieldRequest({
  bounds,
  frame,
  materialSeed,
  samplingBounds,
  strokeWidth,
  textureSize,
}: {
  bounds: ArtworkFrameRect
  frame: ArtworkFrameCorrosionFieldFrameSettings
  materialSeed?: ArtworkFrameMaterialSeed | null
  samplingBounds?: ArtworkFrameRect | null
  strokeWidth: number
  textureSize?: ArtworkFrameCorrosionTextureSizeInput | null
}): ArtworkFrameCorrosionFieldRequest | null {
  if (frame.style !== 'metal' || !isRustingArtworkFrameMetalType(frame.metalType)) {
    return null
  }

  const fieldSize = resolveFieldSize(textureSize)
  const tarnishUnit = clampNumber(frame.metalTarnish / 100, 0, 1)
  const geometrySeedKey = getCorrosionGeometrySeedKey(
    frame,
    materialSeed ?? null,
  )

  return {
    bounds,
    fieldSize,
    frame,
    geometrySeed: hashString(geometrySeedKey),
    geometrySeedKey,
    materialSeed: materialSeed ?? null,
    samplingBounds: samplingBounds ?? bounds,
    stageUnits: getStageUnits(tarnishUnit),
    strokeWidth,
    tarnishUnit,
  }
}

export function getArtworkFrameCorrosionSampleCoordinates(
  request: Pick<
    ArtworkFrameCorrosionFieldRequest,
    'bounds' | 'fieldSize' | 'samplingBounds'
  >,
  x: number,
  y: number,
) {
  const sampleXUnit = request.fieldSize.width <= 1
    ? 0
    : x / (request.fieldSize.width - 1)
  const sampleYUnit = request.fieldSize.height <= 1
    ? 0
    : y / (request.fieldSize.height - 1)
  const sampleX = request.samplingBounds.x +
    request.samplingBounds.width * sampleXUnit
  const sampleY = request.samplingBounds.y +
    request.samplingBounds.height * sampleYUnit
  const xUnit = (sampleX - request.bounds.x) /
    Math.max(1, request.bounds.width)
  const yUnit = (sampleY - request.bounds.y) /
    Math.max(1, request.bounds.height)

  return {
    hashX: Math.round(xUnit * CORROSION_GEOMETRY_STABLE_HASH_GRID),
    hashY: Math.round(yUnit * CORROSION_GEOMETRY_STABLE_HASH_GRID),
    sampleX,
    sampleY,
    xUnit,
    yUnit,
  }
}

function getRectangleRingMetrics(
  request: ArtworkFrameCorrosionFieldRequest,
  xUnit: number,
  yUnit: number,
) {
  const { innerInset, outerInset } = getMetalArtworkFrameEdgeInsets(
    request.strokeWidth,
  )
  const outerInsetX = outerInset / Math.max(1, request.bounds.width)
  const outerInsetY = outerInset / Math.max(1, request.bounds.height)
  const innerInsetX = innerInset / Math.max(1, request.bounds.width)
  const innerInsetY = innerInset / Math.max(1, request.bounds.height)
  const isInsideOuter =
    xUnit >= outerInsetX &&
    xUnit <= 1 - outerInsetX &&
    yUnit >= outerInsetY &&
    yUnit <= 1 - outerInsetY
  const isInsideOpening =
    xUnit > innerInsetX &&
    xUnit < 1 - innerInsetX &&
    yUnit > innerInsetY &&
    yUnit < 1 - innerInsetY
  const isInRing = isInsideOuter && !isInsideOpening
  const edgeReferenceWidth =
    Math.min(request.bounds.width, request.bounds.height) *
      CORROSION_GEOMETRY_EDGE_REFERENCE_MIN_AXIS_SHARE
  const edgeReferenceShareX = clampNumber(
    edgeReferenceWidth / Math.max(1, request.bounds.width),
    0.01,
    0.48,
  )
  const edgeReferenceShareY = clampNumber(
    edgeReferenceWidth / Math.max(1, request.bounds.height),
    0.01,
    0.48,
  )
  const referenceOuterInsetX = -edgeReferenceShareX * 0.54
  const referenceOuterInsetY = -edgeReferenceShareY * 0.54
  const referenceInnerInsetX = edgeReferenceShareX * 0.54
  const referenceInnerInsetY = edgeReferenceShareY * 0.54
  const outerDistance = Math.min(
    Math.abs(xUnit - referenceOuterInsetX),
    Math.abs(xUnit - (1 - referenceOuterInsetX)),
    Math.abs(yUnit - referenceOuterInsetY),
    Math.abs(yUnit - (1 - referenceOuterInsetY)),
  )
  const innerDistance = Math.min(
    Math.abs(xUnit - referenceInnerInsetX),
    Math.abs(xUnit - (1 - referenceInnerInsetX)),
    Math.abs(yUnit - referenceInnerInsetY),
    Math.abs(yUnit - (1 - referenceInnerInsetY)),
  )
  const edgeFalloff = Math.max(
    0.012,
    Math.min(edgeReferenceShareX, edgeReferenceShareY) * 0.58,
  )
  const edgeExposure = Math.max(
    1 - smoothStep(0, edgeFalloff, outerDistance),
    1 - smoothStep(0, edgeFalloff, innerDistance),
  )
  const cornerFalloff = Math.max(edgeReferenceShareX, edgeReferenceShareY) * 1.2
  const cornerExposure = Math.max(
    1 - smoothStep(
      0,
      cornerFalloff,
      Math.hypot(xUnit - referenceOuterInsetX, yUnit - referenceOuterInsetY),
    ),
    1 - smoothStep(
      0,
      cornerFalloff,
      Math.hypot(
        xUnit - (1 - referenceOuterInsetX),
        yUnit - referenceOuterInsetY,
      ),
    ),
    1 - smoothStep(
      0,
      cornerFalloff,
      Math.hypot(
        xUnit - referenceOuterInsetX,
        yUnit - (1 - referenceOuterInsetY),
      ),
    ),
    1 - smoothStep(
      0,
      cornerFalloff,
      Math.hypot(
        xUnit - (1 - referenceOuterInsetX),
        yUnit - (1 - referenceOuterInsetY),
      ),
    ),
  )

  return {
    edgeExposure: clampNumber(edgeExposure * 0.82 + cornerExposure * 0.28, 0, 1),
    frameMask: isInRing ? 1 : 0,
  }
}

function getCircleRingMetrics(
  request: ArtworkFrameCorrosionFieldRequest,
  xUnit: number,
  yUnit: number,
) {
  const { innerInset, outerInset } = getMetalArtworkFrameEdgeInsets(
    request.strokeWidth,
  )
  const outerRadiusX = Math.max(
    0.001,
    0.5 - outerInset / Math.max(1, request.bounds.width),
  )
  const outerRadiusY = Math.max(
    0.001,
    0.5 - outerInset / Math.max(1, request.bounds.height),
  )
  const innerRadiusX = Math.max(
    0,
    0.5 - innerInset / Math.max(1, request.bounds.width),
  )
  const innerRadiusY = Math.max(
    0,
    0.5 - innerInset / Math.max(1, request.bounds.height),
  )
  const centeredX = xUnit - 0.5
  const centeredY = yUnit - 0.5
  const outerMetric =
    (centeredX * centeredX) / (outerRadiusX * outerRadiusX) +
    (centeredY * centeredY) / (outerRadiusY * outerRadiusY)
  const innerMetric = innerRadiusX > 0 && innerRadiusY > 0
    ? (centeredX * centeredX) / (innerRadiusX * innerRadiusX) +
      (centeredY * centeredY) / (innerRadiusY * innerRadiusY)
    : Number.POSITIVE_INFINITY
  const frameMask = outerMetric <= 1 && innerMetric >= 1 ? 1 : 0
  const edgeReferenceShare = CORROSION_GEOMETRY_EDGE_REFERENCE_MIN_AXIS_SHARE
  const referenceOuterRadiusX = 0.5 + edgeReferenceShare * 0.54
  const referenceOuterRadiusY = 0.5 + edgeReferenceShare * 0.54
  const referenceInnerRadiusX = Math.max(0.001, 0.5 - edgeReferenceShare * 0.54)
  const referenceInnerRadiusY = Math.max(0.001, 0.5 - edgeReferenceShare * 0.54)
  const referenceOuterMetric =
    (centeredX * centeredX) / (referenceOuterRadiusX * referenceOuterRadiusX) +
    (centeredY * centeredY) / (referenceOuterRadiusY * referenceOuterRadiusY)
  const referenceInnerMetric =
    (centeredX * centeredX) / (referenceInnerRadiusX * referenceInnerRadiusX) +
    (centeredY * centeredY) / (referenceInnerRadiusY * referenceInnerRadiusY)
  const outerRadius = Math.sqrt(referenceOuterMetric)
  const innerRadius = Math.sqrt(referenceInnerMetric)
  const outerEdge = 1 - smoothStep(
    0,
    edgeReferenceShare * 0.48,
    Math.abs(1 - outerRadius),
  )
  const innerEdge = 1 - smoothStep(
    0,
    edgeReferenceShare * 0.48,
    Math.abs(innerRadius - 1),
  )

  return {
    edgeExposure: clampNumber(Math.max(outerEdge, innerEdge), 0, 1),
    frameMask,
  }
}

function getRingMetrics(
  request: ArtworkFrameCorrosionFieldRequest,
  xUnit: number,
  yUnit: number,
) {
  return request.frame.shape === 'circle'
    ? getCircleRingMetrics(request, xUnit, yUnit)
    : getRectangleRingMetrics(request, xUnit, yUnit)
}

function getDefectExposure(
  request: ArtworkFrameCorrosionFieldRequest,
  xUnit: number,
  yUnit: number,
) {
  const brushAngle = CORROSION_GEOMETRY_DEFECT_REFERENCE_ANGLE_DEGREES *
    Math.PI / 180
  const alongGrain = xUnit * Math.cos(brushAngle) + yUnit * Math.sin(brushAngle)
  const acrossGrain = -xUnit * Math.sin(brushAngle) + yUnit * Math.cos(brushAngle)
  const grainRidges = 1 - smoothStep(
    0.02,
    0.18,
    Math.abs((alongGrain * 37 + valueNoise2d(request.geometrySeed + 307, acrossGrain, alongGrain, 4)) % 1 - 0.5),
  )
  const scratchNoise = fractalNoise2d(
    request.geometrySeed + 401,
    alongGrain * 1.2 + acrossGrain * 0.12,
    acrossGrain * 2.4,
  )
  const roughnessBoost = 1 - smoothStep(
    0.35,
    1,
    CORROSION_GEOMETRY_POLISH_REFERENCE_UNIT,
  )

  return clampNumber(
    grainRidges * (0.32 + roughnessBoost * 0.22) +
      scratchNoise * (0.38 + roughnessBoost * 0.18),
    0,
    1,
  )
}

function getStageCoverage(
  request: ArtworkFrameCorrosionFieldRequest,
  potential: number,
  protectedMetal: number,
  edgeExposure: number,
) {
  const growth = smoothStep(0.08, 1, request.tarnishUnit)
  const threshold = 1.02 - growth * 0.9
  const coverage = smoothStep(threshold - 0.18, threshold + 0.18, potential)
  const seedEdgeActivation = request.stageUnits.seed * edgeExposure * 0.2

  return clampNumber(
    (coverage * growth + seedEdgeActivation) * (1 - protectedMetal * 0.42),
    0,
    1,
  )
}

export function buildArtworkFrameCorrosionField(
  request: ArtworkFrameCorrosionFieldRequest,
): ArtworkFrameCorrosionField {
  const length = request.fieldSize.width * request.fieldSize.height
  const edgeExposure = new Float32Array(length)
  const defectExposure = new Float32Array(length)
  const moistureBasins = new Float32Array(length)
  const cellularPitCenters = new Float32Array(length)
  const protectedMetalIslands = new Float32Array(length)
  const stageCoverage = new Float32Array(length)
  const corrosionPotential = new Float32Array(length)
  const frameMask = new Float32Array(length)
  const protectionStrength =
    0.24 + CORROSION_GEOMETRY_POLISH_REFERENCE_UNIT * 0.34

  for (let y = 0; y < request.fieldSize.height; y += 1) {
    for (let x = 0; x < request.fieldSize.width; x += 1) {
      const { xUnit, yUnit } = getArtworkFrameCorrosionSampleCoordinates(
        request,
        x,
        y,
      )
      const index = y * request.fieldSize.width + x
      const metrics = getRingMetrics(request, xUnit, yUnit)
      const mask = metrics.frameMask
      const edge = metrics.edgeExposure * mask
      const defect = getDefectExposure(request, xUnit, yUnit) * mask
      const moisture = smoothStep(
        0.28,
        0.88,
        fractalNoise2d(request.geometrySeed + 701, xUnit, yUnit),
      ) * mask
      const pits = cellularCenterField(
        request.geometrySeed + 907,
        xUnit,
        yUnit,
        14,
      ) * mask
      const protection = smoothStep(
        0.55,
        0.88,
        fractalNoise2d(request.geometrySeed + 1103, xUnit * 0.9, yUnit * 0.9),
      ) * mask
      const potential = clampNumber(
        edge * 0.3 +
          defect * 0.2 +
          moisture * 0.28 +
          pits * 0.28 -
          protection * protectionStrength,
        0,
        1,
      ) * mask

      frameMask[index] = mask
      edgeExposure[index] = edge
      defectExposure[index] = defect
      moistureBasins[index] = moisture
      cellularPitCenters[index] = pits
      protectedMetalIslands[index] = protection
      corrosionPotential[index] = potential
      stageCoverage[index] = getStageCoverage(request, potential, protection, edge) * mask
    }
  }

  return {
    ...request,
    fields: {
      cellularPitCenters,
      corrosionPotential,
      defectExposure,
      edgeExposure,
      frameMask,
      moistureBasins,
      protectedMetalIslands,
      stageCoverage,
    },
  }
}

export function summarizeArtworkFrameCorrosionScalarField(
  field: Float32Array,
): ArtworkFrameCorrosionFieldSummary {
  if (field.length === 0) {
    return { max: 0, mean: 0, min: 0 }
  }

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  let total = 0

  for (const value of field) {
    min = Math.min(min, value)
    max = Math.max(max, value)
    total += value
  }

  return {
    max,
    mean: total / field.length,
    min,
  }
}

export function getArtworkFrameCorrosionFieldValue(
  field: ArtworkFrameCorrosionField,
  fieldName: keyof ArtworkFrameCorrosionScalarFields,
  x: number,
  y: number,
) {
  const clampedX = Math.round(clampNumber(x, 0, field.fieldSize.width - 1))
  const clampedY = Math.round(clampNumber(y, 0, field.fieldSize.height - 1))
  return field.fields[fieldName][clampedY * field.fieldSize.width + clampedX] ?? 0
}
