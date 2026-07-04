import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCurvedLinePaintBox,
  getCurvedLinePaintSegmentBoxes,
  getCurvedUnderlineRadius,
} from './curvedTextPaintGeometry.ts'

const plainStyle = {
  contrast: 'none',
  underline: false,
}

const decoratedStyle = {
  contrast: 'strokeShadow',
  underline: true,
}

function lineLayout(overrides: Partial<Parameters<typeof getCurvedLinePaintBox>[0]['lineLayout']> = {}) {
  return {
    angleWidthDegrees: 36,
    radius: 40,
    startAngleDegrees: 250,
    ...overrides,
  }
}

test('curved underline radius moves top and bottom arcs to the visual underline side', () => {
  assert.equal(getCurvedUnderlineRadius(true, 10, 2), 9.16)
  assert.equal(getCurvedUnderlineRadius(false, 10, 2), 10.84)
  assert.equal(getCurvedUnderlineRadius(true, 0.2, 4), 1)
})

test('curved paint boxes expand for underline, stroke, and shadow slack', () => {
  const plainBox = getCurvedLinePaintBox({
    fontSize: 1,
    isTopArc: true,
    lineLayout: lineLayout(),
    renderStyle: plainStyle,
  })
  const decoratedBox = getCurvedLinePaintBox({
    fontSize: 4,
    isTopArc: true,
    lineLayout: lineLayout(),
    renderStyle: decoratedStyle,
  })

  assert.ok(plainBox)
  assert.ok(decoratedBox)
  assert.ok(decoratedBox.left < plainBox.left)
  assert.ok(decoratedBox.right > plainBox.right)
  assert.ok(decoratedBox.top < plainBox.top)
  assert.ok(decoratedBox.bottom > plainBox.bottom)
})

test('curved collision paint boxes segment wide arcs into small measurable boxes', () => {
  const boxes = getCurvedLinePaintSegmentBoxes({
    fontSize: 2,
    isTopArc: true,
    lineLayout: lineLayout({ angleWidthDegrees: 25 }),
    renderStyle: decoratedStyle,
  })

  assert.equal(boxes.length, 4)
  assert.ok(boxes.every((box) =>
    Number.isFinite(box.left) &&
      Number.isFinite(box.right) &&
      Number.isFinite(box.top) &&
      Number.isFinite(box.bottom)))
})
