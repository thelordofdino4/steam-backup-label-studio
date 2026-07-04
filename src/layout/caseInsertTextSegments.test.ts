import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAvoidanceLineSegments,
  getLineSegmentAnchorX,
  getPreferredSegment,
  getTextLayoutStartY,
  rectsOverlap,
} from './caseInsertTextSegments.ts'

const reservedBounds = {
  x: 10,
  y: 20,
  width: 100,
  height: 80,
}

test('case insert text segments preserve top and centered vertical starts', () => {
  assert.equal(
    getTextLayoutStartY({
      reservedBounds,
      padding: 5,
      innerHeight: 70,
      lineCount: 2,
      lineHeightPx: 10,
      verticalAlign: 'top',
    }),
    25,
  )
  assert.equal(
    getTextLayoutStartY({
      reservedBounds,
      padding: 5,
      innerHeight: 70,
      lineCount: 2,
      lineHeightPx: 10,
      verticalAlign: 'center',
    }),
    50,
  )
})

test('case insert text segments choose alignment-preferred open space', () => {
  const baseSegment = { left: 10, right: 110 }
  const segments = [
    { left: 10, right: 30 },
    { left: 40, right: 95 },
    { left: 100, right: 110 },
  ]

  assert.deepEqual(getPreferredSegment(segments, 'left', baseSegment), segments[0])
  assert.deepEqual(getPreferredSegment(segments, 'right', baseSegment), segments[2])
  assert.deepEqual(getPreferredSegment(segments, 'center', baseSegment), segments[1])
})

test('case insert text segment overlap uses positive intersection area', () => {
  const rect = { x: 10, y: 20, width: 30, height: 40 }

  assert.equal(
    rectsOverlap(rect, { x: 39, y: 59, width: 10, height: 10 }),
    true,
  )
  assert.equal(
    rectsOverlap(rect, { x: 40, y: 20, width: 10, height: 10 }),
    false,
  )
  assert.equal(
    rectsOverlap(rect, { x: 10, y: 60, width: 10, height: 10 }),
    false,
  )
})

test('case insert text segments subtract overlapping avoidance regions per line', () => {
  const segments = getAvoidanceLineSegments({
    reservedBounds,
    padding: 0,
    innerHeight: 80,
    lineCount: 2,
    lineHeightPx: 10,
    align: 'left',
    verticalAlign: 'top',
    avoidanceRegions: [{
      bounds: {
        x: 20,
        y: 15,
        width: 30,
        height: 1,
      },
    }],
  })

  assert.ok(segments[0].right <= 20)
  assert.deepEqual(segments[1], {
    left: reservedBounds.x,
    right: reservedBounds.x + reservedBounds.width,
    y: reservedBounds.y + 10,
  })
  assert.equal(getLineSegmentAnchorX(segments[0], 'left'), segments[0].left)
  assert.equal(getLineSegmentAnchorX(segments[0], 'right'), segments[0].right)
})
