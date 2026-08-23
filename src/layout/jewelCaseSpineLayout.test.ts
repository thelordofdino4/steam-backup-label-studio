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
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions.ts'
import {
  createJewelCasePreviewLayout,
} from './caseInsertPreviewLayout.ts'
import { createCaseInsertSpineGuideLayout } from './caseInsertGuideLayout.ts'
import { getCenteredRectLayoutSliderRanges } from './caseInsertElementSafeZone.ts'
import {
  isPixelRectInsideBounds,
} from './jewelCaseLayout.ts'
import {
  getJewelCaseSpineBackgroundFit,
  getJewelCaseSpineImageSlotLayoutSliderRanges,
  getJewelCaseSpineImageSlotPreviewLayout,
  getJewelCaseSpineTitlePreviewLayout,
} from './jewelCaseSpineLayout.ts'
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
} from '../render/caseInsertArtworkViewportRenderArtifact.ts'
import {
  getCaseInsertArtworkViewportLayoutSliderRanges,
} from '../caseInsert/artworkViewportPlacement.ts'

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
  const rightLogo = setCaseInsertImageSlotImage(
    {
      ...createDefaultCaseInsertImageSlot('right-spine-logo-test', 'Right logo', {
        enabled: true,
        fit: 'contain',
        layout: { scale: 1, x: 50, y: 88, rotation: 0 },
      }),
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
  assert.ok(logoLayout)
  assert.ok(backgroundFit)
  assert.equal(isPixelRectInsideBounds(titleLayout.boundingRect, leftSafe.bounds), true)
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

test('spine reserved-artwork ranges use canonical rotated viewport bounds', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const bannerAdjustedLayout = createCaseInsertSpineGuideLayout(
    layout,
    state.spine,
  )
  const createSlot = (side: 'left' | 'right') => ({
    ...setCaseInsertImageSlotImage(
      createDefaultCaseInsertImageSlot(
        `${side}-spine-artwork-1`,
        `${side} Spine artwork`,
        {
          enabled: true,
          fit: 'cover',
          layout: { scale: 1, x: 50, y: 50, rotation: 90 },
        },
      ),
      {
        imageDataUrl: `data:image/png;base64,${side}`,
        imageSize: { width: 1600, height: 900 },
      },
    ),
    reservedArtworkViewport: {
      kind: 'sbls/case-insert-artwork-viewport' as const,
      formatVersion: 1 as const,
      templateId: 'jewelCase' as const,
      templateRevision: null,
      coordinateBasis: `${side}SpineSafe` as const,
      widthPercent: 20,
      heightPercent: 3.7,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    },
  })
  const leftSlot = createSlot('left')
  const rightSlot = createSlot('right')
  const leftResult = resolveCaseInsertArtworkViewportRenderArtifact({
    owner: 'left-spine',
    slot: leftSlot,
    layout,
  })
  const rightResult = resolveCaseInsertArtworkViewportRenderArtifact({
    owner: 'right-spine',
    slot: rightSlot,
    layout,
  })
  const leftRanges = getCaseInsertArtworkViewportLayoutSliderRanges({
    owner: 'left-spine',
    slot: leftSlot,
    layout,
  })
  const adjustedRanges = getCaseInsertArtworkViewportLayoutSliderRanges({
    owner: 'left-spine',
    slot: leftSlot,
    layout: bannerAdjustedLayout,
  })
  const rightRanges = getCaseInsertArtworkViewportLayoutSliderRanges({
    owner: 'right-spine',
    slot: rightSlot,
    layout,
  })

  assert.equal(leftResult.status, 'resolved')
  assert.equal(rightResult.status, 'resolved')
  assert.ok(leftRanges)
  assert.ok(adjustedRanges)
  assert.ok(rightRanges)
  if (leftResult.status !== 'resolved' || rightResult.status !== 'resolved') {
    return
  }

  assert.deepEqual(
    leftRanges,
    getCenteredRectLayoutSliderRanges(
      leftResult.artifact.basisRect,
      leftResult.artifact.boundingRect,
    ),
  )
  assert.deepEqual(adjustedRanges, leftRanges)
  assert.deepEqual(rightRanges, leftRanges)
  assert.equal(
    leftResult.artifact.basisRect.x < rightResult.artifact.basisRect.x,
    true,
  )
  assert.equal(
    leftResult.artifact.boundingRect.width >
      leftResult.artifact.outerRect.width,
    true,
  )
})
