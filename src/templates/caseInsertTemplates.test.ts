import assert from 'node:assert/strict'
import test from 'node:test'
import {
  caseInsertTemplateOptions,
  caseInsertTemplates,
  getJewelCaseTemplateGuide,
  getJewelCaseTemplateRegion,
  JEWEL_CASE_BACK_PANEL_WIDTH_PX,
  JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
  JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
  JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
  JEWEL_CASE_SPINE_WIDTH_PX,
  jewelCaseInsertTemplate,
} from './caseInsertTemplates.ts'
import {
  DEFAULT_TEMPLATE_EXPORT_DPI,
  getTemplateSurfaceExportPixelSize,
  isTemplateRectInside,
  mmToTemplatePixels,
  validateRectangularPrintTemplate,
} from './templateModel.ts'
import type { TemplateGuide, TemplateRegion } from '../types/template.ts'

function requireRegion(regionId: Parameters<typeof getJewelCaseTemplateRegion>[0]) {
  const region = getJewelCaseTemplateRegion(regionId)

  assert.notEqual(region, null)

  return region as TemplateRegion
}

function requireGuide(guideId: Parameters<typeof getJewelCaseTemplateGuide>[0]) {
  const guide = getJewelCaseTemplateGuide(guideId)

  assert.notEqual(guide, null)

  return guide as TemplateGuide
}

function rectToPixels(region: TemplateRegion) {
  return {
    xPx: mmToTemplatePixels(region.bounds.xMm),
    yPx: mmToTemplatePixels(region.bounds.yMm),
    widthPx: mmToTemplatePixels(region.bounds.widthMm),
    heightPx: mmToTemplatePixels(region.bounds.heightMm),
  }
}

test('jewel case template is the only supported case insert template for now', () => {
  assert.deepEqual(Object.keys(caseInsertTemplates), ['jewelCase'])
  assert.equal(caseInsertTemplateOptions.length, 1)
  assert.equal(caseInsertTemplateOptions[0], jewelCaseInsertTemplate)
})

test('jewel case surfaces match the measured SGC PSD pixel sizes at 300 DPI', () => {
  assert.deepEqual(getTemplateSurfaceExportPixelSize(jewelCaseInsertTemplate, 'front'), {
    widthPx: JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
    heightPx: JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
    dpi: DEFAULT_TEMPLATE_EXPORT_DPI,
  })
  assert.deepEqual(getTemplateSurfaceExportPixelSize(jewelCaseInsertTemplate, 'back'), {
    widthPx: JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
    heightPx: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
    dpi: DEFAULT_TEMPLATE_EXPORT_DPI,
  })
  assert.match(jewelCaseInsertTemplate.geometryNote ?? '', /already includes both 75 px spine strips/i)
})

test('front cover region is independently addressable at the measured front size', () => {
  const front = requireRegion('front')

  assert.equal(front.role, 'front')
  assert.equal(front.surfaceId, 'front')
  assert.deepEqual(rectToPixels(front), {
    xPx: 0,
    yPx: 0,
    widthPx: JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
    heightPx: JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
  })
})

test('back tray region includes both 75 px spines in the measured back size', () => {
  const back = requireRegion('back')
  const leftSpine = requireRegion('leftSpine')
  const backPanel = requireRegion('backPanel')
  const rightSpine = requireRegion('rightSpine')

  assert.equal(back.role, 'back')
  assert.equal(back.surfaceId, 'back')
  assert.deepEqual(rectToPixels(back), {
    xPx: 0,
    yPx: 0,
    widthPx: JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
    heightPx: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(rectToPixels(leftSpine), {
    xPx: 0,
    yPx: 0,
    widthPx: JEWEL_CASE_SPINE_WIDTH_PX,
    heightPx: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(rectToPixels(backPanel), {
    xPx: JEWEL_CASE_SPINE_WIDTH_PX,
    yPx: 0,
    widthPx: JEWEL_CASE_BACK_PANEL_WIDTH_PX,
    heightPx: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(rectToPixels(rightSpine), {
    xPx: JEWEL_CASE_SPINE_WIDTH_PX + JEWEL_CASE_BACK_PANEL_WIDTH_PX,
    yPx: 0,
    widthPx: JEWEL_CASE_SPINE_WIDTH_PX,
    heightPx: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
})

test('safe regions sit inside their front, back, panel, and spine parents', () => {
  const regionPairs: Array<
    [
      safeId:
        | 'frontSafe'
        | 'backSafe'
        | 'backPanelSafe'
        | 'leftSpineSafe'
        | 'rightSpineSafe',
      parentId: 'front' | 'back' | 'backPanel' | 'leftSpine' | 'rightSpine',
    ]
  > = [
    ['frontSafe', 'front'],
    ['backSafe', 'back'],
    ['backPanelSafe', 'backPanel'],
    ['leftSpineSafe', 'leftSpine'],
    ['rightSpineSafe', 'rightSpine'],
  ]

  for (const [safeId, parentId] of regionPairs) {
    const safeRegion = requireRegion(safeId)
    const parentRegion = requireRegion(parentId)

    assert.equal(safeRegion.parentRegionId, parentId)
    assert.equal(safeRegion.role, 'safe')
    assert.equal(isTemplateRectInside(safeRegion.bounds, parentRegion.bounds), true)
  }
})

test('bleed, trim, safe, and spine fold guides are renderable from template data', () => {
  assert.equal(requireGuide('frontBleedBounds').regionId, 'frontBleed')
  assert.equal(requireGuide('frontTrimBounds').regionId, 'frontTrim')
  assert.equal(requireGuide('frontSafeBounds').regionId, 'frontSafe')
  assert.equal(requireGuide('backBleedBounds').regionId, 'backBleed')
  assert.equal(requireGuide('backTrimBounds').regionId, 'backTrim')
  assert.equal(requireGuide('backSafeBounds').regionId, 'backSafe')
  assert.equal(requireGuide('leftSpineBounds').regionId, 'leftSpine')
  assert.equal(requireGuide('rightSpineBounds').regionId, 'rightSpine')

  const leftSpineFold = requireGuide('leftSpineFold')
  const rightSpineFold = requireGuide('rightSpineFold')

  assert.equal(leftSpineFold.surfaceId, 'back')
  assert.equal(rightSpineFold.surfaceId, 'back')
  assert.equal(mmToTemplatePixels(leftSpineFold.line?.offsetMm ?? -1), JEWEL_CASE_SPINE_WIDTH_PX)
  assert.equal(
    mmToTemplatePixels(rightSpineFold.line?.offsetMm ?? -1),
    JEWEL_CASE_SPINE_WIDTH_PX + JEWEL_CASE_BACK_PANEL_WIDTH_PX,
  )
  assert.equal(mmToTemplatePixels(leftSpineFold.line?.endMm ?? -1), JEWEL_CASE_BACK_SURFACE_HEIGHT_PX)
  assert.equal(mmToTemplatePixels(rightSpineFold.line?.endMm ?? -1), JEWEL_CASE_BACK_SURFACE_HEIGHT_PX)
})

test('jewel case template validates as rectangular print geometry', () => {
  const result = validateRectangularPrintTemplate(jewelCaseInsertTemplate)

  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})
