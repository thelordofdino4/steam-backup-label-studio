import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BACKGROUND_SCALE_MAX,
  BACKGROUND_SCALE_MIN,
  DEFAULT_BACKGROUND_SCALE,
  clampBackgroundOffsetToImageBounds,
  getBackgroundOffsetSliderRanges,
  updateBackgroundOffsetField,
  updateBackgroundScale,
  resolveBackgroundImageLayout,
  projectBackgroundImageLayout,
} from './backgroundImage.ts'
import { getDiscPreviewCoordinateSize } from '../interaction/discPreviewCoordinates.ts'

test('resolved background uses one active-content rectangle and a full-disc interaction region', () => {
  const layout = resolveBackgroundImageLayout({
    width: 120, height: 120,
    contentBounds: { x: 20, y: 40, width: 80, height: 40 },
  }, 0.6, { x: 12, y: -8 }, 200)
  assert.deepEqual(layout.contentRect, { x: -8, y: 32, width: 240, height: 120 })
  assert.deepEqual(layout.interactionRect, { x: 0, y: 0, width: 200, height: 200 })
  assert.deepEqual(layout.clip, { center: { x: 100, y: 100 }, radius: 100 })
  assert.ok(Object.isFrozen(layout) && Object.isFrozen(layout.contentRect))
  assert.ok(Object.isFrozen(layout.interactionRect) && Object.isFrozen(layout.clip.center))
  assert.deepEqual(projectBackgroundImageLayout(layout, 400, { x: 3, y: 3 }), {
    coordinateSize: 400,
    contentRect: { x: -13, y: 67, width: 480, height: 240 },
    interactionRect: { x: 3, y: 3, width: 400, height: 400 },
    clip: { center: { x: 203, y: 203 }, radius: 200 },
  })
})

for (const [label, imageSize, expected] of [
  ['wide', { width: 400, height: 200 }, { x: -100, y: 0, width: 400, height: 200 }],
  ['tall', { width: 200, height: 400 }, { x: 0, y: -100, width: 200, height: 400 }],
  ['square', { width: 200, height: 200 }, { x: 0, y: 0, width: 200, height: 200 }],
  ['unknown', null, { x: 0, y: 0, width: 200, height: 200 }],
  ['empty', { width: 200, height: 200, contentBounds: { x: 0, y: 0, width: 0, height: 0 } },
    { x: 100, y: 100, width: 0, height: 0 }],
] as const) {
  test(`resolved ${label} background retains cover/empty behavior`, () => {
    assert.deepEqual(resolveBackgroundImageLayout(imageSize, 1, { x: 0, y: 0 }, 200).contentRect, expected)
  })
}

test('drag and slider limits use the same resolved bounds at the last touching edge', () => {
  const imageSize = { width: 120, height: 120, contentBounds: { x: 20, y: 40, width: 80, height: 40 } }
  const ranges = getBackgroundOffsetSliderRanges(imageSize, 0.6, 200)
  const offset = clampBackgroundOffsetToImageBounds({ x: 1e4, y: -1e4 }, imageSize, 0.6, 200)
  assert.deepEqual(offset, { x: ranges.x.max, y: ranges.y.min })
  const layout = resolveBackgroundImageLayout(imageSize, 0.6, offset, 200)
  assert.equal(layout.contentRect.x, layout.interactionRect.width)
  assert.equal(layout.contentRect.y + layout.contentRect.height, 0)
})

test('preview coordinate size ignores transformed screen size and has a hidden/unmounted fallback', () => {
  for (const zoom of [0.5, 1, 2, 4]) {
    const element = { offsetWidth: 200, getBoundingClientRect: () => ({ width: 200 * zoom }) }
    assert.equal(getDiscPreviewCoordinateSize(element, 640), 200)
  }
  assert.equal(getDiscPreviewCoordinateSize({ offsetWidth: 0 }, 640), 640)
  assert.equal(getDiscPreviewCoordinateSize(null, 640), 640)
})

test('background scale edits retain a valid semantic fitted range without weakening nominal bounds', () => {
  assert.equal(updateBackgroundScale(0.05, 0.04), 0.05)
  assert.equal(updateBackgroundScale(0.01, 0.04), 0.04)
  assert.equal(updateBackgroundScale(0.05), BACKGROUND_SCALE_MIN)
  assert.equal(updateBackgroundScale(3), BACKGROUND_SCALE_MAX)
})

test('background scale edits keep invalid values inside a safe range', () => {
  assert.equal(updateBackgroundScale(Number.NaN, 0.04), 0.04)
  assert.equal(updateBackgroundScale(Number.POSITIVE_INFINITY, 0.04), 0.04)
  assert.equal(updateBackgroundScale(0.05, Number.NaN), BACKGROUND_SCALE_MIN)
  assert.equal(
    updateBackgroundScale(Number.NaN, Number.NEGATIVE_INFINITY),
    BACKGROUND_SCALE_MIN,
  )
  assert.equal(updateBackgroundScale(Number.NaN), DEFAULT_BACKGROUND_SCALE)
})

test('background offset ranges allow moving until the final image edge reaches the opposite disc edge', () => {
  const ranges = getBackgroundOffsetSliderRanges(
    { width: 600, height: 900 },
    1,
    600,
  )

  assert.deepEqual(ranges.x, { min: -600, max: 600 })
  assert.deepEqual(ranges.y, { min: -750, max: 750 })
})

test('background offset ranges account for background scale', () => {
  const ranges = getBackgroundOffsetSliderRanges(
    { width: 1200, height: 600 },
    1.5,
    600,
  )

  assert.deepEqual(ranges.x, { min: -1200, max: 1200 })
  assert.deepEqual(ranges.y, { min: -750, max: 750 })
})

test('background offset updates clamp to image-edge bounds', () => {
  const imageSize = { width: 600, height: 600 }

  assert.deepEqual(
    clampBackgroundOffsetToImageBounds({ x: -1000, y: 1000 }, imageSize, 1, 600),
    { x: -600, y: 600 },
  )
  assert.deepEqual(
    updateBackgroundOffsetField({ x: 0, y: 0 }, 'x', 999, imageSize, 1, 600),
    { x: 600, y: 0 },
  )
})

test('background sizing uses active content bounds instead of transparent padding', () => {
  const ranges = getBackgroundOffsetSliderRanges(
    {
      width: 1000,
      height: 1000,
      contentBounds: { x: 100, y: 250, width: 800, height: 400 },
    },
    1,
    600,
  )

  assert.deepEqual(ranges.x, { min: -900, max: 900 })
  assert.deepEqual(ranges.y, { min: -600, max: 600 })
})
