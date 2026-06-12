import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createScaledImageContentShapePathData,
  createTexturedArtworkFramePathData,
  getArtworkFrameStrokeWidth,
  getArtworkFrameTexturePatternSize,
  getArtworkFrameTextureUrl,
  isTexturedArtworkFrame,
} from './artworkFrame.ts'

function getPathNumbers(path: string) {
  return path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
}

function getPathPoints(path: string) {
  const tokens = path.match(/[MLZmlz]|-?\d+(?:\.\d+)?/g) ?? []
  const points: Array<{ x: number; y: number }> = []

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

function splitPathPoints(path: string) {
  return path
    .split(/Z\s*/i)
    .map((subpath) => getPathPoints(subpath))
    .filter((points) => points.length > 0)
}

function getPointBounds(points: Array<{ x: number; y: number }>) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

function getTurnAngle(
  previous: { x: number; y: number },
  current: { x: number; y: number },
  next: { x: number; y: number },
) {
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

function countSharpTurns(
  points: Array<{ x: number; y: number }>,
  thresholdRadians: number,
) {
  return points.reduce((count, point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]

    return previous && next &&
        getTurnAngle(previous, point, next) > thresholdRadians
      ? count + 1
      : count
  }, 0)
}

function pointsAreNearlyEqual(
  left: { x: number; y: number },
  right: { x: number; y: number },
) {
  return Math.abs(left.x - right.x) < 0.000001 &&
    Math.abs(left.y - right.y) < 0.000001
}

function getCrossProduct(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function hasProperSegmentIntersection(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
) {
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

function countProperSegmentIntersections(
  points: Array<{ x: number; y: number }>,
) {
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

test('rocky artwork frame geometry scales from the target bounds', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 6,
    shape: 'rectangle',
    style: 'rocky',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
  } as const
  const smallBounds = { x: 0, y: 0, width: 100, height: 56 }
  const largeBounds = { x: 0, y: 0, width: 180, height: 100 }
  const smallStroke = getArtworkFrameStrokeWidth(
    frame,
    smallBounds.width,
    smallBounds.height,
  )
  const largeStroke = getArtworkFrameStrokeWidth(
    frame,
    largeBounds.width,
    largeBounds.height,
  )
  const smallPath = createTexturedArtworkFramePathData(
    frame,
    smallBounds,
    smallStroke,
  )
  const largePath = createTexturedArtworkFramePathData(
    frame,
    largeBounds,
    largeStroke,
  )
  const smallValues = getPathNumbers(smallPath)
  const largeValues = getPathNumbers(largePath)
  const smallCirclePath = createTexturedArtworkFramePathData(
    { ...frame, shape: 'circle' },
    smallBounds,
    smallStroke,
  )
  const [rectangleOuter, rectangleInner] = splitPathPoints(smallPath)
  const [circleOuter, circleInner] = splitPathPoints(smallCirclePath)
  const rectangleOuterBounds = getPointBounds(rectangleOuter ?? [])
  const rectangleInnerBounds = getPointBounds(rectangleInner ?? [])
  const circleOuterBounds = getPointBounds(circleOuter ?? [])
  const circleInnerBounds = getPointBounds(circleInner ?? [])

  assert.equal(isTexturedArtworkFrame(frame), true)
  assert.match(getArtworkFrameTextureUrl(frame) ?? '', /rocky-frame-texture\.png/)
  assert.equal(smallStroke, 3.36)
  assert.equal(largeStroke, 6)
  assert.notEqual(smallPath, largePath)
  assert.equal(smallPath.match(/M/g)?.length, 2)
  assert.equal(Math.min(...smallValues) <= -smallStroke / 2, true)
  assert.equal(Math.max(...smallValues) >= smallBounds.width + smallStroke / 2, true)
  assert.equal(Math.min(...largeValues) <= -largeStroke / 2, true)
  assert.equal(Math.max(...largeValues) >= largeBounds.width + largeStroke / 2, true)
  assert.equal(rectangleOuterBounds.minX < 0, true)
  assert.equal(rectangleOuterBounds.maxX > smallBounds.width, true)
  assert.equal(rectangleOuterBounds.minY < 0, true)
  assert.equal(rectangleOuterBounds.maxY > smallBounds.height, true)
  assert.equal(rectangleInnerBounds.minX > 0, true)
  assert.equal(rectangleInnerBounds.maxX < smallBounds.width, true)
  assert.equal(rectangleInnerBounds.minY > 0, true)
  assert.equal(rectangleInnerBounds.maxY < smallBounds.height, true)
  assert.equal(smallCirclePath.match(/M/g)?.length, 2)
  assert.doesNotMatch(smallCirclePath, / A /)
  assert.equal(circleOuterBounds.minX < 0, true)
  assert.equal(circleOuterBounds.maxX > smallBounds.width, true)
  assert.equal(circleOuterBounds.minY < 0, true)
  assert.equal(circleOuterBounds.maxY > smallBounds.height, true)
  assert.equal(circleInnerBounds.minX > 0, true)
  assert.equal(circleInnerBounds.maxX < smallBounds.width, true)
  assert.equal(circleInnerBounds.minY > 0, true)
  assert.equal(circleInnerBounds.maxY < smallBounds.height, true)
  assert.equal(getArtworkFrameTexturePatternSize(smallBounds, smallStroke) >= 12, true)
})

test('rocky artwork frame controls affect procedural edge shape', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 6,
    shape: 'circle',
    style: 'rocky',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
  } as const
  const bounds = { x: 0, y: 0, width: 100, height: 56 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const smoothPath = createTexturedArtworkFramePathData(
    { ...frame, lumpiness: 0, jaggedness: 0 },
    bounds,
    stroke,
  )
  const lumpyPath = createTexturedArtworkFramePathData(
    { ...frame, lumpiness: 100, jaggedness: 0 },
    bounds,
    stroke,
  )
  const jaggedPath = createTexturedArtworkFramePathData(
    { ...frame, lumpiness: 0, jaggedness: 100 },
    bounds,
    stroke,
  )
  const shiftedPath = createTexturedArtworkFramePathData(
    { ...frame, roughnessOffset: 35 },
    bounds,
    stroke,
  )
  const [smoothOuter, smoothInner] = splitPathPoints(smoothPath)
  const [lumpyOuter, lumpyInner] = splitPathPoints(lumpyPath)
  const [jaggedOuter, jaggedInner] = splitPathPoints(jaggedPath)
  const [shiftedOuter, shiftedInner] = splitPathPoints(shiftedPath)
  const lumpyOuterBounds = getPointBounds(lumpyOuter ?? [])
  const lumpyInnerBounds = getPointBounds(lumpyInner ?? [])
  const jaggedOuterBounds = getPointBounds(jaggedOuter ?? [])
  const jaggedInnerBounds = getPointBounds(jaggedInner ?? [])
  const shiftedOuterBounds = getPointBounds(shiftedOuter ?? [])
  const shiftedInnerBounds = getPointBounds(shiftedInner ?? [])

  assert.notEqual(smoothPath, lumpyPath)
  assert.notEqual(smoothPath, jaggedPath)
  assert.notEqual(createTexturedArtworkFramePathData(frame, bounds, stroke), shiftedPath)
  assert.equal(jaggedOuter!.length > smoothOuter!.length, true)
  assert.equal(jaggedInner!.length > smoothInner!.length, true)
  assert.equal(lumpyOuterBounds.minX < 0, true)
  assert.equal(lumpyOuterBounds.maxX > bounds.width, true)
  assert.equal(lumpyInnerBounds.minX > 0, true)
  assert.equal(lumpyInnerBounds.maxX < bounds.width, true)
  assert.equal(jaggedOuterBounds.minY < 0, true)
  assert.equal(jaggedOuterBounds.maxY > bounds.height, true)
  assert.equal(jaggedInnerBounds.minY > 0, true)
  assert.equal(jaggedInnerBounds.maxY < bounds.height, true)
  assert.equal(shiftedOuterBounds.minX < 0, true)
  assert.equal(shiftedOuterBounds.maxX > bounds.width, true)
  assert.equal(shiftedInnerBounds.minX > 0, true)
  assert.equal(shiftedInnerBounds.maxX < bounds.width, true)
})

test('rocky rectangle frame corners do not close with diagonal inner triangles', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'rectangle',
    style: 'rocky',
    lumpiness: 100,
    jaggedness: 100,
    roughnessOffset: 13,
  } as const
  const bounds = { x: 0, y: 0, width: 100, height: 56 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const path = createTexturedArtworkFramePathData(frame, bounds, stroke)
  const [, inner] = splitPathPoints(path)
  const firstInnerPoint = inner![0]!
  const lastInnerPoint = inner![inner!.length - 1]!

  assert.equal(path.match(/M/g)?.length, 2)
  assert.equal(
    Math.abs(firstInnerPoint.y - lastInnerPoint.y) < 0.01 ||
      Math.abs(firstInnerPoint.x - lastInnerPoint.x) < 0.01,
    true,
  )
})

test('rocky rectangle frame rough inner edges do not self-intersect', () => {
  const boundsCases = [
    { width: 100, height: 56 },
    { width: 100, height: 66.667 },
    { width: 100, height: 100 },
    { width: 100, height: 30 },
  ]
  const roughnessOffsets = [0, 5, 13, 21, 35, 75, 100]

  for (const bounds of boundsCases) {
    for (const roughnessOffset of roughnessOffsets) {
      const frame = {
        enabled: true,
        color: '#ffffff',
        width: 8,
        shape: 'rectangle',
        style: 'rocky',
        lumpiness: 100,
        jaggedness: 100,
        roughnessOffset,
      } as const
      const stroke = getArtworkFrameStrokeWidth(
        frame,
        bounds.width,
        bounds.height,
      )
      const [outer, inner] = splitPathPoints(
        createTexturedArtworkFramePathData(
          frame,
          { x: 0, y: 0, ...bounds },
          stroke,
        ),
      )
      const label =
        `${bounds.width}x${bounds.height} offset ${roughnessOffset}`

      assert.equal(countProperSegmentIntersections(outer ?? []), 0, label)
      assert.equal(countProperSegmentIntersections(inner ?? []), 0, label)
    }
  }
})

test('rocky lumpiness creates broad lobes while jaggedness creates sharp teeth', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 8,
    shape: 'circle',
    style: 'rocky',
    lumpiness: 0,
    jaggedness: 0,
    roughnessOffset: 0,
  } as const
  const bounds = { x: 0, y: 0, width: 100, height: 56 }
  const stroke = getArtworkFrameStrokeWidth(frame, bounds.width, bounds.height)
  const lumpyPath = createTexturedArtworkFramePathData(
    { ...frame, lumpiness: 100 },
    bounds,
    stroke,
  )
  const jaggedPath = createTexturedArtworkFramePathData(
    { ...frame, jaggedness: 100 },
    bounds,
    stroke,
  )
  const [lumpyOuter] = splitPathPoints(lumpyPath)
  const [jaggedOuter] = splitPathPoints(jaggedPath)
  const lumpySharpTurns = countSharpTurns(lumpyOuter ?? [], 0.45)
  const jaggedSharpTurns = countSharpTurns(jaggedOuter ?? [], 0.45)

  assert.equal(lumpyOuter!.length < jaggedOuter!.length, true)
  assert.equal(jaggedSharpTurns >= lumpySharpTurns * 4, true)
})

test('traced image content shape paths scale to artwork bounds', () => {
  const path = createScaledImageContentShapePathData(
    {
      width: 4,
      height: 2,
      path: 'M0 0 L4 0 L3 2 L0 2 Z',
    },
    { x: 10, y: 20, width: 80, height: 40 },
  )

  assert.equal(path, 'M 10 20 L 90 20 L 70 60 L 10 60 Z')
})

test('solid artwork frames keep the non-textured path', () => {
  const frame = {
    enabled: true,
    color: '#ffffff',
    width: 2,
    shape: 'circle',
    style: 'solid',
    lumpiness: 50,
    jaggedness: 50,
    roughnessOffset: 0,
  } as const

  assert.equal(isTexturedArtworkFrame(frame), false)
  assert.equal(getArtworkFrameTextureUrl(frame), null)
})
