import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInlinePreviewTextGeometryOffsetForClientPoint,
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

function clientPointForLocalPoint({
  hostHeight,
  hostRect,
  hostWidth,
  localX,
  localY,
  rotationDegrees,
}: {
  hostHeight: number
  hostRect: Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>
  hostWidth: number
  localX: number
  localY: number
  rotationDegrees: number
}) {
  const centerX = hostRect.left + hostRect.width / 2
  const centerY = hostRect.top + hostRect.height / 2
  const radians = rotationDegrees * Math.PI / 180
  const translatedX = localX - hostWidth / 2
  const translatedY = localY - hostHeight / 2

  return {
    clientX:
      centerX +
      translatedX * Math.cos(radians) -
      translatedY * Math.sin(radians),
    clientY:
      centerY +
      translatedX * Math.sin(radians) +
      translatedY * Math.cos(radians),
  }
}

const spineGeometryLines = [
  {
    caretXRatios: [0, 0.25, 0.5, 0.75, 1],
    heightRatio: 0.5,
    topRatio: 0,
  },
  {
    caretXRatios: [0.1, 0.35, 0.65, 0.9],
    heightRatio: 0.5,
    topRatio: 0.5,
  },
] as const

test('inline text geometry point mapping anchors clockwise spine offsets at the pointer', () => {
  const points = [
    { expectedOffset: 0, localX: 2 },
    { expectedOffset: 2, localX: 50 },
    { expectedOffset: 4, localX: 98 },
  ]

  for (const point of points) {
    assert.deepEqual(
      getInlinePreviewTextGeometryOffsetForClientPoint({
        ...clientPointForLocalPoint({
          hostHeight: 40,
          hostRect,
          hostWidth: 100,
          localX: point.localX,
          localY: 10,
          rotationDegrees: 90,
        }),
        geometryLines: spineGeometryLines,
        hostHeight: 40,
        hostRect,
        hostWidth: 100,
        rotationDegrees: 90,
      }),
      {
        lineIndex: 0,
        offset: point.expectedOffset,
      },
    )
  }
})

test('inline text geometry point mapping anchors counter-clockwise spine offsets at the pointer', () => {
  const points = [
    { expectedOffset: 0, localX: 2 },
    { expectedOffset: 2, localX: 50 },
    { expectedOffset: 4, localX: 98 },
  ]

  for (const point of points) {
    assert.deepEqual(
      getInlinePreviewTextGeometryOffsetForClientPoint({
        ...clientPointForLocalPoint({
          hostHeight: 40,
          hostRect,
          hostWidth: 100,
          localX: point.localX,
          localY: 10,
          rotationDegrees: -90,
        }),
        geometryLines: spineGeometryLines,
        hostHeight: 40,
        hostRect,
        hostWidth: 100,
        rotationDegrees: -90,
      }),
      {
        lineIndex: 0,
        offset: point.expectedOffset,
      },
    )
  }
})

test('inline text geometry point mapping preserves multiline rotated spine offsets', () => {
  const point = clientPointForLocalPoint({
    hostHeight: 40,
    hostRect,
    hostWidth: 100,
    localX: 64,
    localY: 30,
    rotationDegrees: 90,
  })

  assert.deepEqual(
    getInlinePreviewTextGeometryOffsetForClientPoint({
      ...point,
      geometryLines: spineGeometryLines,
      hostHeight: 40,
      hostRect,
      hostWidth: 100,
      rotationDegrees: 90,
    }),
    {
      lineIndex: 1,
      offset: 2,
    },
  )
})
