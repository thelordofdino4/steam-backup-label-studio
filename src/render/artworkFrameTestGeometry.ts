type Point = {
  x: number
  y: number
}

export function getPathNumbers(path: string) {
  return path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
}

function getPathPoints(path: string) {
  const tokens = path.match(/[MLZmlz]|-?\d+(?:\.\d+)?/g) ?? []
  const points: Point[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const command = tokens[index].toUpperCase()

    if (command !== 'M' && command !== 'L') {
      continue
    }

    const x = Number(tokens[index + 1])
    const y = Number(tokens[index + 2])

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      break
    }

    points.push({ x, y })
    index += 2
  }

  return points
}

export function splitPathPoints(path: string) {
  return path
    .split(/Z\s*/i)
    .map((subpath) => getPathPoints(subpath))
    .filter((points) => points.length > 0)
}

export function getPointBounds(points: Point[]) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

function getTurnAngle(previous: Point, current: Point, next: Point) {
  const previousVector = {
    x: current.x - previous.x,
    y: current.y - previous.y,
  }
  const nextVector = {
    x: next.x - current.x,
    y: next.y - current.y,
  }
  const previousLength = Math.hypot(previousVector.x, previousVector.y)
  const nextLength = Math.hypot(nextVector.x, nextVector.y)

  if (previousLength === 0 || nextLength === 0) {
    return 0
  }

  const dot =
    (previousVector.x * nextVector.x + previousVector.y * nextVector.y) /
    (previousLength * nextLength)

  return Math.acos(Math.max(-1, Math.min(1, dot)))
}

export function countSharpTurns(points: Point[], thresholdRadians: number) {
  return points.reduce((count, point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]

    return previous && next &&
        getTurnAngle(previous, point, next) > thresholdRadians
      ? count + 1
      : count
  }, 0)
}

function pointsAreNearlyEqual(left: Point, right: Point) {
  return Math.abs(left.x - right.x) < 0.000001 &&
    Math.abs(left.y - right.y) < 0.000001
}

function getCrossProduct(a: Point, b: Point, c: Point) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function hasProperSegmentIntersection(a: Point, b: Point, c: Point, d: Point) {
  if (
    pointsAreNearlyEqual(a, b) ||
    pointsAreNearlyEqual(c, d) ||
    pointsAreNearlyEqual(a, c) ||
    pointsAreNearlyEqual(a, d) ||
    pointsAreNearlyEqual(b, c) ||
    pointsAreNearlyEqual(b, d)
  ) {
    return false
  }

  const abToC = getCrossProduct(a, b, c)
  const abToD = getCrossProduct(a, b, d)
  const cdToA = getCrossProduct(c, d, a)
  const cdToB = getCrossProduct(c, d, b)

  return abToC * abToD < -0.000001 && cdToA * cdToB < -0.000001
}

export function countProperSegmentIntersections(points: Point[]) {
  let intersections = 0

  for (let leftIndex = 0; leftIndex < points.length; leftIndex += 1) {
    const leftStart = points[leftIndex]!
    const leftEnd = points[(leftIndex + 1) % points.length]!

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < points.length;
      rightIndex += 1
    ) {
      const isAdjacent =
        rightIndex === leftIndex ||
        rightIndex === (leftIndex + 1) % points.length ||
        leftIndex === (rightIndex + 1) % points.length ||
        (leftIndex === 0 && rightIndex === points.length - 1)

      if (isAdjacent) {
        continue
      }

      const rightStart = points[rightIndex]!
      const rightEnd = points[(rightIndex + 1) % points.length]!

      if (
        hasProperSegmentIntersection(
          leftStart,
          leftEnd,
          rightStart,
          rightEnd,
        )
      ) {
        intersections += 1
      }
    }
  }

  return intersections
}
