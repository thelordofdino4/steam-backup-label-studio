import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from '../caseInsert/defaults.ts'
import {
  setCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotTransitions.ts'
import {
  addCaseInsertTemplateImageSlot,
  updateProjectCaseInsertTemplate,
} from '../caseInsert/templateSurfaceTransitions.ts'
import { createJewelCasePreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseBackBackgroundFit,
  getJewelCaseBackImageSlotPreviewRect,
  getJewelCaseBackImageSlotLayoutSliderRanges,
  getJewelCaseBackScreenshotLayoutSliderRanges,
} from './jewelCaseBackLayout.ts'
import { isPixelRectInsideBounds } from './jewelCaseLayout.ts'

function getRegionBounds(
  layout: ReturnType<typeof createJewelCasePreviewLayout>,
  regionId: string,
) {
  return layout.regions.find((region) => region.regionId === regionId)?.bounds
}

test('tray card preview layout fits background to the print surface', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const backBounds = getRegionBounds(layout, 'back')

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    background: setCaseInsertImageSlotImage(tray.background, {
      imageDataUrl: 'data:image/png;base64,back',
      imageSize: { width: 1780, height: 1390 },
    }),
  }))

  const fit = getJewelCaseBackBackgroundFit(
    state.templates.tray.background,
    layout,
  )

  assert.ok(backBounds)
  assert.ok(fit)
  assert.deepEqual(fit.region, backBounds)
  assert.equal(fit.hasEmptySpace, false)
})

test('tray artwork and mark layouts stay inside the panel safe area', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')

  state = addCaseInsertTemplateImageSlot(state, 'tray', 'artworkSlots')
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    artworkSlots: tray.artworkSlots.map((slot, index) =>
      setCaseInsertImageSlotImage(slot, {
        imageDataUrl: `data:image/png;base64,shot-${index + 1}`,
        imageSize: { width: 1280, height: 720 },
      }),
    ),
    markSlots: [
      setCaseInsertImageSlotImage(
        createDefaultCaseInsertImageSlot(
          'tray-mark-1',
          'Mark 1',
          {
            enabled: true,
            fit: 'contain',
            layout: { scale: 1, x: 84, y: 88 },
          },
        ),
        {
          imageDataUrl: 'data:image/png;base64,mark',
          imageSize: { width: 240, height: 320 },
        },
      ),
    ],
  }))

  assert.ok(safeBounds)

  for (const slot of state.templates.tray.artworkSlots) {
    const artworkRect = getJewelCaseBackImageSlotPreviewRect(
      slot,
      layout,
      'artwork',
    )

    assert.ok(artworkRect)
    assert.equal(isPixelRectInsideBounds(artworkRect, safeBounds), true)
  }

  const markRect = getJewelCaseBackImageSlotPreviewRect(
    state.templates.tray.markSlots[0]!,
    layout,
    'mark',
  )

  assert.ok(markRect)
  assert.equal(isPixelRectInsideBounds(markRect, safeBounds), true)
})

test('tray card overlay slider ranges follow rendered image size', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')
  const logoSlot = setCaseInsertImageSlotImage(
    createDefaultCaseInsertImageSlot(
      'tray-logo-1',
      'Logo 1',
      {
        enabled: true,
        fit: 'contain',
        layout: { scale: 1, x: 18, y: 88 },
      },
    ),
    {
      imageDataUrl: 'data:image/png;base64,logo',
      imageSize: { width: 900, height: 300 },
    },
  )
  const smallRanges = getJewelCaseBackImageSlotLayoutSliderRanges(
    logoSlot,
    layout,
    'logo',
  )
  const largeRanges = getJewelCaseBackImageSlotLayoutSliderRanges(
    {
      ...logoSlot,
      layout: { ...logoSlot.layout, scale: 2 },
    },
    layout,
    'logo',
  )
  const maxYRect = getJewelCaseBackImageSlotPreviewRect(
    {
      ...logoSlot,
      layout: { ...logoSlot.layout, y: smallRanges.y.max },
    },
    layout,
    'logo',
  )

  assert.ok(safeBounds)
  assert.ok(maxYRect)
  assert.equal(smallRanges.y.min > 0, true)
  assert.equal(smallRanges.y.max < 100, true)
  assert.equal(
    largeRanges.x.max - largeRanges.x.min <
      smallRanges.x.max - smallRanges.x.min,
    true,
  )
  assert.equal(
    maxYRect.y + maxYRect.height <= safeBounds.y + safeBounds.height,
    true,
  )
})

test('tray screenshot offset slider ranges shrink when crop travel is limited', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const matchingAspectSlot = setCaseInsertImageSlotImage(
    createDefaultCaseInsertImageSlot(
      'tray-screenshot-1',
      'Screenshot 1',
      {
        enabled: true,
        fit: 'cover',
        layout: { scale: 1, x: 0, y: 0 },
      },
    ),
    {
      imageDataUrl: 'data:image/png;base64,wide',
      imageSize: { width: 1280, height: 720 },
    },
  )
  const tallSlot = setCaseInsertImageSlotImage(
    {
      ...matchingAspectSlot,
      id: 'tray-screenshot-2',
      label: 'Screenshot 2',
    },
    {
      imageDataUrl: 'data:image/png;base64,tall',
      imageSize: { width: 720, height: 1280 },
    },
  )
  const matchingRanges = getJewelCaseBackScreenshotLayoutSliderRanges(
    matchingAspectSlot,
    layout,
    0,
    3,
  )
  const tallRanges = getJewelCaseBackScreenshotLayoutSliderRanges(
    tallSlot,
    layout,
    0,
    3,
  )

  assert.deepEqual(matchingRanges.x, { min: 0, max: 0 })
  assert.deepEqual(matchingRanges.y, { min: 0, max: 0 })
  assert.equal(tallRanges.x.max, 0)
  assert.equal(tallRanges.y.max > 0, true)
  assert.equal(tallRanges.y.max < 100, true)
})
