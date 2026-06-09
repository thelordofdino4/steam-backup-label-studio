import type {
  BackgroundImageSize,
  ImageContentBounds,
  ImageContentShape,
} from '../project/projectTypes.ts'

export const IMAGE_CONTENT_SHAPE_FILL_RULE: ImageContentShape['fillRule'] = 'evenodd'
export const MAX_IMAGE_CONTENT_SHAPE_POINTS = 1200
export const MAX_IMAGE_CONTENT_SHAPE_PATH_LENGTH = 24000
const IMAGE_CONTENT_SHAPE_PIXEL_COVERAGE_OUTSET = Math.SQRT2

type Point = {
  x: number
  y: number
}

type Edge = {
  from: Point
  to: Point
  used: boolean
}

type ShapeOptions = {
  maxPoints?: number
  alphaThreshold?: number
}

function normalizePixelNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback
}

function normalizeNonNegativeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null
}

function normalizeImageContentShapeSafetyOutset(
  value: unknown,
  contentSize: Pick<BackgroundImageSize, 'width' | 'height'>,
) {
  const safetyOutset = normalizeNonNegativeNumber(value)

  if (safetyOutset == null) {
    return null
  }

  const maxOutset = Math.max(contentSize.width, contentSize.height)

  return maxOutset > 0 && safetyOutset <= maxOutset
    ? Number(safetyOutset.toFixed(3))
    : null
}

function pointKey(point: Point) {
  return `${point.x},${point.y}`
}

function pointsEqual(left: Point, right: Point) {
  return left.x === right.x && left.y === right.y
}

function getDirection(from: Point, to: Point) {
  return {
    x: Math.sign(to.x - from.x),
    y: Math.sign(to.y - from.y),
  }
}

function getTurnRank(previous: Point, next: Point) {
  const right = { x: -previous.y, y: previous.x }
  const left = { x: previous.y, y: -previous.x }

  if (next.x === right.x && next.y === right.y) {
    return 0
  }

  if (next.x === previous.x && next.y === previous.y) {
    return 1
  }

  if (next.x === left.x && next.y === left.y) {
    return 2
  }

  return 3
}

function getPointDistanceSquared(left: Point, right: Point) {
  const dx = left.x - right.x
  const dy = left.y - right.y

  return dx * dx + dy * dy
}

function getPerpendicularDistanceSquared(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (dx === 0 && dy === 0) {
    return getPointDistanceSquared(point, start)
  }

  const numerator = Math.abs(
    dy * point.x -
      dx * point.y +
      end.x * start.y -
      end.y * start.x,
  )

  return (numerator * numerator) / (dx * dx + dy * dy)
}

function removeCollinearPoints(points: Point[]) {
  if (points.length <= 3) {
    return points
  }

  return points.filter((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]

    return !(
      (previous.x === point.x && point.x === next.x) ||
      (previous.y === point.y && point.y === next.y)
    )
  })
}

function simplifyOpenPoints(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) {
    return points
  }

  const toleranceSquared = tolerance * tolerance
  let bestDistance = 0
  let bestIndex = 0
  const start = points[0]
  const end = points[points.length - 1]

  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = getPerpendicularDistanceSquared(points[index], start, end)

    if (distance > bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  if (bestDistance <= toleranceSquared) {
    return [start, end]
  }

  const first = simplifyOpenPoints(points.slice(0, bestIndex + 1), tolerance)
  const second = simplifyOpenPoints(points.slice(bestIndex), tolerance)

  return first.slice(0, -1).concat(second)
}

function getFarthestPointIndex(points: Point[]) {
  if (points.length <= 1) {
    return 0
  }

  const start = points[0]
  let bestIndex = 1
  let bestDistance = 0

  for (let index = 1; index < points.length; index += 1) {
    const distance = getPointDistanceSquared(start, points[index])

    if (distance > bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  return bestIndex
}

function simplifyClosedPoints(points: Point[], tolerance: number) {
  const collinearSimplified = removeCollinearPoints(points)

  if (collinearSimplified.length <= 4 || tolerance <= 0) {
    return collinearSimplified
  }

  const splitIndex = getFarthestPointIndex(collinearSimplified)
  const first = simplifyOpenPoints(
    collinearSimplified.slice(0, splitIndex + 1),
    tolerance,
  )
  const second = simplifyOpenPoints(
    collinearSimplified.slice(splitIndex).concat(collinearSimplified[0]),
    tolerance,
  )

  return first.slice(0, -1).concat(second.slice(0, -1))
}

function getTotalPointCount(loops: Point[][]) {
  return loops.reduce((total, loop) => total + loop.length, 0)
}

function formatPointValue(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : Number(value.toFixed(2)).toString()
}

function createPathFromLoops(loops: Point[][]) {
  return loops
    .map((loop) => {
      const [first, ...rest] = loop

      return [
        `M${formatPointValue(first.x)} ${formatPointValue(first.y)}`,
        ...rest.map((point) =>
          `L${formatPointValue(point.x)} ${formatPointValue(point.y)}`),
        'Z',
      ].join(' ')
    })
    .join(' ')
}

function getActiveMask(
  imageData: Pick<ImageData, 'data' | 'width' | 'height'>,
  bounds: ImageContentBounds,
  alphaThreshold: number,
) {
  const mask = new Uint8Array(bounds.width * bounds.height)
  let activeCount = 0

  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceX = bounds.x + x
      const sourceY = bounds.y + y
      const alphaIndex = (sourceY * imageData.width + sourceX) * 4 + 3

      if ((imageData.data[alphaIndex] ?? 0) <= alphaThreshold) {
        continue
      }

      mask[y * bounds.width + x] = 1
      activeCount += 1
    }
  }

  return { mask, activeCount }
}

function createBoundaryEdges(mask: Uint8Array, width: number, height: number) {
  const edges: Edge[] = []
  const edgesByStart = new Map<string, Edge[]>()
  const isActive = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height
      ? mask[y * width + x] === 1
      : false
  const addEdge = (from: Point, to: Point) => {
    const edge = { from, to, used: false }
    const key = pointKey(from)

    edges.push(edge)
    edgesByStart.set(key, [...(edgesByStart.get(key) ?? []), edge])
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isActive(x, y)) {
        continue
      }

      if (!isActive(x, y - 1)) {
        addEdge({ x, y }, { x: x + 1, y })
      }

      if (!isActive(x + 1, y)) {
        addEdge({ x: x + 1, y }, { x: x + 1, y: y + 1 })
      }

      if (!isActive(x, y + 1)) {
        addEdge({ x: x + 1, y: y + 1 }, { x, y: y + 1 })
      }

      if (!isActive(x - 1, y)) {
        addEdge({ x, y: y + 1 }, { x, y })
      }
    }
  }

  return { edges, edgesByStart }
}

function chooseNextEdge(
  candidates: Edge[],
  previousDirection: Point | null,
) {
  const unused = candidates.filter((edge) => !edge.used)

  if (unused.length <= 1 || !previousDirection) {
    return unused[0] ?? null
  }

  return unused.sort((left, right) => {
    const leftDirection = getDirection(left.from, left.to)
    const rightDirection = getDirection(right.from, right.to)

    return (
      getTurnRank(previousDirection, leftDirection) -
      getTurnRank(previousDirection, rightDirection)
    )
  })[0] ?? null
}

function traceBoundaryLoops(
  edges: Edge[],
  edgesByStart: Map<string, Edge[]>,
) {
  const loops: Point[][] = []

  for (const firstEdge of edges) {
    if (firstEdge.used) {
      continue
    }

    const start = firstEdge.from
    const points: Point[] = [start]
    let currentEdge: Edge | null = firstEdge

    while (currentEdge) {
      currentEdge.used = true
      const current = currentEdge.to
      const direction = getDirection(currentEdge.from, currentEdge.to)

      if (pointsEqual(current, start)) {
        break
      }

      points.push(current)
      currentEdge = chooseNextEdge(
        edgesByStart.get(pointKey(current)) ?? [],
        direction,
      )
    }

    if (points.length >= 3) {
      loops.push(points)
    }
  }

  return loops
}

function simplifyLoopsToBudget(loops: Point[][], maxPoints: number) {
  let tolerance = 0.25
  let simplified = loops.map((loop) => simplifyClosedPoints(loop, tolerance))

  while (
    getTotalPointCount(simplified) > maxPoints &&
    tolerance < 16
  ) {
    tolerance *= 1.5
    simplified = loops.map((loop) => simplifyClosedPoints(loop, tolerance))
  }

  return {
    loops: simplified.filter((loop) => loop.length >= 3),
    tolerance,
  }
}

function getSafetyOutsetForSimplificationTolerance(tolerance: number) {
  return Math.ceil(
    Math.max(0, tolerance) + IMAGE_CONTENT_SHAPE_PIXEL_COVERAGE_OUTSET,
  )
}

export function normalizeImageContentShape(
  value: unknown,
  contentSize?: Pick<BackgroundImageSize, 'width' | 'height'> | null,
): ImageContentShape | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const path = typeof record.path === 'string' ? record.path.trim() : ''
  const width = normalizePixelNumber(record.width)
  const height = normalizePixelNumber(record.height)

  if (
    !path ||
    path.length > MAX_IMAGE_CONTENT_SHAPE_PATH_LENGTH ||
    !/^[MmLlHhVvZz0-9,.\s-]+$/.test(path) ||
    width <= 0 ||
    height <= 0
  ) {
    return null
  }

  if (
    contentSize &&
    (width !== normalizePixelNumber(contentSize.width) ||
      height !== normalizePixelNumber(contentSize.height))
  ) {
    return null
  }

  const safetyOutset = normalizeImageContentShapeSafetyOutset(
    record.safetyOutset,
    { width, height },
  )

  return {
    width,
    height,
    path,
    fillRule: IMAGE_CONTENT_SHAPE_FILL_RULE,
    ...(safetyOutset != null ? { safetyOutset } : {}),
  }
}

export function normalizeStoredImageContentShape(
  value: unknown,
  contentSize?: Pick<BackgroundImageSize, 'width' | 'height'> | null,
) {
  return normalizeImageContentShape(value, contentSize)
}

export function getImageContentShape(
  imageSize: BackgroundImageSize | null | undefined,
) {
  if (!imageSize?.contentShape) {
    return null
  }

  const contentSize = imageSize.contentBounds &&
    imageSize.contentBounds.width > 0 &&
    imageSize.contentBounds.height > 0
    ? imageSize.contentBounds
    : imageSize

  return normalizeStoredImageContentShape(imageSize.contentShape, contentSize)
}

export function hasImageContentShape(
  imageSize: BackgroundImageSize | null | undefined,
) {
  return Boolean(getImageContentShape(imageSize))
}

export function hasSafeImageContentShape(
  imageSize: BackgroundImageSize | null | undefined,
) {
  return getImageContentShape(imageSize)?.safetyOutset != null
}

export function getImageContentShapeSafetyOutset(
  imageSize: BackgroundImageSize | null | undefined,
) {
  const shape = getImageContentShape(imageSize)

  return shape?.safetyOutset ?? null
}

export function getImageContentShapeLoops(
  imageSize: BackgroundImageSize | null | undefined,
) {
  const shape = getImageContentShape(imageSize)

  if (!shape) {
    return []
  }

  const tokens = shape.path.match(/[MLZmlz]|-?\d+(?:\.\d+)?/g) ?? []
  const loops: Point[][] = []
  let currentLoop: Point[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const command = token.toUpperCase()

    if (command === 'Z') {
      if (currentLoop.length >= 3) {
        loops.push(currentLoop)
      }
      currentLoop = []
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

    if (command === 'M' && currentLoop.length >= 3) {
      loops.push(currentLoop)
      currentLoop = []
    }

    currentLoop.push({ x, y })
    index += 2
  }

  if (currentLoop.length >= 3) {
    loops.push(currentLoop)
  }

  return loops
}

export function findImageDataContentShape(
  imageData: Pick<ImageData, 'data' | 'width' | 'height'>,
  bounds: ImageContentBounds | null | undefined,
  options: ShapeOptions = {},
): ImageContentShape | null {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return null
  }

  const alphaThreshold = normalizePixelNumber(options.alphaThreshold)
  const maxPoints = Math.max(24, options.maxPoints ?? MAX_IMAGE_CONTENT_SHAPE_POINTS)
  const { mask, activeCount } = getActiveMask(imageData, bounds, alphaThreshold)

  if (activeCount === 0 || activeCount === bounds.width * bounds.height) {
    return null
  }

  const { edges, edgesByStart } = createBoundaryEdges(
    mask,
    bounds.width,
    bounds.height,
  )
  const tracedLoops = traceBoundaryLoops(edges, edgesByStart)
  const simplified = simplifyLoopsToBudget(
    tracedLoops,
    maxPoints,
  )
  const loops = simplified.loops

  if (loops.length === 0) {
    return null
  }

  const path = createPathFromLoops(loops)

  return path.length <= MAX_IMAGE_CONTENT_SHAPE_PATH_LENGTH
    ? {
        width: bounds.width,
        height: bounds.height,
        path,
        fillRule: IMAGE_CONTENT_SHAPE_FILL_RULE,
        safetyOutset: getSafetyOutsetForSimplificationTolerance(
          simplified.tolerance,
        ),
      }
    : null
}
