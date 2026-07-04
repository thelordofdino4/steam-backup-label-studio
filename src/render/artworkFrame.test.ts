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
import {
  countProperSegmentIntersections,
  countSharpTurns,
  getPathNumbers,
  getPointBounds,
  splitPathPoints,
} from './artworkFrameTestGeometry.ts'

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
