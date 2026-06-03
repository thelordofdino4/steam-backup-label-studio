import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CASE_INSERT_EDITOR_LAYER_LABELS,
  CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER,
} from '../layerOrder.ts'
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
