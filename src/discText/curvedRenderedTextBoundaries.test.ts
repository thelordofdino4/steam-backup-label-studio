import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCurvedDiscTextOffsetForSvgPoint,
  type CurvedDiscTextHostGeometry,
} from './curvedInlineEditorGeometry.ts'
import {
  getRenderedCurvedDiscTextBoundaryProgressesForElement,
  getSvgTextCharacterIndexForUtf16Offset,
} from './curvedRenderedTextBoundaries.ts'
import { getCurvedDiscTextLineGeometry } from './svgLayer.ts'

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
