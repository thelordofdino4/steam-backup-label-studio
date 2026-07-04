import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInlineEdgeDragStartPoint,
  getRectDelta,
  getRectOverlap,
  rectsOverlap,
  rectsOverlapMeaningfully,
} from './text-editor-smoke-inline-movement.mjs'

test('text editor smoke movement geometry computes rect deltas and overlap', () => {
  const first = { bottom: 20, left: 10, right: 30, top: 0 }
  const second = { bottom: 28, left: 18, right: 38, top: 8 }
  const adjacent = { bottom: 20, left: 30, right: 50, top: 0 }

  assert.deepEqual(getRectDelta(first, second), { left: 8, top: 8 })
  assert.equal(rectsOverlap(first, second), true)
  assert.deepEqual(getRectOverlap(first, second), { height: 12, width: 12 })
  assert.equal(rectsOverlap(first, adjacent), false)
  assert.deepEqual(getRectOverlap(first, adjacent), { height: 20, width: 0 })
})

test('text editor smoke meaningful overlap honors tolerance', () => {
  const first = { bottom: 20, left: 0, right: 20, top: 0 }
  const smallOverlap = { bottom: 8, left: 14, right: 30, top: 2 }
  const largeOverlap = { bottom: 18, left: 10, right: 30, top: 4 }

  assert.equal(rectsOverlapMeaningfully(first, smallOverlap), false)
  assert.equal(rectsOverlapMeaningfully(first, largeOverlap), true)
  assert.equal(rectsOverlapMeaningfully(first, smallOverlap, 3), true)
})

test('text editor smoke edge drag start point stays inside each edge handle', () => {
  const edgeRect = {
    bottom: 140,
    height: 40,
    left: 50,
    right: 90,
    top: 100,
    width: 40,
  }

  assert.deepEqual(getInlineEdgeDragStartPoint(edgeRect, 'right'), {
    x: 51,
    y: 120,
  })
  assert.deepEqual(getInlineEdgeDragStartPoint(edgeRect, 'left'), {
    x: 89,
    y: 120,
  })
  assert.deepEqual(getInlineEdgeDragStartPoint(edgeRect, 'bottom-right'), {
    x: 89,
    y: 139,
  })
  assert.deepEqual(getInlineEdgeDragStartPoint(edgeRect, 'top-left'), {
    x: 51,
    y: 101,
  })
})
