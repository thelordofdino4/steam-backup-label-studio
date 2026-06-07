import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProjectJewelCaseState } from '../caseInsert/defaults.ts'
import {
  setCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotTransitions.ts'
import {
  setCaseInsertTextBlockEnabled,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions.ts'
import {
  createJewelCasePreviewLayout,
} from './caseInsertPreviewLayout.ts'
import {
  estimateJewelCaseRegionMinimumImageResolution,
  evaluateJewelCaseSafePlacement,
  fitImageToJewelCaseRegion,
  getDefaultJewelCaseBackScreenshotSlotLayouts,
  getJewelCaseImageRegionHeightFitScale,
  getJewelCaseBackPanelLayout,
  getJewelCaseFrontLayout,
  getJewelCaseRegionExportBounds,
  getJewelCaseRegionPreviewBounds,
  getJewelCaseSafeRegionId,
  getJewelCaseSpineLayout,
  getJewelCaseSpineTextLayout,
  getJewelCaseSurfaceExportSize,
  isPixelRectInsideBounds,
  type JewelCasePixelRect,
} from './jewelCaseLayout.ts'
import {
  getJewelCaseSpineBackgroundFit,
  getJewelCaseSpineImageSlotLayoutSliderRanges,
  getJewelCaseSpineImageSlotPreviewLayout,
  getJewelCaseSpineTitlePreviewLayout,
} from './jewelCaseSpineLayout.ts'
import {
  JEWEL_CASE_BACK_PANEL_WIDTH_PX,
  JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
  JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
  JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
  JEWEL_CASE_SAFE_MARGIN_PX,
  JEWEL_CASE_SPINE_WIDTH_PX,
} from '../templates/caseInsertTemplates.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
  )
}

function assertRectApproximatelyEqual(
  actual: JewelCasePixelRect | null,
  expected: JewelCasePixelRect,
) {
  assert.ok(actual)
  assertApproximatelyEqual(actual.x, expected.x)
  assertApproximatelyEqual(actual.y, expected.y)
  assertApproximatelyEqual(actual.width, expected.width)
  assertApproximatelyEqual(actual.height, expected.height)
}

test('resolves jewel case export and preview bounds from template geometry', () => {
  assert.deepEqual(getJewelCaseSurfaceExportSize('front'), {
    width: JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
    height: JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
  })
  assert.deepEqual(getJewelCaseSurfaceExportSize('back'), {
    width: JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })

  assertRectApproximatelyEqual(getJewelCaseRegionExportBounds('backPanel'), {
    x: JEWEL_CASE_SPINE_WIDTH_PX,
    y: 0,
    width: JEWEL_CASE_BACK_PANEL_WIDTH_PX,
    height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
  })
  assertRectApproximatelyEqual(
    getJewelCaseRegionPreviewBounds('backPanel', {
      width: JEWEL_CASE_BACK_SURFACE_WIDTH_PX / 2,
      height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX / 2,
    }),
    {
      x: JEWEL_CASE_SPINE_WIDTH_PX / 2,
      y: 0,
      width: JEWEL_CASE_BACK_PANEL_WIDTH_PX / 2,
      height: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX / 2,
    },
  )
})

test('region layout helpers expose front, back panel, and spine safe bounds', () => {
  const front = getJewelCaseFrontLayout()
  const backPanel = getJewelCaseBackPanelLayout()
  const leftSpine = getJewelCaseSpineLayout('left')
  const rightSpine = getJewelCaseSpineLayout('right')

  assert.equal(front?.safeRegionId, 'frontSafe')
  assert.equal(backPanel?.safeRegionId, 'backPanelSafe')
  assert.equal(leftSpine?.safeRegionId, 'leftSpineSafe')
  assert.equal(rightSpine?.safeRegionId, 'rightSpineSafe')
  assert.equal(getJewelCaseSafeRegionId('backBleed'), 'backSafe')
  assert.equal(getJewelCaseSafeRegionId('rightSpine'), 'rightSpineSafe')
  assert.equal(isPixelRectInsideBounds(front?.safeBounds ?? front!.bounds, front!.bounds), true)
  assert.equal(
    isPixelRectInsideBounds(backPanel?.safeBounds ?? backPanel!.bounds, backPanel!.bounds),
    true,
  )
})

test('rectangular safe placement clamps and warns per region', () => {
  const frontPlacement = evaluateJewelCaseSafePlacement(
    { x: 0, y: 0, width: 120, height: 120 },
    'front',
  )

  assert.ok(frontPlacement)
  assert.equal(frontPlacement.safeRegionId, 'frontSafe')
  assert.equal(frontPlacement.isUnsafe, true)
  assert.equal(frontPlacement.overflow.left, JEWEL_CASE_SAFE_MARGIN_PX)
  assert.equal(frontPlacement.overflow.top, JEWEL_CASE_SAFE_MARGIN_PX)
  assert.equal(frontPlacement.clampedRect.x, JEWEL_CASE_SAFE_MARGIN_PX)
  assert.equal(frontPlacement.clampedRect.y, JEWEL_CASE_SAFE_MARGIN_PX)
  assert.equal(frontPlacement.clampedRectIsUnsafe, false)

  const oversizedSpinePlacement = evaluateJewelCaseSafePlacement(
    { x: 0, y: JEWEL_CASE_SAFE_MARGIN_PX, width: 120, height: 120 },
    'leftSpine',
  )

  assert.ok(oversizedSpinePlacement)
  assert.equal(oversizedSpinePlacement.safeRegionId, 'leftSpineSafe')
  assert.equal(oversizedSpinePlacement.isUnsafe, true)
  assert.equal(oversizedSpinePlacement.clampedRectIsUnsafe, true)
})

test('image fitting preserves aspect ratio for contain, cover, scale, and crop modes', () => {
  const region = { x: 0, y: 0, width: 1000, height: 1000 }
  const imageSize = { width: 2000, height: 1000 }
  const contain = fitImageToJewelCaseRegion({
    imageSize,
    region,
    fit: 'contain',
  })
  const cover = fitImageToJewelCaseRegion({
    imageSize,
    region,
    fit: 'cover',
  })
  const adjustedContain = fitImageToJewelCaseRegion({
    imageSize,
    region,
    fit: 'contain',
    scale: 1.5,
    offset: { x: 0.2, y: -0.1 },
  })
  const adjustedCover = fitImageToJewelCaseRegion({
    imageSize,
    region,
    fit: 'cover',
    scale: 0.5,
    offset: { x: 0.4, y: -0.4 },
  })
  const scaled = fitImageToJewelCaseRegion({
    imageSize,
    region,
    fit: 'scale',
    scale: 0.5,
  })
  const cropped = fitImageToJewelCaseRegion({
    imageSize,
    region,
    fit: 'crop',
    offset: { x: 0.2, y: 0 },
  })

  assertRectApproximatelyEqual(contain?.imageRect ?? null, {
    x: 0,
    y: 250,
    width: 1000,
    height: 500,
  })
  assert.equal(contain?.isCropped, false)
  assert.equal(contain?.hasEmptySpace, true)

  assertRectApproximatelyEqual(cover?.imageRect ?? null, {
    x: -500,
    y: 0,
    width: 2000,
    height: 1000,
  })
  assertRectApproximatelyEqual(cover?.sourceRect ?? null, {
    x: 500,
    y: 0,
    width: 1000,
    height: 1000,
  })
  assert.equal(cover?.isCropped, true)

  assertRectApproximatelyEqual(adjustedContain?.imageRect ?? null, {
    x: 0,
    y: 37.5,
    width: 1500,
    height: 750,
  })
  assert.equal(adjustedContain?.scale, 0.75)
  assert.equal(adjustedContain?.cropOffset.x, 0.2)
  assert.equal(adjustedContain?.cropOffset.y, -0.1)

  assertRectApproximatelyEqual(adjustedCover?.imageRect ?? null, {
    x: 400,
    y: -50,
    width: 1000,
    height: 500,
  })
  assert.equal(adjustedCover?.scale, 0.5)
  assert.equal(adjustedCover?.cropOffset.x, 0.4)
  assert.equal(adjustedCover?.cropOffset.y, -0.4)

  assertRectApproximatelyEqual(scaled?.imageRect ?? null, {
    x: 250,
    y: 375,
    width: 500,
    height: 250,
  })
  assert.equal(scaled?.scale, 0.25)

  assertRectApproximatelyEqual(cropped?.imageRect ?? null, {
    x: -200,
    y: 0,
    width: 2000,
    height: 1000,
  })
  assertRectApproximatelyEqual(cropped?.sourceRect ?? null, {
    x: 200,
    y: 0,
    width: 1000,
    height: 1000,
  })
  assert.equal(cropped?.cropOffset.x, 0.2)
})

test('region height fit scale aligns image top and bottom pixels', () => {
  const region = { x: 0, y: 0, width: 1000, height: 1000 }
  const wideImageSize = { width: 4000, height: 1000 }
  const tallImageSize = { width: 1000, height: 4000 }
  const wideScale = getJewelCaseImageRegionHeightFitScale({
    imageSize: wideImageSize,
    region,
    fit: 'cover',
  })
  const tallScale = getJewelCaseImageRegionHeightFitScale({
    imageSize: tallImageSize,
    region,
    fit: 'cover',
  })
  const wideFit = fitImageToJewelCaseRegion({
    imageSize: wideImageSize,
    region,
    fit: 'cover',
    scale: wideScale ?? undefined,
  })
  const tallFit = fitImageToJewelCaseRegion({
    imageSize: tallImageSize,
    region,
    fit: 'cover',
    scale: tallScale ?? undefined,
  })

  assert.equal(wideScale, 1)
  assert.equal(tallScale, 0.25)
  assertRectApproximatelyEqual(wideFit?.imageRect ?? null, {
    x: -1500,
    y: 0,
    width: 4000,
    height: 1000,
  })
  assertRectApproximatelyEqual(tallFit?.imageRect ?? null, {
    x: 375,
    y: 0,
    width: 250,
    height: 1000,
  })
})

test('default back screenshot slots sit inside the back panel safe area', () => {
  const slots = getDefaultJewelCaseBackScreenshotSlotLayouts()

  assert.equal(slots.length, 3)
  assert.deepEqual(slots.map(({ id }) => id), [
    'back-screenshot-1',
    'back-screenshot-2',
    'back-screenshot-3',
  ])

  for (const slot of slots) {
    assert.equal(slot.regionId, 'backPanelSafe')
    assert.equal(isPixelRectInsideBounds(slot.bounds, slot.safeBounds), true)
    assertApproximatelyEqual(slot.bounds.height, slot.bounds.width * 9 / 16)
  }

  assert.equal(slots[0]!.bounds.x < slots[1]!.bounds.x, true)
  assert.equal(slots[1]!.bounds.x < slots[2]!.bounds.x, true)
})

test('spine text layout uses mirrored safe rotations and readable sizing', () => {
  const left = getJewelCaseSpineTextLayout('left')
  const right = getJewelCaseSpineTextLayout('right')

  assert.ok(left)
  assert.ok(right)
  assert.equal(left.regionId, 'leftSpineSafe')
  assert.equal(right.regionId, 'rightSpineSafe')
  assert.equal(left.rotationDegrees, -90)
  assert.equal(right.rotationDegrees, 90)
  assert.equal(left.recommendedFontSizePx <= left.maxFontSizePx, true)
  assert.equal(right.recommendedFontSizePx <= right.maxFontSizePx, true)
  assert.equal(left.maxLineWidthPx, left.bounds.height)
  assert.equal(right.maxLineWidthPx, right.bounds.height)
})

test('spine preview layouts stay inside safe strips', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const leftSafe = layout.regions.find(
    ({ regionId }) => regionId === 'leftSpineSafe',
  )
  const rightSafe = layout.regions.find(
    ({ regionId }) => regionId === 'rightSpineSafe',
  )
  const leftTitle = setCaseInsertTextBlockEnabled(
    updateCaseInsertTextBlockValue(state.spine.left.title, 'Portal 2'),
    true,
  )
  const leftBranding = {
    ...state.spine.left.steamBackupBranding,
    enabled: true,
    layout: {
      ...state.spine.left.steamBackupBranding.layout,
      y: 0,
    },
  }
  const rightLogo = setCaseInsertImageSlotImage(
    {
      ...state.spine.right.logo,
      enabled: true,
    },
    {
      imageDataUrl: 'data:image/png;base64,logo',
      imageSize: { width: 320, height: 160 },
    },
  )
  const rightBackground = setCaseInsertImageSlotImage(
    {
      ...state.spine.right.background,
      enabled: true,
      fit: 'cover',
    },
    {
      imageDataUrl: 'data:image/png;base64,spine',
      imageSize: { width: 1200, height: 1200 },
    },
  )
  const titleLayout = getJewelCaseSpineTitlePreviewLayout(
    'left',
    leftTitle,
    layout,
  )
  const brandingLayout = getJewelCaseSpineImageSlotPreviewLayout(
    'left',
    leftBranding,
    layout,
    'branding',
  )
  const logoLayout = getJewelCaseSpineImageSlotPreviewLayout(
    'right',
    rightLogo,
    layout,
    'logo',
  )
  const backgroundFit = getJewelCaseSpineBackgroundFit(
    'right',
    rightBackground,
    layout,
  )

  assert.ok(leftSafe)
  assert.ok(rightSafe)
  assert.ok(titleLayout)
  assert.ok(brandingLayout)
  assert.ok(logoLayout)
  assert.ok(backgroundFit)
  assert.equal(isPixelRectInsideBounds(titleLayout.boundingRect, leftSafe.bounds), true)
  assert.equal(
    isPixelRectInsideBounds(brandingLayout.boundingRect, leftSafe.bounds),
    true,
  )
  assert.equal(isPixelRectInsideBounds(logoLayout.boundingRect, rightSafe.bounds), true)
  assert.equal(backgroundFit.hasEmptySpace, false)
})

test('spine image slider ranges shrink to rotated safe strip bounds', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const leftSafe = layout.regions.find(
    ({ regionId }) => regionId === 'leftSpineSafe',
  )
  const titleArtwork = setCaseInsertImageSlotImage(
    {
      ...state.spine.left.titleArtwork,
      enabled: true,
      layout: {
        ...state.spine.left.titleArtwork.layout,
        scale: 1,
        rotation: -90,
      },
    },
    {
      imageDataUrl: 'data:image/png;base64,title',
      imageSize: { width: 900, height: 300 },
    },
  )
  const smallRanges = getJewelCaseSpineImageSlotLayoutSliderRanges(
    'left',
    titleArtwork,
    layout,
    'titleArtwork',
  )
  const largeRanges = getJewelCaseSpineImageSlotLayoutSliderRanges(
    'left',
    {
      ...titleArtwork,
      layout: { ...titleArtwork.layout, scale: 1.6 },
    },
    layout,
    'titleArtwork',
  )
  const maxLengthLayout = getJewelCaseSpineImageSlotPreviewLayout(
    'left',
    {
      ...titleArtwork,
      layout: { ...titleArtwork.layout, y: smallRanges.y.max },
    },
    layout,
    'titleArtwork',
  )

  assert.ok(leftSafe)
  assert.ok(maxLengthLayout)
  assert.equal(smallRanges.x.min > 0, true)
  assert.equal(smallRanges.y.max < 100, true)
  assert.equal(
    largeRanges.y.max - largeRanges.y.min <
      smallRanges.y.max - smallRanges.y.min,
    true,
  )
  assert.equal(
    isPixelRectInsideBounds(maxLengthLayout.boundingRect, leftSafe.bounds),
    true,
  )
})

test('minimum image resolution estimates match export pixel regions', () => {
  assert.deepEqual(estimateJewelCaseRegionMinimumImageResolution('front'), {
    regionId: 'front',
    surfaceId: 'front',
    widthPx: JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
    heightPx: JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
    dpi: 300,
    qualityScale: 1,
  })
  assert.deepEqual(
    estimateJewelCaseRegionMinimumImageResolution('backPanelSafe'),
    {
      regionId: 'backPanelSafe',
      surfaceId: 'back',
      widthPx: JEWEL_CASE_BACK_PANEL_WIDTH_PX - JEWEL_CASE_SAFE_MARGIN_PX * 2,
      heightPx: JEWEL_CASE_BACK_SURFACE_HEIGHT_PX - JEWEL_CASE_SAFE_MARGIN_PX * 2,
      dpi: 300,
      qualityScale: 1,
    },
  )
  assert.deepEqual(
    estimateJewelCaseRegionMinimumImageResolution('front', {
      dpi: 150,
      qualityScale: 2,
    }),
    {
      regionId: 'front',
      surfaceId: 'front',
      widthPx: JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
      heightPx: JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
      dpi: 150,
      qualityScale: 2,
    },
  )
})
