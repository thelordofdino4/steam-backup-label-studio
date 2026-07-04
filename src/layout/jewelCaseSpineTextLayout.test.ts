import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectJewelCaseState,
} from '../caseInsert/defaults.ts'
import {
  setCaseInsertTextBlockAvoidVisualElements,
  setCaseInsertTextBlockEnabled,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions.ts'
import {
  createJewelCasePreviewLayout,
} from './caseInsertPreviewLayout.ts'
import {
  createCaseInsertGuideLayout,
} from './caseInsertGuideLayout.ts'
import {
  createCaseInsertTextAvoidanceRegionFromRect,
} from './caseInsertTextAvoidance.ts'
import {
  getJewelCaseSpineTextLayout,
  isPixelRectInsideBounds,
} from './jewelCaseLayout.ts'
import {
  getJewelCaseSpineTextLayoutSliderRanges,
  getJewelCaseSpineTitlePreviewLayout,
} from './jewelCaseSpineLayout.ts'
import {
  assertApproximatelyEqual,
  assertRectApproximatelyEqual,
  getSpineTextLineGlobalRects,
  rectsOverlap,
} from './jewelCaseSpineTextLayoutTestGeometry.ts'

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

test('default spine title text uses 16pt and stays inside both spine safe areas', () => {
  const state = createDefaultProjectJewelCaseState('Untitled Jewel Case Insert')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const spineSides = [
    { side: 'left' as const, safeRegionId: 'leftSpineSafe' },
    { side: 'right' as const, safeRegionId: 'rightSpineSafe' },
  ]

  for (const { side, safeRegionId } of spineSides) {
    const safeRegion = layout.regions.find(
      ({ regionId }) => regionId === safeRegionId,
    )
    const title = state.spine[side].title
    const titleLayout = getJewelCaseSpineTitlePreviewLayout(
      side,
      title,
      layout,
    )

    assert.ok(safeRegion)
    assert.ok(titleLayout)
    assert.equal(title.layout.fontSizePt, 16)
    assert.equal(titleLayout.fontSizePx, 200 / 3)
    assert.equal(
      isPixelRectInsideBounds(titleLayout.boundingRect, safeRegion.bounds),
      true,
    )
    assert.equal(
      titleLayout.boundingRect.width <= safeRegion.bounds.width,
      true,
    )
  }
})

test('spine text avoidance wraps opted-in visible text around occupied visuals', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const leftSafe = layout.regions.find(
    ({ regionId }) => regionId === 'leftSpineSafe',
  )
  const leftTitle = setCaseInsertTextBlockAvoidVisualElements(
    setCaseInsertTextBlockEnabled(
      updateCaseInsertTextBlockValue(
        state.spine.left.title,
        'Portal 2 Cooperative Archive Edition',
      ),
      true,
    ),
    true,
  )
  const baseLayout = getJewelCaseSpineTitlePreviewLayout(
    'left',
    leftTitle,
    layout,
  )

  assert.ok(leftSafe)
  assert.ok(baseLayout)

  const gameLogoRegion = createCaseInsertTextAvoidanceRegionFromRect(
    'left-spine-game-logo',
    'Game logo',
    {
      x: baseLayout.boundingRect.x,
      y: baseLayout.boundingRect.y + baseLayout.boundingRect.height * 0.42,
      width: baseLayout.boundingRect.width,
      height: baseLayout.boundingRect.height * 0.18,
    },
  )
  const adjustedLayout = getJewelCaseSpineTitlePreviewLayout(
    'left',
    leftTitle,
    layout,
    [gameLogoRegion],
  )

  assert.ok(adjustedLayout)
  assert.equal(
    isPixelRectInsideBounds(adjustedLayout.boundingRect, leftSafe.bounds),
    true,
  )
  assert.equal(
    adjustedLayout.lines.length > baseLayout.lines.length,
    true,
  )
  assert.deepEqual(
    adjustedLayout.reservedBoundingRect,
    baseLayout.reservedBoundingRect,
  )
  assert.equal(
    getSpineTextLineGlobalRects(adjustedLayout).some((lineRect) =>
      rectsOverlap(lineRect, gameLogoRegion.bounds)),
    false,
  )
})

test('spine text avoidance ignores reserved text box dead space', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const leftTitle = setCaseInsertTextBlockAvoidVisualElements(
    setCaseInsertTextBlockEnabled(
      updateCaseInsertTextBlockValue(state.spine.left.title, 'Portal 2'),
      true,
    ),
    true,
  )
  const baseLayout = getJewelCaseSpineTitlePreviewLayout(
    'left',
    leftTitle,
    layout,
  )

  assert.ok(baseLayout)
  assert.equal(
    baseLayout.reservedBoundingRect.height > baseLayout.boundingRect.height * 3,
    true,
  )

  const reservedOnlyRegion = createCaseInsertTextAvoidanceRegionFromRect(
    'left-spine-reserved-only',
    'Reserved dead space',
    {
      x: baseLayout.reservedBoundingRect.x,
      y: baseLayout.reservedBoundingRect.y + 10,
      width: baseLayout.reservedBoundingRect.width,
      height: Math.max(12, baseLayout.boundingRect.height * 0.1),
    },
  )

  assert.equal(
    rectsOverlap(baseLayout.boundingRect, reservedOnlyRegion.bounds),
    false,
  )

  const adjustedLayout = getJewelCaseSpineTitlePreviewLayout(
    'left',
    leftTitle,
    layout,
    [reservedOnlyRegion],
  )

  assert.ok(adjustedLayout)
  assert.deepEqual(adjustedLayout.boundingRect, baseLayout.boundingRect)
  assert.deepEqual(
    adjustedLayout.reservedBoundingRect,
    baseLayout.reservedBoundingRect,
  )
})

test('spine text visual bounds are measured instead of width-slider sized', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const leftTitle = setCaseInsertTextBlockEnabled(
    updateCaseInsertTextBlockValue(state.spine.left.title, 'Portal 2'),
    true,
  )
  const wideLayout = getJewelCaseSpineTitlePreviewLayout(
    'left',
    {
      ...leftTitle,
      layout: { ...leftTitle.layout, width: 90 },
    },
    layout,
  )
  const narrowLayout = getJewelCaseSpineTitlePreviewLayout(
    'left',
    {
      ...leftTitle,
      layout: { ...leftTitle.layout, width: 30 },
    },
    layout,
  )

  assert.ok(wideLayout)
  assert.ok(narrowLayout)
  assert.notEqual(
    wideLayout.reservedBoundingRect.height,
    narrowLayout.reservedBoundingRect.height,
  )
  assert.equal(wideLayout.width, narrowLayout.width)
  assert.equal(wideLayout.height, narrowLayout.height)
  assert.deepEqual(wideLayout.boundingRect, narrowLayout.boundingRect)
})

test('spine text edge placement clamps measured text instead of width-slider box', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const spineSides = [
    { side: 'left' as const, safeRegionId: 'leftSpineSafe' },
    { side: 'right' as const, safeRegionId: 'rightSpineSafe' },
  ]

  for (const { side, safeRegionId } of spineSides) {
    const safeRegion = layout.regions.find(
      ({ regionId }) => regionId === safeRegionId,
    )
    const title = setCaseInsertTextBlockEnabled(
      updateCaseInsertTextBlockValue(state.spine[side].title, 'Portal 2'),
      true,
    )
    const wideLayout = getJewelCaseSpineTitlePreviewLayout(
      side,
      {
        ...title,
        layout: { ...title.layout, width: 90, y: 100 },
      },
      layout,
    )
    const narrowLayout = getJewelCaseSpineTitlePreviewLayout(
      side,
      {
        ...title,
        layout: { ...title.layout, width: 30, y: 100 },
      },
      layout,
    )

    assert.ok(safeRegion)
    assert.ok(wideLayout)
    assert.ok(narrowLayout)
    assert.equal(
      wideLayout.reservedBoundingRect.height >
        wideLayout.boundingRect.height * 3,
      true,
    )
    assert.notEqual(
      wideLayout.reservedBoundingRect.height,
      narrowLayout.reservedBoundingRect.height,
    )
    assert.equal(
      isPixelRectInsideBounds(wideLayout.boundingRect, safeRegion.bounds),
      true,
    )
    assert.equal(
      isPixelRectInsideBounds(narrowLayout.boundingRect, safeRegion.bounds),
      true,
    )
    assertRectApproximatelyEqual(
      wideLayout.boundingRect,
      narrowLayout.boundingRect,
    )
    assertApproximatelyEqual(
      wideLayout.boundingRect.y + wideLayout.boundingRect.height,
      safeRegion.bounds.y + safeRegion.bounds.height,
    )
  }
})

test('spine text placement uses adjusted visible spine safe guide bounds', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const rawLayout = createJewelCasePreviewLayout('jewelCase', 'back')
  const layout = createCaseInsertGuideLayout(rawLayout, state)
  const rawSafe = rawLayout.regions.find(
    ({ regionId }) => regionId === 'leftSpineSafe',
  )
  const adjustedSafe = layout.guides.find(
    ({ guideId }) => guideId === 'leftSpineSafeBounds',
  )
  const title = setCaseInsertTextBlockEnabled(
    updateCaseInsertTextBlockValue(state.spine.left.title, 'Portal 2'),
    true,
  )
  const topLayout = getJewelCaseSpineTitlePreviewLayout(
    'left',
    {
      ...title,
      layout: { ...title.layout, y: 0 },
    },
    layout,
  )
  const ranges = getJewelCaseSpineTextLayoutSliderRanges(
    'left',
    title,
    layout,
  )
  const maxLengthLayout = getJewelCaseSpineTitlePreviewLayout(
    'left',
    {
      ...title,
      layout: { ...title.layout, y: ranges.y.max },
    },
    layout,
  )

  assert.ok(rawSafe)
  assert.ok(adjustedSafe?.bounds)
  assert.ok(topLayout)
  assert.ok(maxLengthLayout)
  assert.equal(adjustedSafe.bounds.y > rawSafe.bounds.y, true)
  assert.equal(
    isPixelRectInsideBounds(topLayout.boundingRect, adjustedSafe.bounds),
    true,
  )
  assertApproximatelyEqual(topLayout.boundingRect.y, adjustedSafe.bounds.y)
  assert.equal(ranges.y.min > 0, true)
  assert.equal(ranges.y.max < 100, true)
  assert.equal(
    maxLengthLayout.boundingRect.y + maxLengthLayout.boundingRect.height <=
      adjustedSafe.bounds.y + adjustedSafe.bounds.height,
    true,
  )
  assert.equal(
    adjustedSafe.bounds.y + adjustedSafe.bounds.height -
      (maxLengthLayout.boundingRect.y + maxLengthLayout.boundingRect.height) <
      adjustedSafe.bounds.height * 0.001,
    true,
  )
})
