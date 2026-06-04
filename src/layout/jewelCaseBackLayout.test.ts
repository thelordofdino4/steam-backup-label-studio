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
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListEnabled,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions.ts'
import { updateProjectCaseInsertTemplate } from '../caseInsert/templateSurfaceTransitions.ts'
import { createJewelCasePreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseBackBackgroundFit,
  getJewelCaseBackImageSlotPreviewRect,
  getJewelCaseBackScreenshotFit,
  getJewelCaseBackTextBlockPreviewLayout,
  getJewelCaseBackTextListPreviewLayout,
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

test('tray screenshot and mark layouts stay inside the panel safe area', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')

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

  for (const [index, slot] of state.templates.tray.artworkSlots.entries()) {
    const fit = getJewelCaseBackScreenshotFit(
      slot,
      layout,
      index,
      state.templates.tray.artworkSlots.length,
    )

    assert.ok(fit)
    assert.equal(isPixelRectInsideBounds(fit.region, safeBounds), true)
  }

  const markRect = getJewelCaseBackImageSlotPreviewRect(
    state.templates.tray.markSlots[0]!,
    layout,
    'mark',
  )

  assert.ok(markRect)
  assert.equal(isPixelRectInsideBounds(markRect, safeBounds), true)
})

test('tray text layouts render readable blocks in the panel safe area', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    textBlocks: tray.textBlocks.map((textBlock, index) =>
      index === 0
        ? setCaseInsertTextBlockEnabled(
            updateCaseInsertTextBlockValue(textBlock, 'A test chamber classic.'),
            true,
          )
        : textBlock,
    ),
    textLists: tray.textLists.map((textList, index) =>
      index === 0
        ? {
            ...setCaseInsertTextListEnabled(textList, true),
            items: ['Single-player', 'Co-op puzzles'],
          }
        : textList,
    ),
  }))

  const descriptionLayout = getJewelCaseBackTextBlockPreviewLayout(
    state.templates.tray.textBlocks[0]!,
    layout,
    'description',
  )
  const featureLayout = getJewelCaseBackTextListPreviewLayout(
    state.templates.tray.textLists[0]!,
    layout,
  )

  assert.ok(safeBounds)
  assert.ok(descriptionLayout)
  assert.ok(featureLayout)
  assert.equal(isPixelRectInsideBounds(descriptionLayout.bounds, safeBounds), true)
  assert.equal(isPixelRectInsideBounds(featureLayout.bounds, safeBounds), true)
  assert.equal(descriptionLayout.fontSizePx >= safeBounds.width * 0.012, true)
  assert.deepEqual(featureLayout.items, ['Single-player', 'Co-op puzzles'])
})
