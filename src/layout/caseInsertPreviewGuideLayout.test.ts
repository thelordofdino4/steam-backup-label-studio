import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CASE_INSERT_EDITOR_LAYER_LABELS,
  CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER,
  CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER,
} from '../editor/layerOrder.ts'
import {
  caseInsertTemplatePaneHasSpine,
} from '../caseInsert/templateSurfaces.ts'
import {
  formatCaseInsertGuideDash,
  getCaseInsertGuideStyle,
} from '../caseInsert/guideStyles.ts'
import {
  JEWEL_CASE_BACK_PANEL_WIDTH_PX,
  JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
  JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
  JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
  JEWEL_CASE_SPINE_WIDTH_PX,
} from '../templates/caseInsertTemplates.ts'
import {
  createJewelCaseFullInsertExportLayout,
  createJewelCasePreviewLayout,
  JEWEL_CASE_FULL_INSERT_EXPORT_GAP_PX,
} from './caseInsertPreviewLayout.ts'
import {
  createCaseInsertGuideLayout,
} from './caseInsertGuideLayout.ts'
import {
  createCaseInsertPngExportLayout,
} from '../caseInsert/exportLayout.ts'
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

test('case export layer order has labels for every export layer', () => {
  for (const layerId of CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER) {
    assert.equal(typeof CASE_INSERT_EDITOR_LAYER_LABELS[layerId], 'string')
  }
})

test('full insert export layout includes front sheet and tray card with spines', () => {
  const layout = createJewelCaseFullInsertExportLayout('jewelCase')
  const front = layout.surfaces.find(({ surfaceId }) => surfaceId === 'front')
  const back = layout.surfaces.find(({ surfaceId }) => surfaceId === 'back')
  const leftSpine = layout.regions.find(({ regionId }) => regionId === 'leftSpine')
  const rightSpine = layout.regions.find(({ regionId }) => regionId === 'rightSpine')

  assert.equal(
    layout.width,
    JEWEL_CASE_FRONT_SURFACE_WIDTH_PX +
      JEWEL_CASE_FULL_INSERT_EXPORT_GAP_PX +
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
    x: JEWEL_CASE_FRONT_SURFACE_WIDTH_PX +
      JEWEL_CASE_FULL_INSERT_EXPORT_GAP_PX,
    y: Math.round(
      (JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX -
        JEWEL_CASE_BACK_SURFACE_HEIGHT_PX) / 2,
    ),
    width: JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
  assert.equal(leftSpine?.bounds.x, back?.bounds.x)
  assert.equal(rightSpine?.bounds.x, (back?.bounds.x ?? 0) +
    JEWEL_CASE_SPINE_WIDTH_PX +
    JEWEL_CASE_BACK_PANEL_WIDTH_PX)
})

test('case insert PNG export layout matches the active template preview surface', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const coverLayout = createCaseInsertPngExportLayout(state, 'cover')
  const trayLayout = createCaseInsertPngExportLayout(state, 'tray')

  assert.equal(coverLayout.width, JEWEL_CASE_FRONT_SURFACE_WIDTH_PX)
  assert.equal(coverLayout.height, JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX)
  assert.deepEqual(
    coverLayout.surfaces.map(({ surfaceId }) => surfaceId),
    ['front'],
  )
  assert.equal(coverLayout.regions.some(({ surfaceId }) => surfaceId === 'back'), false)

  assert.equal(trayLayout.width, JEWEL_CASE_BACK_SURFACE_WIDTH_PX)
  assert.equal(trayLayout.height, JEWEL_CASE_BACK_SURFACE_HEIGHT_PX)
  assert.deepEqual(
    trayLayout.surfaces.map(({ surfaceId }) => surfaceId),
    ['back'],
  )
  assert.equal(trayLayout.gap, 0)
  assert.equal(trayLayout.regions.some(({ surfaceId }) => surfaceId === 'front'), false)
})

test('case insert export guide geometry matches active preview surfaces', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const coverPreviewLayout = createCaseInsertGuideLayout(
    createJewelCasePreviewLayout('jewelCase', 'front'),
    state,
  )
  const coverExportLayout = createCaseInsertPngExportLayout(state, 'cover')
  const trayPreviewLayout = createCaseInsertGuideLayout(
    createJewelCasePreviewLayout('jewelCase', 'back'),
    state,
  )
  const trayExportLayout = createCaseInsertPngExportLayout(state, 'tray')

  for (const guideId of ['frontTrimBounds', 'frontSafeBounds'] as const) {
    assert.deepEqual(
      coverExportLayout.guides.find((guide) => guide.guideId === guideId),
      coverPreviewLayout.guides.find((guide) => guide.guideId === guideId),
    )
  }

  for (const guideId of [
    'backTrimBounds',
    'backPanelBounds',
    'backSafeBounds',
    'backPanelSafeBounds',
    'leftSpineBounds',
    'rightSpineBounds',
    'leftSpineSafeBounds',
    'rightSpineSafeBounds',
    'leftSpineFold',
    'rightSpineFold',
  ] as const) {
    assert.deepEqual(
      trayExportLayout.guides.find((guide) => guide.guideId === guideId),
      trayPreviewLayout.guides.find((guide) => guide.guideId === guideId),
    )
  }
})

test('case insert guide layout removes tray safe connectors and adjusts spine safe zones', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createCaseInsertGuideLayout(
    createJewelCasePreviewLayout('jewelCase', 'back'),
    state,
  )
  const backPanelSafe = layout.guides.find(
    ({ guideId }) => guideId === 'backPanelSafeBounds',
  )
  const leftSpineSafe = layout.guides.find(
    ({ guideId }) => guideId === 'leftSpineSafeBounds',
  )
  const rightSpineSafe = layout.guides.find(
    ({ guideId }) => guideId === 'rightSpineSafeBounds',
  )

  assert.equal(
    layout.guides.some(({ guideId }) => guideId === 'backSafeBounds'),
    false,
  )
  assert.deepEqual(backPanelSafe?.bounds, {
    x: JEWEL_CASE_SPINE_WIDTH_PX + 48,
    y: 48,
    width: JEWEL_CASE_BACK_PANEL_WIDTH_PX - 96,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX - 96,
  })
  assert.deepEqual(leftSpineSafe?.bounds, {
    x: 0,
    y: 176,
    width: JEWEL_CASE_SPINE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX - 176,
  })
  assert.deepEqual(rightSpineSafe?.bounds, {
    x: JEWEL_CASE_SPINE_WIDTH_PX + JEWEL_CASE_BACK_PANEL_WIDTH_PX,
    y: 176,
    width: JEWEL_CASE_SPINE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX - 176,
  })
})

test('case insert guide layout uses the full spine when Steam banner is disabled', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const disabledBannerState = {
    ...state,
    spine: {
      ...state.spine,
      left: {
        ...state.spine.left,
        steamBanner: { ...state.spine.left.steamBanner, enabled: false },
      },
      right: {
        ...state.spine.right,
        steamBanner: { ...state.spine.right.steamBanner, enabled: false },
      },
    },
  }
  const layout = createCaseInsertGuideLayout(
    createJewelCasePreviewLayout('jewelCase', 'back'),
    disabledBannerState,
  )
  const leftSpineSafe = layout.guides.find(
    ({ guideId }) => guideId === 'leftSpineSafeBounds',
  )
  const rightSpineSafe = layout.guides.find(
    ({ guideId }) => guideId === 'rightSpineSafeBounds',
  )

  assert.deepEqual(leftSpineSafe?.bounds, {
    x: 0,
    y: 0,
    width: JEWEL_CASE_SPINE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(rightSpineSafe?.bounds, {
    x: JEWEL_CASE_SPINE_WIDTH_PX + JEWEL_CASE_BACK_PANEL_WIDTH_PX,
    y: 0,
    width: JEWEL_CASE_SPINE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
})

test('case insert guide stroke and dash styles are layout-scaled', () => {
  const coverLayout = createJewelCasePreviewLayout('jewelCase', 'front')
  const trayLayout = createJewelCasePreviewLayout('jewelCase', 'back')
  const coverSafe = coverLayout.guides.find(
    ({ guideId }) => guideId === 'frontSafeBounds',
  )
  const trayTrim = trayLayout.guides.find(
    ({ guideId }) => guideId === 'backTrimBounds',
  )
  const leftSpine = trayLayout.guides.find(
    ({ guideId }) => guideId === 'leftSpineBounds',
  )

  assert.ok(coverSafe)
  assert.ok(trayTrim)
  assert.ok(leftSpine)

  const safeStyle = getCaseInsertGuideStyle(coverSafe, coverLayout)
  const trimStyle = getCaseInsertGuideStyle(trayTrim, trayLayout)
  const spineStyle = getCaseInsertGuideStyle(leftSpine, trayLayout)

  assert.equal(safeStyle.lineWidth, 4)
  assert.equal(trimStyle.lineWidth, 4)
  assert.equal(spineStyle.lineWidth, 4)
  assert.equal(safeStyle.strokeColor, 'rgba(37, 99, 235, 0.95)')
  assert.equal(trimStyle.strokeColor, 'rgba(245, 158, 11, 0.94)')
  assert.equal(spineStyle.strokeColor, 'rgba(236, 72, 153, 0.95)')
  assert.deepEqual(safeStyle.dash, [8, 6])
  assert.deepEqual(trimStyle.dash, [])
  assert.deepEqual(spineStyle.dash, [5.6, 5.6])
  assert.equal(formatCaseInsertGuideDash(safeStyle.dash), '8 6')
  assert.equal(formatCaseInsertGuideDash(trimStyle.dash), undefined)
})

test('case template panes expose whether spine controls are available', () => {
  assert.equal(caseInsertTemplatePaneHasSpine('cover'), false)
  assert.equal(caseInsertTemplatePaneHasSpine('tray'), true)
})
