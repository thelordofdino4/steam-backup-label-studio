import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCurvedDiscTextSelectionFrames,
  type CurvedDiscTextHostGeometry,
} from './curvedInlineEditorGeometry.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
  )
}

function getCurvedGeometryFixture(
  overrides: Partial<CurvedDiscTextHostGeometry['lines'][number]> = {},
): CurvedDiscTextHostGeometry {
  return {
    bounds: {
      centerX: 50,
      centerY: 25,
      halfHeight: 25,
      halfWidth: 50,
    },
    lines: [{
      angleWidthDegrees: 180,
      centerAngleDegrees: 270,
      endAngleDegrees: 360,
      fontSize: 4,
      isTopArc: true,
      letterSpacing: 0,
      radius: 40,
      startAngleDegrees: 180,
      text: 'ABCDE',
      ...overrides,
    }],
  }
}

function getArcClientPoint({
  geometry,
  lineIndex = 0,
  progress,
}: {
  geometry: CurvedDiscTextHostGeometry
  lineIndex?: number
  progress: number
}) {
  const lineGeometry = geometry.lines[lineIndex]
  assert.ok(lineGeometry)

  const direction = lineGeometry.isTopArc ? 1 : -1
  const angleDegrees = lineGeometry.startAngleDegrees +
    direction * lineGeometry.angleWidthDegrees * progress
  const radians = (angleDegrees * Math.PI) / 180

  return {
    x: 50 + Math.cos(radians) * lineGeometry.radius,
    y: 50 + Math.sin(radians) * lineGeometry.radius,
  }
}

function getSelectionArcEndpoints(pathD: string) {
  const parts = pathD.split(/\s+/)
  assert.equal(parts[0], 'M')
  assert.equal(parts[3], 'A')

  return {
    end: {
      x: Number(parts[9]),
      y: Number(parts[10]),
    },
    start: {
      x: Number(parts[1]),
      y: Number(parts[2]),
    },
  }
}

function assertPointApproximatelyEqual(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
) {
  assertApproximatelyEqual(actual.x, Number(expected.x.toFixed(3)))
  assertApproximatelyEqual(actual.y, Number(expected.y.toFixed(3)))
}

function getPointDistance(
  first: { x: number; y: number },
  second: { x: number; y: number },
) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

test('curved geometry returns arc-following selection paths for dragged ranges', () => {
  const frames = getCurvedDiscTextSelectionFrames({
    caretValue: 'ABCDE',
    geometry: getCurvedGeometryFixture(),
    hostHeight: 50,
    hostWidth: 100,
    lines: [{ text: 'ABCDE' }],
    selection: { start: 1, end: 4 },
  })

  assert.equal(frames.length, 1)
  assert.ok(frames[0].pathD?.includes(' A '))
  assert.equal(frames[0].viewportHeight, 50)
  assert.equal(frames[0].viewportWidth, 100)
  assert.ok(frames[0].strokeWidth >= 8)
  assert.ok(frames[0].width > 2)
  assert.ok(frames[0].height >= 8)
  assert.ok(Number.isFinite(frames[0].rotationDegrees))
})

test('curved selection paths support reverse and bottom arc selections', () => {
  const topFrames = getCurvedDiscTextSelectionFrames({
    caretValue: 'ABCDE',
    geometry: getCurvedGeometryFixture(),
    hostHeight: 50,
    hostWidth: 100,
    lines: [{ text: 'ABCDE' }],
    selection: { start: 4, end: 1 },
  })
  const bottomFrames = getCurvedDiscTextSelectionFrames({
    caretValue: 'ABCDE',
    geometry: getCurvedGeometryFixture({
      centerAngleDegrees: 90,
      endAngleDegrees: 0,
      isTopArc: false,
      startAngleDegrees: 180,
    }),
    hostHeight: 50,
    hostWidth: 100,
    lines: [{ text: 'ABCDE' }],
    selection: { start: 1, end: 4 },
  })

  assert.equal(topFrames.length, 1)
  assert.equal(bottomFrames.length, 1)
  assert.ok(topFrames[0].pathD?.includes(' 1 '))
  assert.ok(bottomFrames[0].pathD?.includes(' 0 '))
  assert.notEqual(topFrames[0].pathD, bottomFrames[0].pathD)
})

test('curved single-character selection paths stop at rendered insertion boundaries', () => {
  const boundaryProgresses = [
    { offset: 0, progress: 0.03 },
    { offset: 1, progress: 0.38 },
    { offset: 2, progress: 0.48 },
    { offset: 3, progress: 0.66 },
    { offset: 4, progress: 0.78 },
  ]
  const geometry = getCurvedGeometryFixture({
    boundaryProgresses,
    text: 'WIDE',
  })

  for (let index = 0; index < 'WIDE'.length; index += 1) {
    const frame = getCurvedDiscTextSelectionFrames({
      caretValue: 'WIDE',
      geometry,
      hostHeight: 50,
      hostWidth: 100,
      lines: [{ text: 'WIDE' }],
      selection: { start: index, end: index + 1 },
    })[0]

    assert.ok(frame?.pathD)
    const endpoints = getSelectionArcEndpoints(frame.pathD)
    assertPointApproximatelyEqual(
      endpoints.start,
      getArcClientPoint({
        geometry,
        progress: boundaryProgresses[index]?.progress ?? 0,
      }),
    )
    assertPointApproximatelyEqual(
      endpoints.end,
      getArcClientPoint({
        geometry,
        progress: boundaryProgresses[index + 1]?.progress ?? 0,
      }),
    )
  }
})

test('curved word selection excludes adjacent character boundaries', () => {
  const boundaryProgresses = [
    { offset: 0, progress: 0.02 },
    { offset: 1, progress: 0.13 },
    { offset: 2, progress: 0.24 },
    { offset: 3, progress: 0.35 },
    { offset: 4, progress: 0.46 },
    { offset: 5, progress: 0.55 },
    { offset: 6, progress: 0.61 },
    { offset: 7, progress: 0.68 },
    { offset: 8, progress: 0.77 },
    { offset: 9, progress: 0.86 },
  ]
  const geometry = getCurvedGeometryFixture({
    boundaryProgresses,
    text: 'WIDE TEST',
  })
  const forwardFrame = getCurvedDiscTextSelectionFrames({
    caretValue: 'WIDE TEST',
    geometry,
    hostHeight: 50,
    hostWidth: 100,
    lines: [{ text: 'WIDE TEST' }],
    selection: { start: 5, end: 9 },
  })[0]
  const reverseFrame = getCurvedDiscTextSelectionFrames({
    caretValue: 'WIDE TEST',
    geometry,
    hostHeight: 50,
    hostWidth: 100,
    lines: [{ text: 'WIDE TEST' }],
    selection: { start: 9, end: 5 },
  })[0]

  assert.ok(forwardFrame?.pathD)
  assert.equal(forwardFrame.pathD, reverseFrame?.pathD)
  const endpoints = getSelectionArcEndpoints(forwardFrame.pathD)
  assertPointApproximatelyEqual(
    endpoints.start,
    getArcClientPoint({
      geometry,
      progress: boundaryProgresses[5]?.progress ?? 0,
    }),
  )
  assertPointApproximatelyEqual(
    endpoints.end,
    getArcClientPoint({
      geometry,
      progress: boundaryProgresses[9]?.progress ?? 0,
    }),
  )
  assert.ok(
    getPointDistance(
      endpoints.start,
      getArcClientPoint({
        geometry,
        progress: boundaryProgresses[4]?.progress ?? 0,
      }),
    ) > 1,
  )
})

test('curved selection boundary paths support bottom arcs and grapheme offsets', () => {
  const text = 'A😀e\u0301Z'
  const boundaryProgresses = [
    { offset: 0, progress: 0.1 },
    { offset: 1, progress: 0.28 },
    { offset: 3, progress: 0.52 },
    { offset: 5, progress: 0.72 },
    { offset: 6, progress: 0.9 },
  ]
  const geometry = getCurvedGeometryFixture({
    boundaryProgresses,
    centerAngleDegrees: 90,
    endAngleDegrees: 0,
    isTopArc: false,
    startAngleDegrees: 180,
    text,
  })
  const emojiFrame = getCurvedDiscTextSelectionFrames({
    caretValue: text,
    geometry,
    hostHeight: 50,
    hostWidth: 100,
    lines: [{ text }],
    selection: { start: 1, end: 3 },
  })[0]
  const combiningFrame = getCurvedDiscTextSelectionFrames({
    caretValue: text,
    geometry,
    hostHeight: 50,
    hostWidth: 100,
    lines: [{ text }],
    selection: { start: 3, end: 5 },
  })[0]

  assert.ok(emojiFrame?.pathD)
  assert.ok(combiningFrame?.pathD)
  const emojiEndpoints = getSelectionArcEndpoints(emojiFrame.pathD)
  const combiningEndpoints = getSelectionArcEndpoints(combiningFrame.pathD)
  assertPointApproximatelyEqual(
    emojiEndpoints.start,
    getArcClientPoint({
      geometry,
      progress: boundaryProgresses[1]?.progress ?? 0,
    }),
  )
  assertPointApproximatelyEqual(
    emojiEndpoints.end,
    getArcClientPoint({
      geometry,
      progress: boundaryProgresses[2]?.progress ?? 0,
    }),
  )
  assertPointApproximatelyEqual(
    combiningEndpoints.start,
    getArcClientPoint({
      geometry,
      progress: boundaryProgresses[2]?.progress ?? 0,
    }),
  )
  assertPointApproximatelyEqual(
    combiningEndpoints.end,
    getArcClientPoint({
      geometry,
      progress: boundaryProgresses[3]?.progress ?? 0,
    }),
  )
})
