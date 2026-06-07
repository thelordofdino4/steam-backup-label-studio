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
  createCaseInsertPngExportLayout,
} from '../caseInsert/exportLayout.ts'
import {
  getJewelCaseFrontBackgroundFit,
  getJewelCaseFrontImageSlotLayoutSliderRanges,
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
  const coverPreviewLayout = createJewelCasePreviewLayout('jewelCase', 'front')
  const coverExportLayout = createCaseInsertPngExportLayout(state, 'cover')
  const trayPreviewLayout = createJewelCasePreviewLayout('jewelCase', 'back')
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

test('cover artwork slider ranges shrink to the front safe area', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const frontSafe = layout.regions.find(
    ({ regionId }) => regionId === 'frontSafe',
  )
  const baseSlot = {
    ...state.templates.cover.titleArtwork,
    enabled: true,
    imageDataUrl: 'data:image/png;base64,title',
    imageSize: { width: 1200, height: 360 },
    layout: { scale: 1, x: 50, y: 24, rotation: 0 },
  }
  const smallRanges = getJewelCaseFrontImageSlotLayoutSliderRanges(
    baseSlot,
    layout,
    'titleArtwork',
  )
  const largeRanges = getJewelCaseFrontImageSlotLayoutSliderRanges(
    {
      ...baseSlot,
      layout: { ...baseSlot.layout, scale: 1.8 },
    },
    layout,
    'titleArtwork',
  )
  const maxXRect = getJewelCaseFrontImageSlotPreviewRect(
    {
      ...baseSlot,
      layout: { ...baseSlot.layout, x: smallRanges.x.max },
    },
    layout,
    'titleArtwork',
  )

  assert.ok(frontSafe)
  assert.ok(maxXRect)
  assert.equal(smallRanges.x.min > 0, true)
  assert.equal(smallRanges.x.max < 100, true)
  assert.equal(
    largeRanges.x.max - largeRanges.x.min <
      smallRanges.x.max - smallRanges.x.min,
    true,
  )
  assert.equal(
    maxXRect.x + maxXRect.width <= frontSafe.bounds.x + frontSafe.bounds.width,
    true,
  )
})
