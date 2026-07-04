import assert from 'node:assert/strict'
import test from 'node:test'
import {
  layoutCurvedText,
  normalizeAngleDegrees,
  type CurvedTextAlignment,
  type CurvedTextSide,
} from './curvedTextLayout.ts'

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
