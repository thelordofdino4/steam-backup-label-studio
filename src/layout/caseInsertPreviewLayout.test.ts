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
  JEWEL_CASE_PREVIEW_SURFACE_GAP_PX,
  createJewelCasePreviewLayout,
} from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseFrontBackgroundFit,
  getJewelCaseFrontImageSlotPreviewRect,
  getJewelCaseFrontTextBlockPreviewLayout,
} from './jewelCaseFrontLayout.ts'
import { createDefaultProjectJewelCaseState } from '../caseInsert/defaults.ts'

test('jewel case preview layout composes front and back tray surfaces together', () => {
  const layout = createJewelCasePreviewLayout()
  const front = layout.surfaces.find(({ surfaceId }) => surfaceId === 'front')
  const back = layout.surfaces.find(({ surfaceId }) => surfaceId === 'back')

  assert.equal(
    layout.width,
    JEWEL_CASE_FRONT_SURFACE_WIDTH_PX +
      JEWEL_CASE_PREVIEW_SURFACE_GAP_PX +
      JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
  )
  assert.equal(layout.height, JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX)
  assert.deepEqual(front?.bounds, {
    x: 0,
    y: 0,
    width: JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
    height: JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(back?.bounds, {
    x: JEWEL_CASE_FRONT_SURFACE_WIDTH_PX + JEWEL_CASE_PREVIEW_SURFACE_GAP_PX,
    y: (JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX - JEWEL_CASE_BACK_SURFACE_HEIGHT_PX) / 2,
    width: JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
})

test('preview regions are derived from the jewel case template surfaces', () => {
  const layout = createJewelCasePreviewLayout()
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
  const layout = createJewelCasePreviewLayout()
  const back = layout.surfaces.find(({ surfaceId }) => surfaceId === 'back')
  const frontSafe = layout.guides.find(({ guideId }) => guideId === 'frontSafeBounds')
  const leftFold = layout.guides.find(({ guideId }) => guideId === 'leftSpineFold')
  const rightFold = layout.guides.find(({ guideId }) => guideId === 'rightSpineFold')

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

test('front cover preview helpers fit backgrounds and clamp front overlays', () => {
  const layout = createJewelCasePreviewLayout()
  const frontSafe = layout.regions.find(({ regionId }) => regionId === 'frontSafe')
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const front = {
    ...state.front,
    background: {
      ...state.front.background,
      imageDataUrl: 'data:image/png;base64,background',
      imageSize: { width: 3200, height: 1800 },
      fit: 'cover' as const,
    },
    titleArtwork: {
      ...state.front.titleArtwork,
      enabled: true,
      imageDataUrl: 'data:image/png;base64,title',
      imageSize: { width: 1200, height: 360 },
      layout: { scale: 1, x: 50, y: 20, rotation: 0 },
    },
    calloutText: {
      ...state.front.calloutText,
      enabled: true,
      value: 'Includes co-op',
      layout: { scale: 1, x: 99, y: 99, rotation: 0 },
    },
  }
  const backgroundFit = getJewelCaseFrontBackgroundFit(front.background, layout)
  const titleRect = getJewelCaseFrontImageSlotPreviewRect(
    front.titleArtwork,
    layout,
    'titleArtwork',
  )
  const calloutLayout = getJewelCaseFrontTextBlockPreviewLayout(
    front.calloutText,
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
