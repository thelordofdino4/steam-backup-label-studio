import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCurvedDiscTextCaretFrame,
  getCurvedDiscTextEditorBoundsFromPaintBoxes,
  getCurvedDiscTextOffsetForClientPoint,
  getCurvedDiscTextSelectionFrames,
  type CurvedDiscTextHostGeometry,
} from './curvedInlineEditorGeometry.ts'
import { layoutCurvedText, normalizeAngleDegrees, type CurvedTextAlignment, type CurvedTextSide } from './curvedTextLayout.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
  )
}

function line(text: string, angleDegrees: number, radius = 100) {
  return {
    text,
    measuredWidth: radius * ((angleDegrees * Math.PI) / 180),
    radius,
  }
}

function layout(align: CurvedTextAlignment, lines = [line('top', 160), line('lower', 90)]) {
  return layoutCurvedText({
    side: 'top',
    centerAngleDegrees: 275,
    arcDegrees: 210,
    align,
    lines,
  })
}

test('center alignment derives the stable first-line block window', () => {
  const result = layout('center')

  assert.equal(result.blockStartAngleDegrees, 195)
  assert.equal(result.blockEndAngleDegrees, 355)
  assert.equal(result.lines[0].startAngleDegrees, 195)
  assert.equal(result.lines[0].endAngleDegrees, 355)
})

test('left and right align inside the center-derived block window', () => {
  const left = layout('left')
  const right = layout('right')

  assert.equal(left.blockStartAngleDegrees, 195)
  assert.equal(left.lines[0].startAngleDegrees, 195)
  assert.equal(left.lines[1].startAngleDegrees, 195)

  assert.equal(right.blockEndAngleDegrees, 355)
  assert.equal(right.lines[0].endAngleDegrees, 355)
  assert.equal(right.lines[1].endAngleDegrees, 355)
})

test('wrapped lines do not change the top-line block window', () => {
  const fewLines = layout('left', [line('top', 160), line('lower', 90)])
  const moreLines = layout('left', [
    line('top', 160),
    line('lower 1', 80),
    line('lower 2', 70),
    line('lower 3', 60),
  ])

  assert.equal(moreLines.blockStartAngleDegrees, fewLines.blockStartAngleDegrees)
  assert.equal(moreLines.blockEndAngleDegrees, fewLines.blockEndAngleDegrees)
})

test('lines are clamped to the shared block window', () => {
  const result = layout('left', [line('top', 160), line('too long', 220)])

  assert.equal(result.blockStartAngleDegrees, 195)
  assert.equal(result.blockEndAngleDegrees, 355)
  assert.equal(result.lines[1].startAngleDegrees, 195)
  assert.equal(result.lines[1].endAngleDegrees, 355)
})

test('bottom arcs follow the same semantic left and right edges', () => {
  const makeLayout = (side: CurvedTextSide, align: CurvedTextAlignment) =>
    layoutCurvedText({
      side,
      centerAngleDegrees: side === 'top' ? 275 : 95,
      arcDegrees: 210,
      align,
      lines: [line('top', 160), line('lower', 90)],
    })

  const topLeft = makeLayout('top', 'left')
  const bottomLeft = makeLayout('bottom', 'left')
  const topRight = makeLayout('top', 'right')
  const bottomRight = makeLayout('bottom', 'right')

  assert.equal(topLeft.lines[1].startAngleDegrees, topLeft.blockStartAngleDegrees)
  assert.equal(bottomLeft.lines[1].startAngleDegrees, bottomLeft.blockStartAngleDegrees)
  assert.equal(topRight.lines[1].endAngleDegrees, topRight.blockEndAngleDegrees)
  assert.equal(bottomRight.lines[1].endAngleDegrees, bottomRight.blockEndAngleDegrees)
})

test('minimum default and maximum raw arcs still derive the block from centered text', () => {
  for (const arcDegrees of [80, 210, 320]) {
    const result = layoutCurvedText({
      side: 'top',
      centerAngleDegrees: 275,
      arcDegrees,
      align: 'left',
      lines: [line('top', 120), line('lower', 60)],
    })

    assertApproximatelyEqual(result.blockWindowDegrees, Math.min(arcDegrees, 120))
    assert.equal(result.lines[1].startAngleDegrees, result.blockStartAngleDegrees)
  }
})

test('angle normalization keeps app visual convention values in 0 to 360 degrees', () => {
  assert.equal(normalizeAngleDegrees(450), 90)
  assert.equal(normalizeAngleDegrees(-90), 270)
})

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
