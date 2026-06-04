import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CASE_INSERT_EDITOR_LAYER_LABELS,
  CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER,
} from '../editor/layerOrder.ts'
import {
  JEWEL_CASE_BACK_PANEL_WIDTH_PX,
  JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
  JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
  JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
  JEWEL_CASE_SPINE_WIDTH_PX,
} from '../templates/caseInsertTemplates.ts'
import {
  createJewelCasePreviewLayout,
} from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseFrontBackgroundFit,
  getJewelCaseFrontImageSlotPreviewRect,
  getJewelCaseFrontTextBlockPreviewLayout,
} from './jewelCaseFrontLayout.ts'
import { createDefaultProjectJewelCaseState } from '../caseInsert/defaults.ts'

test('jewel case preview layout creates separate front and back templates', () => {
  const frontLayout = createJewelCasePreviewLayout('jewelCase', 'front')
  const backLayout = createJewelCasePreviewLayout('jewelCase', 'back')
  const front = frontLayout.surfaces.find(({ surfaceId }) => surfaceId === 'front')
  const back = backLayout.surfaces.find(({ surfaceId }) => surfaceId === 'back')

  assert.equal(frontLayout.width, JEWEL_CASE_FRONT_SURFACE_WIDTH_PX)
  assert.equal(frontLayout.height, JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX)
  assert.equal(backLayout.width, JEWEL_CASE_BACK_SURFACE_WIDTH_PX)
  assert.equal(backLayout.height, JEWEL_CASE_BACK_SURFACE_HEIGHT_PX)
  assert.equal(frontLayout.surfaces.length, 1)
  assert.equal(backLayout.surfaces.length, 1)
  assert.deepEqual(front?.bounds, {
    x: 0,
    y: 0,
    width: JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
    height: JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(back?.bounds, {
    x: 0,
    y: 0,
    width: JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
})

test('preview regions are derived from the jewel case template surfaces', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const back = layout.surfaces.find(({ surfaceId }) => surfaceId === 'back')
  const backPanel = layout.regions.find(({ regionId }) => regionId === 'backPanel')
  const leftSpine = layout.regions.find(({ regionId }) => regionId === 'leftSpine')
  const rightSpine = layout.regions.find(({ regionId }) => regionId === 'rightSpine')

  assert.ok(back)
  assert.deepEqual(leftSpine?.bounds, {
    x: back.bounds.x,
    y: back.bounds.y,
    width: JEWEL_CASE_SPINE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(backPanel?.bounds, {
    x: back.bounds.x + JEWEL_CASE_SPINE_WIDTH_PX,
    y: back.bounds.y,
    width: JEWEL_CASE_BACK_PANEL_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(rightSpine?.bounds, {
    x: back.bounds.x + JEWEL_CASE_SPINE_WIDTH_PX + JEWEL_CASE_BACK_PANEL_WIDTH_PX,
    y: back.bounds.y,
    width: JEWEL_CASE_SPINE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
})

test('preview guides use template region and fold-line data', () => {
  const frontLayout = createJewelCasePreviewLayout('jewelCase', 'front')
  const backLayout = createJewelCasePreviewLayout('jewelCase', 'back')
  const back = backLayout.surfaces.find(({ surfaceId }) => surfaceId === 'back')
  const frontSafe = frontLayout.guides.find(
    ({ guideId }) => guideId === 'frontSafeBounds',
  )
  const leftFold = backLayout.guides.find(({ guideId }) => guideId === 'leftSpineFold')
  const rightFold = backLayout.guides.find(({ guideId }) => guideId === 'rightSpineFold')

  assert.ok(back)
  assert.equal(frontSafe?.regionRole, 'safe')
  assert.equal(frontSafe?.surfaceId, 'front')
  assert.deepEqual(leftFold?.line, {
    orientation: 'vertical',
    x1: back.bounds.x + JEWEL_CASE_SPINE_WIDTH_PX,
    y1: back.bounds.y,
    x2: back.bounds.x + JEWEL_CASE_SPINE_WIDTH_PX,
    y2: back.bounds.y + JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(rightFold?.line, {
    orientation: 'vertical',
    x1: back.bounds.x + JEWEL_CASE_SPINE_WIDTH_PX + JEWEL_CASE_BACK_PANEL_WIDTH_PX,
    y1: back.bounds.y,
    x2: back.bounds.x + JEWEL_CASE_SPINE_WIDTH_PX + JEWEL_CASE_BACK_PANEL_WIDTH_PX,
    y2: back.bounds.y + JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
})

test('case preview layer order has labels for every preview layer', () => {
  for (const layerId of CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER) {
    assert.equal(typeof CASE_INSERT_EDITOR_LAYER_LABELS[layerId], 'string')
  }
})

test('cover sheet preview helpers fit backgrounds and clamp overlays', () => {
  const layout = createJewelCasePreviewLayout()
  const frontSafe = layout.regions.find(({ regionId }) => regionId === 'frontSafe')
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const front = {
    ...state.templates.cover,
    background: {
      ...state.templates.cover.background,
      imageDataUrl: 'data:image/png;base64,background',
      imageSize: { width: 3200, height: 1800 },
      fit: 'cover' as const,
    },
    titleArtwork: {
      ...state.templates.cover.titleArtwork,
      enabled: true,
      imageDataUrl: 'data:image/png;base64,title',
      imageSize: { width: 1200, height: 360 },
      layout: { scale: 1, x: 50, y: 20, rotation: 0 },
    },
    textBlocks: state.templates.cover.textBlocks.map((textBlock, index) =>
      index === 0
        ? {
            ...textBlock,
            enabled: true,
            value: 'Includes co-op',
            layout: { scale: 1, x: 99, y: 99, rotation: 0 },
          }
        : textBlock,
    ),
  }
  const calloutText = front.textBlocks[0]!

  const backgroundFit = getJewelCaseFrontBackgroundFit(front.background, layout)
  const titleRect = getJewelCaseFrontImageSlotPreviewRect(
    front.titleArtwork,
    layout,
    'titleArtwork',
  )
  const calloutLayout = getJewelCaseFrontTextBlockPreviewLayout(
    calloutText,
    layout,
  )

  assert.ok(frontSafe)
  assert.ok(backgroundFit)
  assert.ok(titleRect)
  assert.ok(calloutLayout)
  assert.equal(backgroundFit.hasEmptySpace, false)
  assert.equal(titleRect.x >= frontSafe.bounds.x, true)
  assert.equal(titleRect.y >= frontSafe.bounds.y, true)
  assert.equal(
    titleRect.x + titleRect.width <= frontSafe.bounds.x + frontSafe.bounds.width,
    true,
  )
  assert.equal(
    calloutLayout.bounds.y + calloutLayout.bounds.height <=
      frontSafe.bounds.y + frontSafe.bounds.height,
    true,
  )
})
