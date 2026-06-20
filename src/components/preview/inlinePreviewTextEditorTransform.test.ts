import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mapClientPointToInlineTextHostLocalPoint,
} from './inlinePreviewTextEditorTransform.ts'

const hostRect = {
  height: 100,
  left: 100,
  top: 200,
  width: 40,
}

test('inline text point mapping preserves unrotated local coordinates', () => {
  assert.deepEqual(
    mapClientPointToInlineTextHostLocalPoint({
      clientX: 112,
      clientY: 234,
      hostHeight: 100,
      hostRect,
      hostWidth: 40,
    }),
    { x: 12, y: 34 },
  )
})

test('inline text point mapping inverts clockwise spine rotation', () => {
  const localPoint = mapClientPointToInlineTextHostLocalPoint({
    clientX: 120,
    clientY: 230,
    hostHeight: 40,
    hostRect,
    hostWidth: 100,
    rotationDegrees: 90,
  })

  assert.equal(Math.round(localPoint.x), 30)
  assert.equal(Math.round(localPoint.y), 20)
})

test('inline text point mapping inverts counter-clockwise spine rotation', () => {
  const localPoint = mapClientPointToInlineTextHostLocalPoint({
    clientX: 120,
    clientY: 270,
    hostHeight: 40,
    hostRect,
    hostWidth: 100,
    rotationDegrees: -90,
  })

  assert.equal(Math.round(localPoint.x), 30)
  assert.equal(Math.round(localPoint.y), 20)
})
