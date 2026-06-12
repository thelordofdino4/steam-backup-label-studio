import { ARTWORK_FRAME_TEXTURE_URLS } from '../assets/assetManifest.ts'
import {
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN,
  DEFAULT_ADDITIONAL_ARTWORK_FRAME,
} from '../project/additionalArtworkFrame.ts'
import type {
  AdditionalArtworkFrame,
  ImageContentShape,
} from '../project/projectTypes.ts'

export type ArtworkFrameRect = {
  x: number
  y: number
  width: number
  height: number
}

type ArtworkFramePoint = {
  x: number
  y: number
}

type TexturedArtworkFramePathSettings = Pick<
  AdditionalArtworkFrame,
  'jaggedness' | 'lumpiness' | 'roughnessOffset' | 'shape'
>

type RoughFrameNoiseOptions = {
  ellipseSpacing: number
  jaggedAmplitude: number
  jaggedCycles: number
  jaggedVariation: number
  lumpAmplitude: number
  lumpCycles: number
  lumpVariation: number
  maxAmplitude: number
  offset: number
  rectSpacing: number
}

const ROUGH_RECT_EDGE_SPACING = 7
const ROUGH_ELLIPSE_POINT_SPACING = 5
const TEXTURED_FRAME_LUMPINESS_AMPLITUDE_SHARE = 0.42
const TEXTURED_FRAME_JAGGEDNESS_AMPLITUDE_SHARE = 0.24
const TEXTURED_FRAME_LOBE_AMPLITUDE_VARIATION = 0.35
const TEXTURED_FRAME_TOOTH_AMPLITUDE_VARIATION = 0.25
const TEXTURED_FRAME_MIN_ROUGH_AMPLITUDE = 0.35
const TEXTURED_FRAME_OUTER_WIDTH_SHARE = 0.5
const TEXTURED_FRAME_INNER_WIDTH_SHARE = 0.5

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatPathNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(3)
}

function pointsToPath(points: ArtworkFramePoint[]) {
  if (points.length === 0) {
    return ''
  }

  const [firstPoint, ...rest] = points

  return [
    `M ${formatPathNumber(firstPoint.x)} ${formatPathNumber(firstPoint.y)}`,
    ...rest.map((point) =>
      `L ${formatPathNumber(point.x)} ${formatPathNumber(point.y)}`),
    'Z',
  ].join(' ')
}

function getNoise(seed: number, index: number) {
  const value = Math.sin((seed + 1) * 12.9898 + index * 78.233) * 43758.5453

  return value - Math.floor(value)
}

function wrapUnit(value: number) {
  return ((value % 1) + 1) % 1
}

function getControlUnit(value: number, min: number, max: number) {
  if (max <= min) {
    return 0
  }

  return (clampNumber(value, min, max) - min) / (max - min)
}

function normalizeFrameControlValue(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clampNumber(value, min, max)
    : fallback
}

function getTexturedArtworkFrameNoiseOptions(
  frame: TexturedArtworkFramePathSettings,
  strokeWidth: number,
): RoughFrameNoiseOptions {
  const lumpiness = normalizeFrameControlValue(
    frame.lumpiness,
    DEFAULT_ADDITIONAL_ARTWORK_FRAME.lumpiness,
    ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN,
    ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX,
  )
  const jaggedness = normalizeFrameControlValue(
    frame.jaggedness,
    DEFAULT_ADDITIONAL_ARTWORK_FRAME.jaggedness,
    ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN,
    ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX,
  )
  const roughnessOffset = normalizeFrameControlValue(
    frame.roughnessOffset,
    DEFAULT_ADDITIONAL_ARTWORK_FRAME.roughnessOffset,
    ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN,
    ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX,
  )
  const lumpinessUnit = getControlUnit(
    lumpiness,
    ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN,
    ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX,
  )
  const jaggednessUnit = getControlUnit(
    jaggedness,
    ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN,
    ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX,
  )
  const roughnessOffsetUnit = getControlUnit(
    roughnessOffset,
    ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN,
    ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX,
  )
  const rawLumpAmplitude =
    strokeWidth *
      TEXTURED_FRAME_LUMPINESS_AMPLITUDE_SHARE *
      lumpinessUnit
  const rawJaggedAmplitude =
    strokeWidth *
      TEXTURED_FRAME_JAGGEDNESS_AMPLITUDE_SHARE *
      jaggednessUnit
  const rawAmplitude = rawLumpAmplitude + rawJaggedAmplitude
  const minimumAmplitude = Math.min(
    TEXTURED_FRAME_MIN_ROUGH_AMPLITUDE,
    strokeWidth * 0.5,
  )
  const amplitudeScale = rawAmplitude > 0
    ? Math.max(1, minimumAmplitude / rawAmplitude)
    : 1
  const lumpAmplitude = rawLumpAmplitude * amplitudeScale
  const jaggedAmplitude = rawJaggedAmplitude * amplitudeScale

  return {
    ellipseSpacing: clampNumber(
      ROUGH_ELLIPSE_POINT_SPACING - jaggednessUnit * 3 - lumpinessUnit,
      2,
      ROUGH_ELLIPSE_POINT_SPACING,
    ),
    jaggedAmplitude,
    jaggedCycles: Math.round(12 + jaggednessUnit * 30),
    jaggedVariation: TEXTURED_FRAME_TOOTH_AMPLITUDE_VARIATION,
    lumpAmplitude,
    lumpCycles: Math.round(3 + lumpinessUnit * 5),
    lumpVariation: TEXTURED_FRAME_LOBE_AMPLITUDE_VARIATION,
    maxAmplitude:
      lumpAmplitude * (1 + TEXTURED_FRAME_LOBE_AMPLITUDE_VARIATION) +
      jaggedAmplitude * (1 + TEXTURED_FRAME_TOOTH_AMPLITUDE_VARIATION),
    offset: roughnessOffsetUnit,
    rectSpacing: clampNumber(
      ROUGH_RECT_EDGE_SPACING - jaggednessUnit * 4 - lumpinessUnit,
      2.25,
      ROUGH_RECT_EDGE_SPACING,
    ),
  }
}

function getCyclePulseAmplitude(
  seed: number,
  cycleIndex: number,
  variation: number,
) {
  return 1 - variation + getNoise(seed, cycleIndex) * variation * 2
}

function getSemiCircularPulse(position: number) {
  const centeredPosition = position * 2 - 1

  return Math.sqrt(Math.max(0, 1 - centeredPosition * centeredPosition))
}

function getTriangularPulse(position: number) {
  const triangle = Math.max(0, 1 - Math.abs(position * 2 - 1))

  return triangle * triangle
}

function getPulseValue(
  seed: number,
  position: number,
  cycles: number,
  variation: number,
  pulse: (position: number) => number,
) {
  const cycleCount = Math.max(1, Math.round(cycles))
  const scaledPosition = wrapUnit(position) * cycleCount
  const cycleIndex = Math.floor(scaledPosition)
  const cyclePosition = scaledPosition - cycleIndex
  const amplitude = getCyclePulseAmplitude(
    seed,
    cycleIndex % cycleCount,
    variation,
  )

  return pulse(cyclePosition) * amplitude
}

function getRoughOffsetMagnitude(
  seed: number,
  pathPosition: number,
  noiseOptions: RoughFrameNoiseOptions,
) {
  const offsetPosition = pathPosition + noiseOptions.offset
  const lumpOffset = getPulseValue(
    seed,
    offsetPosition,
    noiseOptions.lumpCycles,
    noiseOptions.lumpVariation,
    getSemiCircularPulse,
  ) * noiseOptions.lumpAmplitude
  const jaggedOffset = getPulseValue(
    seed + 1009,
    offsetPosition + noiseOptions.offset * 0.37,
    noiseOptions.jaggedCycles,
    noiseOptions.jaggedVariation,
    getTriangularPulse,
  ) * noiseOptions.jaggedAmplitude

  return lumpOffset + jaggedOffset
}

function getEdgePointCount(length: number, spacing: number) {
  return Math.max(4, Math.ceil(length / spacing))
}

function getRectangleCornerClearance(
  length: number,
  offsetMagnitude: number,
  noiseOptions: RoughFrameNoiseOptions,
) {
  const clearance = Math.max(
    noiseOptions.rectSpacing * 2,
    Math.abs(offsetMagnitude) + noiseOptions.maxAmplitude +
      noiseOptions.rectSpacing,
  )

  return clampNumber(clearance, 0, length * 0.33)
}

function addRectangleEdgePoints(
  points: ArtworkFramePoint[],
  options: {
    bounds: ArtworkFrameRect
    edge: 'top' | 'right' | 'bottom' | 'left'
    edgeDistance: number
    end: ArtworkFramePoint
    endCorner: ArtworkFramePoint
    endClearance: number
    noiseMode: 'inward' | 'outward' | 'signed'
    perimeter: number
    noiseOptions: RoughFrameNoiseOptions
    seed: number
    skipStart?: boolean
    start: ArtworkFramePoint
    startCorner: ArtworkFramePoint
    startClearance: number
  },
) {
  const length = options.edge === 'top' || options.edge === 'bottom'
    ? Math.abs(options.end.x - options.start.x)
    : Math.abs(options.end.y - options.start.y)
  const usableLength = Math.max(
    0,
    length - options.startClearance - options.endClearance,
  )
  const count = getEdgePointCount(
    usableLength,
    options.noiseOptions.rectSpacing,
  )

  for (let index = 0; index <= count; index += 1) {
    if (index === 0) {
      if (!options.skipStart) {
        points.push(options.startCorner)
      }
      continue
    }

    if (index === count) {
      points.push(options.endCorner)
      continue
    }

    const t = index / count
    const edgeT = length > 0
      ? (
          options.startClearance +
          usableLength * t
        ) / length
      : 0
    const pathPosition = options.perimeter > 0
      ? (options.edgeDistance + length * edgeT) / options.perimeter
      : 0
    const noiseMagnitude = getRoughOffsetMagnitude(
      options.seed,
      pathPosition,
      options.noiseOptions,
    )
    const edgeNoise = getRectangleEdgeNoise(
      options.edge,
      options.noiseMode,
      noiseMagnitude,
      noiseMagnitude,
    )
    const x = options.start.x + (options.end.x - options.start.x) * edgeT
    const y = options.start.y + (options.end.y - options.start.y) * edgeT
    const minX = options.bounds.x - options.noiseOptions.maxAmplitude
    const minY = options.bounds.y - options.noiseOptions.maxAmplitude
    const maxX =
      options.bounds.x + options.bounds.width + options.noiseOptions.maxAmplitude
    const maxY =
      options.bounds.y + options.bounds.height + options.noiseOptions.maxAmplitude

    if (options.edge === 'top') {
      points.push({
        x,
        y: clampNumber(y + edgeNoise, minY, maxY),
      })
    } else if (options.edge === 'right') {
      points.push({
        x: clampNumber(x + edgeNoise, minX, maxX),
        y,
      })
    } else if (options.edge === 'bottom') {
      points.push({
        x,
        y: clampNumber(y + edgeNoise, minY, maxY),
      })
    } else {
      points.push({
        x: clampNumber(x + edgeNoise, minX, maxX),
        y,
      })
    }
  }
}

function getRectangleCornerPoint(options: {
    corner: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'
    noiseMode: 'inward' | 'outward' | 'signed'
    offsetMagnitude: number
    x: number
    y: number
  }) {
  const noiseMagnitude = Math.abs(options.offsetMagnitude)
  const sign = options.noiseMode === 'outward' ? 1 : -1
  const signedMagnitude = options.noiseMode === 'signed'
    ? options.offsetMagnitude
    : sign * noiseMagnitude
  const horizontalSign =
    options.corner === 'top-right' || options.corner === 'bottom-right'
      ? 1
      : -1
  const verticalSign =
    options.corner === 'bottom-right' || options.corner === 'bottom-left'
      ? 1
      : -1

  return {
    x: options.x + horizontalSign * signedMagnitude,
    y: options.y + verticalSign * signedMagnitude,
  }
}

function getRectangleEdgeNoise(
  edge: 'top' | 'right' | 'bottom' | 'left',
  mode: 'inward' | 'outward' | 'signed',
  signedNoise: number,
  noiseMagnitude: number,
) {
  if (mode === 'signed') {
    return signedNoise
  }

  const sign = mode === 'outward' ? 1 : -1

  if (edge === 'top' || edge === 'left') {
    return -sign * noiseMagnitude
  }

  return sign * noiseMagnitude
}

function createRoughRectanglePoints(
  bounds: ArtworkFrameRect,
  inset: number,
  noiseOptions: RoughFrameNoiseOptions,
  seed: number,
  noiseMode: 'inward' | 'outward' | 'signed',
) {
  const left = bounds.x + inset
  const top = bounds.y + inset
  const right = bounds.x + bounds.width - inset
  const bottom = bounds.y + bounds.height - inset
  const points: ArtworkFramePoint[] = []

  if (right <= left || bottom <= top) {
    return points
  }

  const pathBounds = {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
  const perimeter = Math.max(0, 2 * (pathBounds.width + pathBounds.height))
  const topRightOffset = getRoughOffsetMagnitude(
    seed,
    perimeter > 0 ? pathBounds.width / perimeter : 0,
    noiseOptions,
  )
  const bottomRightOffset = getRoughOffsetMagnitude(
    seed,
    perimeter > 0 ? (pathBounds.width + pathBounds.height) / perimeter : 0,
    noiseOptions,
  )
  const bottomLeftOffset = getRoughOffsetMagnitude(
    seed,
    perimeter > 0
      ? (pathBounds.width * 2 + pathBounds.height) / perimeter
      : 0,
    noiseOptions,
  )
  const topLeftOffset = getRoughOffsetMagnitude(
    seed,
    1,
    noiseOptions,
  )
  const topLeftCorner = getRectangleCornerPoint({
    corner: 'top-left',
    noiseMode,
    offsetMagnitude: topLeftOffset,
    x: left,
    y: top,
  })
  const topRightCorner = getRectangleCornerPoint({
    corner: 'top-right',
    noiseMode,
    offsetMagnitude: topRightOffset,
    x: right,
    y: top,
  })
  const bottomRightCorner = getRectangleCornerPoint({
    corner: 'bottom-right',
    noiseMode,
    offsetMagnitude: bottomRightOffset,
    x: right,
    y: bottom,
  })
  const bottomLeftCorner = getRectangleCornerPoint({
    corner: 'bottom-left',
    noiseMode,
    offsetMagnitude: bottomLeftOffset,
    x: left,
    y: bottom,
  })
  const topLeftHorizontalClearance = getRectangleCornerClearance(
    pathBounds.width,
    topLeftOffset,
    noiseOptions,
  )
  const topLeftVerticalClearance = getRectangleCornerClearance(
    pathBounds.height,
    topLeftOffset,
    noiseOptions,
  )
  const topRightHorizontalClearance = getRectangleCornerClearance(
    pathBounds.width,
    topRightOffset,
    noiseOptions,
  )
  const topRightVerticalClearance = getRectangleCornerClearance(
    pathBounds.height,
    topRightOffset,
    noiseOptions,
  )
  const bottomRightHorizontalClearance = getRectangleCornerClearance(
    pathBounds.width,
    bottomRightOffset,
    noiseOptions,
  )
  const bottomRightVerticalClearance = getRectangleCornerClearance(
    pathBounds.height,
    bottomRightOffset,
    noiseOptions,
  )
  const bottomLeftHorizontalClearance = getRectangleCornerClearance(
    pathBounds.width,
    bottomLeftOffset,
    noiseOptions,
  )
  const bottomLeftVerticalClearance = getRectangleCornerClearance(
    pathBounds.height,
    bottomLeftOffset,
    noiseOptions,
  )

  addRectangleEdgePoints(points, {
    bounds: pathBounds,
    edge: 'top',
    edgeDistance: 0,
    end: { x: right, y: top },
    endCorner: topRightCorner,
    endClearance: topRightHorizontalClearance,
    noiseMode,
    noiseOptions,
    perimeter,
    seed,
    start: { x: left, y: top },
    startCorner: topLeftCorner,
    startClearance: topLeftHorizontalClearance,
  })
  addRectangleEdgePoints(points, {
    bounds: pathBounds,
    edge: 'right',
    edgeDistance: pathBounds.width,
    end: { x: right, y: bottom },
    endCorner: bottomRightCorner,
    endClearance: bottomRightVerticalClearance,
    noiseMode,
    noiseOptions,
    perimeter,
    seed,
    skipStart: true,
    start: { x: right, y: top },
    startCorner: topRightCorner,
    startClearance: topRightVerticalClearance,
  })
  addRectangleEdgePoints(points, {
    bounds: pathBounds,
    edge: 'bottom',
    edgeDistance: pathBounds.width + pathBounds.height,
    end: { x: left, y: bottom },
    endCorner: bottomLeftCorner,
    endClearance: bottomLeftHorizontalClearance,
    noiseMode,
    noiseOptions,
    perimeter,
    seed,
    skipStart: true,
    start: { x: right, y: bottom },
    startCorner: bottomRightCorner,
    startClearance: bottomRightHorizontalClearance,
  })
  addRectangleEdgePoints(points, {
    bounds: pathBounds,
    edge: 'left',
    edgeDistance: pathBounds.width * 2 + pathBounds.height,
    end: { x: left, y: top },
    endCorner: topLeftCorner,
    endClearance: topLeftVerticalClearance,
    noiseMode,
    noiseOptions,
    perimeter,
    seed,
    skipStart: true,
    start: { x: left, y: bottom },
    startCorner: bottomLeftCorner,
    startClearance: bottomLeftVerticalClearance,
  })

  return points
}

function createRoughEllipsePoints(
  bounds: ArtworkFrameRect,
  inset: number,
  noiseOptions: RoughFrameNoiseOptions,
  seed: number,
  noiseMode: 'inward' | 'outward' | 'signed',
) {
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const radiusX = Math.max(0, bounds.width / 2 - inset)
  const radiusY = Math.max(0, bounds.height / 2 - inset)
  const circumferenceEstimate = Math.PI * Math.sqrt(
    2 * (radiusX * radiusX + radiusY * radiusY),
  )
  const count = Math.max(
    16,
    Math.ceil(circumferenceEstimate / noiseOptions.ellipseSpacing),
  )
  const points: ArtworkFramePoint[] = []

  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2
    const noiseMagnitude = getRoughOffsetMagnitude(
      seed,
      index / count,
      noiseOptions,
    )
    const noise = noiseMode === 'signed'
      ? noiseMagnitude
      : noiseMode === 'outward'
        ? noiseMagnitude
        : -noiseMagnitude
    const nextRadiusX = Math.max(0, radiusX + noise)
    const nextRadiusY = Math.max(0, radiusY + noise)

    points.push({
      x: centerX + Math.cos(angle) * nextRadiusX,
      y: centerY + Math.sin(angle) * nextRadiusY,
    })
  }

  return points
}

export function getArtworkFrameStrokeWidth(
  frame: Pick<AdditionalArtworkFrame, 'width'>,
  width: number,
  height: number,
  minimum = 0,
) {
  const rawWidth = Math.min(width, height) * (frame.width / 100)

  return Math.max(minimum, rawWidth)
}

export function isTexturedArtworkFrame(
  frame: Pick<AdditionalArtworkFrame, 'style'>,
) {
  return frame.style === 'rocky'
}

export function getArtworkFrameTextureUrl(
  frame: Pick<AdditionalArtworkFrame, 'style'>,
) {
  return frame.style === 'rocky' ? ARTWORK_FRAME_TEXTURE_URLS.rocky : null
}

export function getArtworkFrameTexturePatternSize(
  bounds: Pick<ArtworkFrameRect, 'width' | 'height'>,
  strokeWidth: number,
) {
  return Math.max(
    12,
    Math.min(Math.max(bounds.width, bounds.height), strokeWidth * 6),
  )
}

export function createTexturedArtworkFramePathData(
  frame: TexturedArtworkFramePathSettings,
  bounds: ArtworkFrameRect,
  strokeWidth: number,
) {
  const noiseOptions = getTexturedArtworkFrameNoiseOptions(frame, strokeWidth)
  const outerInset = -Math.max(0.5, strokeWidth * TEXTURED_FRAME_OUTER_WIDTH_SHARE)
  const innerInset = Math.max(0.5, strokeWidth * TEXTURED_FRAME_INNER_WIDTH_SHARE)
  const outerPoints = frame.shape === 'circle'
    ? createRoughEllipsePoints(bounds, outerInset, noiseOptions, 17, 'outward')
    : createRoughRectanglePoints(bounds, outerInset, noiseOptions, 7, 'outward')
  const innerPoints = frame.shape === 'circle'
    ? createRoughEllipsePoints(bounds, innerInset, noiseOptions, 29, 'inward')
    : createRoughRectanglePoints(bounds, innerInset, noiseOptions, 19, 'inward')

  return [pointsToPath(outerPoints), pointsToPath(innerPoints)]
    .filter(Boolean)
    .join(' ')
}

export function createBasicArtworkFramePathData(
  frame: Pick<AdditionalArtworkFrame, 'shape'>,
  bounds: ArtworkFrameRect,
  strokeWidth = 0,
) {
  const inset = strokeWidth / 2

  if (frame.shape === 'circle') {
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const radiusX = Math.max(0, (bounds.width - strokeWidth) / 2)
    const radiusY = Math.max(0, (bounds.height - strokeWidth) / 2)

    if (radiusX <= 0 || radiusY <= 0) {
      return ''
    }

    return [
      `M ${formatPathNumber(centerX + radiusX)} ${formatPathNumber(centerY)}`,
      `A ${formatPathNumber(radiusX)} ${formatPathNumber(radiusY)} 0 1 0 ${
        formatPathNumber(centerX - radiusX)
      } ${formatPathNumber(centerY)}`,
      `A ${formatPathNumber(radiusX)} ${formatPathNumber(radiusY)} 0 1 0 ${
        formatPathNumber(centerX + radiusX)
      } ${formatPathNumber(centerY)}`,
      'Z',
    ].join(' ')
  }

  const left = bounds.x + inset
  const top = bounds.y + inset
  const width = Math.max(0, bounds.width - strokeWidth)
  const height = Math.max(0, bounds.height - strokeWidth)

  return width > 0 && height > 0
    ? [
        `M ${formatPathNumber(left)} ${formatPathNumber(top)}`,
        `L ${formatPathNumber(left + width)} ${formatPathNumber(top)}`,
        `L ${formatPathNumber(left + width)} ${formatPathNumber(top + height)}`,
        `L ${formatPathNumber(left)} ${formatPathNumber(top + height)}`,
        'Z',
      ].join(' ')
    : ''
}

export function createScaledImageContentShapePathData(
  shape: Pick<ImageContentShape, 'height' | 'path' | 'width'>,
  bounds: ArtworkFrameRect,
) {
  if (shape.width <= 0 || shape.height <= 0) {
    return ''
  }

  const scaleX = bounds.width / shape.width
  const scaleY = bounds.height / shape.height
  const tokens = shape.path.match(/[MLZmlz]|-?\d+(?:\.\d+)?/g) ?? []
  const pathParts: string[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const command = tokens[index].toUpperCase()

    if (command === 'Z') {
      pathParts.push('Z')
      continue
    }

    if (command !== 'M' && command !== 'L') {
      continue
    }

    const x = Number(tokens[index + 1])
    const y = Number(tokens[index + 2])

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      break
    }

    pathParts.push(
      `${command} ${formatPathNumber(bounds.x + x * scaleX)} ${
        formatPathNumber(bounds.y + y * scaleY)
      }`,
    )
    index += 2
  }

  return pathParts.join(' ')
}

export function createBasicArtworkFramePath(
  context: CanvasRenderingContext2D,
  frame: Pick<AdditionalArtworkFrame, 'shape'>,
  bounds: ArtworkFrameRect,
  strokeWidth = 0,
) {
  const inset = strokeWidth / 2

  context.beginPath()

  if (frame.shape === 'circle') {
    context.ellipse(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      Math.max(0, (bounds.width - strokeWidth) / 2),
      Math.max(0, (bounds.height - strokeWidth) / 2),
      0,
      0,
      Math.PI * 2,
    )
    return
  }

  context.rect(
    bounds.x + inset,
    bounds.y + inset,
    Math.max(0, bounds.width - strokeWidth),
    Math.max(0, bounds.height - strokeWidth),
  )
}
