import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCurvedDiscTextCaretFrame,
  getCurvedDiscTextEditorBoundsFromPaintBoxes,
  getCurvedDiscTextOffsetForClientPoint,
  type CurvedDiscTextHostGeometry,
} from './curvedInlineEditorGeometry.ts'

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

test('curved editor bounds union tight painted SVG boxes instead of the full arc window', () => {
  const bounds = getCurvedDiscTextEditorBoundsFromPaintBoxes({
    boxes: [
      { bottom: 15, left: 21, right: 42, top: 11 },
      { bottom: 18, left: 28, right: 58, top: 14 },
    ],
    paintSlackPercent: 1,
  })

  assert.deepEqual(bounds, {
    centerX: 39.5,
    centerY: 14.5,
    halfHeight: 4.5,
    halfWidth: 19.5,
  })
})

test('curved editor bounds include underline stroke and shadow slack while staying inside preview', () => {
  const bounds = getCurvedDiscTextEditorBoundsFromPaintBoxes({
    boxes: [
      { bottom: 100.5, left: 70, right: 101.25, top: 96 },
      { bottom: 99.4, left: 74, right: 99.8, top: 98.8 },
    ],
    paintSlackPercent: 2,
  })

  assert.deepEqual(bounds, {
    centerX: 84,
    centerY: 97,
    halfHeight: 3,
    halfWidth: 16,
  })
})

test('curved editor bounds return null when SVG textPath lines are not measurable yet', () => {
  assert.equal(
    getCurvedDiscTextEditorBoundsFromPaintBoxes({
      boxes: [
        { bottom: 8, left: 8, right: 8, top: 8 },
        { bottom: Number.NaN, left: 0, right: 10, top: 0 },
      ],
    }),
    null,
  )
})

test('curved geometry maps pointer-down positions to nearest text offsets', () => {
  const geometry = getCurvedGeometryFixture()
  const common = {
    geometry,
    hostHeight: 50,
    hostRect: { height: 50, left: 0, top: 0, width: 100 },
    hostWidth: 100,
  }

  assert.deepEqual(
    getCurvedDiscTextOffsetForClientPoint({
      ...common,
      clientX: 10,
      clientY: 50,
    }),
    { lineIndex: 0, offset: 0 },
  )
  assert.deepEqual(
    getCurvedDiscTextOffsetForClientPoint({
      ...common,
      clientX: 50,
      clientY: 10,
    }),
    { lineIndex: 0, offset: 3 },
  )
  assert.deepEqual(
    getCurvedDiscTextOffsetForClientPoint({
      ...common,
      clientX: 90,
      clientY: 50,
    }),
    { lineIndex: 0, offset: 5 },
  )
})

test('curved hit testing caret and keyboard mutation share measured boundaries', () => {
  const geometry = getCurvedGeometryFixture({
    boundaryProgresses: [
      { offset: 0, progress: 0 },
      { offset: 1, progress: 0.38 },
      { offset: 2, progress: 0.48 },
      { offset: 3, progress: 0.66 },
      { offset: 4, progress: 0.78 },
    ],
    text: 'WIDE',
  })
  const common = {
    geometry,
    hostHeight: 50,
    hostRect: { height: 50, left: 0, top: 0, width: 100 },
    hostWidth: 100,
  }
  const boundaryAfterW = getArcClientPoint({ geometry, progress: 0.38 })
  const hitOffset = getCurvedDiscTextOffsetForClientPoint({
    ...common,
    clientX: boundaryAfterW.x,
    clientY: boundaryAfterW.y,
  })
  const caret = getCurvedDiscTextCaretFrame({
    caretValue: 'WIDE',
    geometry,
    hostHeight: 50,
    hostWidth: 100,
    lines: [{ text: 'WIDE' }],
    selectionFocus: 1,
  })
  const backspaceResult = 'WIDE'.slice(0, 0) + 'WIDE'.slice(1)
  const deleteResult = 'WIDE'.slice(0, 1) + 'WIDE'.slice(2)

  assert.deepEqual(hitOffset, { lineIndex: 0, offset: 1 })
  assert.ok(caret?.pathD?.includes(' L '))
  assert.equal(backspaceResult, 'IDE')
  assert.equal(deleteResult, 'WDE')
})

test('curved boundaries preserve surrogate pairs and combining marks as UTF-16 offsets', () => {
  const text = 'A👩‍🚀e\u0301Z'
  const geometry = getCurvedGeometryFixture({
    boundaryProgresses: [
      { offset: 0, progress: 0 },
      { offset: 1, progress: 0.2 },
      { offset: 6, progress: 0.45 },
      { offset: 8, progress: 0.7 },
      { offset: 9, progress: 0.9 },
    ],
    text,
  })
  const common = {
    geometry,
    hostHeight: 50,
    hostRect: { height: 50, left: 0, top: 0, width: 100 },
    hostWidth: 100,
  }
  const afterEmoji = getArcClientPoint({ geometry, progress: 0.45 })
  const afterCombiningMark = getArcClientPoint({ geometry, progress: 0.7 })

  assert.deepEqual(
    getCurvedDiscTextOffsetForClientPoint({
      ...common,
      clientX: afterEmoji.x,
      clientY: afterEmoji.y,
    }),
    { lineIndex: 0, offset: 6 },
  )
  assert.deepEqual(
    getCurvedDiscTextOffsetForClientPoint({
      ...common,
      clientX: afterCombiningMark.x,
      clientY: afterCombiningMark.y,
    }),
    { lineIndex: 0, offset: 8 },
  )
})

test('curved geometry creates radial caret frames for top and bottom arcs', () => {
  const topCaret = getCurvedDiscTextCaretFrame({
    caretValue: 'ABCDE',
    geometry: getCurvedGeometryFixture(),
    hostHeight: 50,
    hostWidth: 100,
    lines: [{ text: 'ABCDE' }],
    selectionFocus: 5,
  })
  const bottomCaret = getCurvedDiscTextCaretFrame({
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
    selectionFocus: 5,
  })

  assert.ok(topCaret)
  assert.ok(bottomCaret)
  assert.equal(topCaret.rotationDegrees, 270)
  assert.equal(bottomCaret.rotationDegrees, 270)
  assert.ok(topCaret.height >= 8)
  assert.ok(bottomCaret.height >= 8)
})

test('curved geometry returns caret paths at beginning middle and end', () => {
  const geometry = getCurvedGeometryFixture()

  const carets = [0, 2, 5].map((selectionFocus) =>
    getCurvedDiscTextCaretFrame({
      caretValue: 'ABCDE',
      geometry,
      hostHeight: 50,
      hostWidth: 100,
      lines: [{ text: 'ABCDE' }],
      selectionFocus,
    }))

  for (const caret of carets) {
    assert.ok(caret)
    assert.ok(caret.pathD?.startsWith('M '))
    assert.ok(caret.pathD?.includes(' L '))
    assert.equal(caret.viewportHeight, 50)
    assert.equal(caret.viewportWidth, 100)
    assert.equal(caret.strokeWidth, 2)
  }

  assert.notEqual(carets[0]?.pathD, carets[1]?.pathD)
  assert.notEqual(carets[1]?.pathD, carets[2]?.pathD)
})
