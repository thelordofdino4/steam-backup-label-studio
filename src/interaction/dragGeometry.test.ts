import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OFFSET_DRAG_POINT_RANGE,
  PERCENT_DRAG_POINT_RANGE,
  clampDragPointToRange,
  createElementPercentDragState,
  createPercentDragState,
  createPixelDragState,
  getDraggedPercentPoint,
  getDraggedPixelOffset,
} from './dragGeometry.ts'

test('percent drag adapter converts pointer delta into percent-space movement', () => {
  const dragState = createPercentDragState(7, 20, 40, 30, 45)
  const draggedPoint = getDraggedPercentPoint(
    dragState,
    70,
    90,
    {
      width: 200,
      height: 100,
    },
  )

  assert.deepEqual(draggedPoint, {
    x: 55,
    y: 95,
  })
})

test('element percent drag state preserves target metadata', () => {
  const dragState = createElementPercentDragState(
    9,
    12,
    18,
    50,
    60,
    {
      targetId: 'rating-badge',
      targetKind: 'branding',
    },
  )

  assert.equal(dragState.pointerId, 9)
  assert.equal(dragState.targetId, 'rating-badge')
  assert.equal(dragState.targetKind, 'branding')
  assert.equal(dragState.startX, 50)
  assert.equal(dragState.startY, 60)
})

test('drag point range clamps percent and offset coordinate spaces', () => {
  assert.deepEqual(
    clampDragPointToRange({ x: -12, y: 140 }, PERCENT_DRAG_POINT_RANGE),
    {
      x: 0,
      y: 100,
    },
  )
  assert.deepEqual(
    clampDragPointToRange({ x: -140, y: 150 }, OFFSET_DRAG_POINT_RANGE),
    {
      x: -100,
      y: 100,
    },
  )
})

test('pixel drag adapter preserves raw pointer pixel movement', () => {
  const dragState = createPixelDragState(12, 100, 150, {
    x: -20,
    y: 35,
  })

  assert.deepEqual(getDraggedPixelOffset(dragState, 130, 110), {
    x: 10,
    y: -5,
  })
})

test('pixel drag adapter can compensate for preview viewport scale', () => {
  const dragState = createPixelDragState(12, 100, 150, {
    x: -20,
    y: 35,
  })

  assert.deepEqual(getDraggedPixelOffset(dragState, 130, 110, 2), {
    x: -5,
    y: 15,
  })
})
