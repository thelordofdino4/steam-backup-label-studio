import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBoxPositionedImageRenderArtifact,
  createImageRenderArtifact,
  createPercentPositionedImageRenderArtifact,
  createRectPositionedImageRenderArtifact,
  hasRenderableImageArtifact,
} from './imageRenderArtifact.ts'

test('image render artifacts omit empty image sources', () => {
  assert.equal(createImageRenderArtifact({ imageDataUrl: null }), null)
  assert.equal(createImageRenderArtifact({ imageDataUrl: '' }), null)
  assert.equal(hasRenderableImageArtifact({ imageDataUrl: null }), false)
  assert.equal(hasRenderableImageArtifact({ imageDataUrl: 'data:image/png;base64,test' }), true)
})

test('image render artifacts normalize label, alt text, and placeholder state', () => {
  assert.deepEqual(
    createImageRenderArtifact({
      imageDataUrl: 'data:image/png;base64,test',
      label: '  ',
    }),
    {
      imageDataUrl: 'data:image/png;base64,test',
      label: 'Image',
      alt: 'Image',
      isPlaceholderImage: false,
    },
  )

  assert.deepEqual(
    createImageRenderArtifact({
      imageDataUrl: 'data:image/png;base64:test',
      label: 'Audio mark',
      alt: '',
      isPlaceholderImage: true,
    }),
    {
      imageDataUrl: 'data:image/png;base64:test',
      label: 'Audio mark',
      alt: '',
      isPlaceholderImage: true,
    },
  )
})

test('percent positioned image artifacts preserve bounds and extra render data', () => {
  const artifact = createPercentPositionedImageRenderArtifact({
    imageDataUrl: 'data:image/png;base64:mark',
    label: 'Windows',
    value: 'windows',
    layout: { x: 20, y: 30, scale: 1.4 },
    unscaledBounds: { halfWidth: 3, halfHeight: 2 },
    scaledBounds: { halfWidth: 4.2, halfHeight: 2.8 },
  })

  assert.ok(artifact)
  assert.equal(artifact.value, 'windows')
  assert.deepEqual(artifact.layout, { x: 20, y: 30, scale: 1.4 })
  assert.deepEqual(artifact.scaledBounds, { halfWidth: 4.2, halfHeight: 2.8 })
})

test('rect and transformed box artifacts omit missing placement geometry', () => {
  assert.equal(
    createRectPositionedImageRenderArtifact({
      imageDataUrl: 'data:image/png;base64:rect',
      label: 'Rect image',
      rect: null,
    }),
    null,
  )
  assert.equal(
    createBoxPositionedImageRenderArtifact({
      imageDataUrl: 'data:image/png;base64:box',
      label: 'Box image',
      box: null,
    }),
    null,
  )
})

test('rect and transformed box artifacts preserve resolved geometry', () => {
  const rectArtifact = createRectPositionedImageRenderArtifact({
    imageDataUrl: 'data:image/png;base64:rect',
    label: 'Tray mark',
    rect: { x: 10, y: 20, width: 30, height: 40 },
  })
  const boxArtifact = createBoxPositionedImageRenderArtifact({
    imageDataUrl: 'data:image/png;base64:box',
    label: 'Spine mark',
    box: {
      center: { x: 50, y: 60 },
      width: 70,
      height: 80,
      rotationDegrees: 90,
    },
  })

  assert.ok(rectArtifact)
  assert.ok(boxArtifact)
  assert.deepEqual(rectArtifact.rect, { x: 10, y: 20, width: 30, height: 40 })
  assert.deepEqual(boxArtifact.box, {
    center: { x: 50, y: 60 },
    width: 70,
    height: 80,
    rotationDegrees: 90,
  })
})
