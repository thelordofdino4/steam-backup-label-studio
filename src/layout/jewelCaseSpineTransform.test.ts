import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampTransformedBoxLayoutToBounds,
  getLocalTransformedBoxBounds,
  getTransformedBoundingSize,
  getTransformedBoxLayout,
  getVisualBoxFromLocalBounds,
  transformGlobalRectToLocal,
} from './jewelCaseSpineTransform.ts'

test('spine transform geometry swaps rotated bounding axes', () => {
  assert.deepEqual(
    getTransformedBoundingSize({
      width: 20,
      height: 80,
      rotationDegrees: 90,
    }),
    { width: 80, height: 20 },
  )
  assert.deepEqual(
    getTransformedBoundingSize({
      width: 20,
      height: 80,
      rotationDegrees: 0,
    }),
    { width: 20, height: 80 },
  )
})

test('spine transform geometry clamps boxes by moving their center', () => {
  const safeBounds = {
    x: 100,
    y: 200,
    width: 40,
    height: 120,
  }
  const box = getTransformedBoxLayout({
    safeBounds,
    width: 24,
    height: 80,
    rotationDegrees: 90,
    centerPercent: { x: 100, y: 100 },
  })
  const clampedBox = clampTransformedBoxLayoutToBounds(box, safeBounds)

  assert.deepEqual(box.boundingRect, {
    x: 100,
    y: 308,
    width: 80,
    height: 24,
  })
  assert.deepEqual(clampedBox.boundingRect, {
    x: 80,
    y: 296,
    width: 80,
    height: 24,
  })
  assert.deepEqual(clampedBox.center, {
    x: 120,
    y: 308,
  })
})

test('spine transform geometry maps local and global visual bounds', () => {
  const box = getTransformedBoxLayout({
    safeBounds: { x: 0, y: 0, width: 200, height: 100 },
    width: 40,
    height: 120,
    rotationDegrees: 90,
    centerPercent: { x: 50, y: 50 },
  })
  const localBounds = getLocalTransformedBoxBounds(box)
  const visualBox = getVisualBoxFromLocalBounds(box, {
    x: -10,
    y: -20,
    width: 20,
    height: 40,
  })
  const localRect = transformGlobalRectToLocal(
    visualBox.boundingRect,
    visualBox.center,
    visualBox.rotationDegrees,
  )

  assert.deepEqual(localBounds, {
    x: -20,
    y: -60,
    width: 40,
    height: 120,
  })
  assert.equal(Math.round(visualBox.boundingRect.width), 40)
  assert.equal(Math.round(visualBox.boundingRect.height), 20)
  assert.equal(Math.round(localRect.width), 20)
  assert.equal(Math.round(localRect.height), 40)
})
