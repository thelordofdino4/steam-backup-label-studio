import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCurvedDiscTextCaretFrame,
  getCurvedDiscTextEditorBoundsFromPaintBoxes,
  getCurvedDiscTextOffsetForClientPoint,
  getCurvedDiscTextOffsetForSvgPoint,
  getCurvedDiscTextSelectionFrames,
  type CurvedDiscTextHostGeometry,
} from './curvedInlineEditorGeometry.ts'
import {
  getRenderedCurvedDiscTextBoundaryProgressesForElement,
  getSvgTextCharacterIndexForUtf16Offset,
} from './curvedRenderedTextBoundaries.ts'
import { layoutCurvedText, normalizeAngleDegrees, type CurvedTextAlignment, type CurvedTextSide } from './curvedTextLayout.ts'
import { getCurvedDiscTextLineGeometry } from './svgLayer.ts'

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

function getVisualLineCenter(lineLayout: ReturnType<typeof layoutCurvedText>['lines'][number]) {
  return (lineLayout.startAngleDegrees + lineLayout.endAngleDegrees) / 2
}

test('center alignment derives the stable first-line block window', () => {
  const result = layout('center')

  assert.equal(result.blockStartAngleDegrees, 195)
  assert.equal(result.blockEndAngleDegrees, 355)
  assert.equal(result.lines[0].startAngleDegrees, 195)
  assert.equal(result.lines[0].endAngleDegrees, 355)
})

test('first curved line remains centered for every alignment', () => {
  for (const align of ['left', 'center', 'right'] as const) {
    const top = layoutCurvedText({
      side: 'top',
      centerAngleDegrees: 275,
      arcDegrees: 210,
      align,
      lines: [line('top', 160), line('lower', 90)],
    })
    const bottom = layoutCurvedText({
      side: 'bottom',
      centerAngleDegrees: 95,
      arcDegrees: 210,
      align,
      lines: [line('top', 160), line('lower', 90)],
    })

    assertApproximatelyEqual(getVisualLineCenter(top.lines[0]), 275)
    assertApproximatelyEqual(getVisualLineCenter(bottom.lines[0]), 95)
  }
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

test('center left and right align two and three wrapped lines from the first line arc edges', () => {
  const lines = [line('top', 160), line('lower 1', 90), line('lower 2', 70)]
  const center = layout('center', lines)
  const left = layout('left', lines)
  const right = layout('right', lines)

  for (const lineLayout of center.lines) {
    assertApproximatelyEqual(getVisualLineCenter(lineLayout), 275)
  }

  assert.equal(left.lines[1].startAngleDegrees, left.lines[0].startAngleDegrees)
  assert.equal(left.lines[2].startAngleDegrees, left.lines[0].startAngleDegrees)
  assert.equal(right.lines[1].endAngleDegrees, right.lines[0].endAngleDegrees)
  assert.equal(right.lines[2].endAngleDegrees, right.lines[0].endAngleDegrees)
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

test('curved line geometry records measured glyph boundary progress', () => {
  const measuredWidths = new Map([
    ['W', 30],
    ['I', 5],
    ['D', 18],
    ['E', 16],
  ])
  const geometry = getCurvedDiscTextLineGeometry({
    key: 'copyright',
    layout: {
      align: 'center',
      arcDegrees: 220,
      arcSide: 'top',
      avoidVisualElements: false,
      fontSizePt: 10,
      mode: 'curved',
      scale: 1,
      width: 52,
      x: 0,
      y: 0,
    },
    measureText: (text) =>
      Array.from(text).reduce(
        (total, character) => total + (measuredWidths.get(character) ?? 12),
        0,
      ),
    placement: 'bottom',
    safeZoneRadiusPercent: 42,
    text: 'WIDE',
  })
  const lineGeometry = geometry[0]

  assert.ok(lineGeometry?.boundaryProgresses)
  assert.equal(lineGeometry.boundaryProgresses.at(-1)?.offset, 'WIDE'.length)
  assert.ok(
    (lineGeometry.boundaryProgresses[1]?.progress ?? 0) > 0.25,
    'wide first glyph should move the first boundary past equal-width progress',
  )
  assert.ok(
    (lineGeometry.boundaryProgresses.at(-1)?.progress ?? 1) < 1,
    'glyph boundaries should occupy the rendered glyph span, not the paint-safe path padding',
  )
})

test('rendered curved SVG boundaries replace estimated glyph progress', () => {
  const geometry = getCurvedGeometryFixture({ text: 'WIDE' })
  const lineGeometry = geometry.lines[0]
  assert.ok(lineGeometry)

  const rawText = '  WIDE  '
  const progressByCharacter = new Map([
    [2, { end: 0.38, start: 0 }],
    [3, { end: 0.48, start: 0.38 }],
    [4, { end: 0.66, start: 0.48 }],
    [5, { end: 0.78, start: 0.66 }],
  ])
  const pointForProgress = (progress: number) =>
    getArcClientPoint({ geometry, progress })
  const textElement = {
    getEndPositionOfChar: (index: number) =>
      pointForProgress(progressByCharacter.get(index)?.end ?? 0),
    getExtentOfChar: (index: number) => {
      const start = pointForProgress(
        progressByCharacter.get(index)?.start ?? 0,
      )
      const end = pointForProgress(progressByCharacter.get(index)?.end ?? 0)

      return {
        height: Math.max(1, Math.abs(end.y - start.y)),
        width: Math.max(1, Math.abs(end.x - start.x)),
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
      }
    },
    getNumberOfChars: () => rawText.length,
    getStartPositionOfChar: (index: number) =>
      pointForProgress(progressByCharacter.get(index)?.start ?? 0),
    ownerSVGElement: null,
    textContent: rawText,
  } as unknown as Parameters<
    typeof getRenderedCurvedDiscTextBoundaryProgressesForElement
  >[0]['textElement']

  const boundaries = getRenderedCurvedDiscTextBoundaryProgressesForElement({
    line: lineGeometry,
    textElement,
  })

  assert.deepEqual(
    boundaries?.map((boundary) => boundary.offset),
    [0, 1, 2, 3, 4],
  )
  assertApproximatelyEqual(boundaries?.[1]?.progress ?? -1, 0.38)
  assertApproximatelyEqual(boundaries?.[2]?.progress ?? -1, 0.48)
  assertApproximatelyEqual(boundaries?.[3]?.progress ?? -1, 0.66)

  const renderedGeometry = {
    ...geometry,
    lines: [{ ...lineGeometry, boundaryProgresses: boundaries ?? [] }],
  }
  const afterWideW = getArcClientPoint({ geometry, progress: 0.38 })

  assert.deepEqual(
    getCurvedDiscTextOffsetForSvgPoint({
      geometry: renderedGeometry,
      x: afterWideW.x,
      y: afterWideW.y,
    }),
    { lineIndex: 0, offset: 1 },
  )
})

test('rendered SVG character mapping preserves UTF-16 grapheme offsets', () => {
  const text = 'A👩‍🚀e\u0301Z'

  assert.equal(
    getSvgTextCharacterIndexForUtf16Offset({
      renderedCharacterCount: text.length,
      text,
      utf16Offset: 6,
    }),
    6,
  )
  assert.equal(
    getSvgTextCharacterIndexForUtf16Offset({
      renderedCharacterCount: Array.from(text).length,
      text,
      utf16Offset: 6,
    }),
    4,
  )
  assert.equal(
    getSvgTextCharacterIndexForUtf16Offset({
      renderedCharacterCount: 4,
      text,
      utf16Offset: 8,
    }),
    3,
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
