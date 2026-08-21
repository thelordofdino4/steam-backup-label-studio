import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OFFSET_DRAG_POINT_RANGE,
  PERCENT_DRAG_POINT_RANGE,
  clampDragPointToRange,
  createElementPercentDragState,
  createPercentDragState,
  createPixelDragState,
  getDraggedPercentPoint,
  getDraggedPixelOffset,
} from './dragGeometry.ts'
import { createDefaultCaseInsertImageSlot } from '../caseInsert/defaults.ts'
import { setCaseInsertImageSlotImage } from '../caseInsert/imageSlotTransitions.ts'
import { createJewelCasePreviewLayout } from '../layout/caseInsertPreviewLayout.ts'
import {
  getCaseInsertArtworkViewportDragPlacement,
} from './caseInsertArtworkViewportDrag.ts'

test('percent drag adapter converts pointer delta into percent-space movement', () => {
  const dragState = createPercentDragState(7, 20, 40, 30, 45)
  const draggedPoint = getDraggedPercentPoint(
    dragState,
    70,
    90,
    {
      width: 200,
      height: 100,
    },
  )

  assert.deepEqual(draggedPoint, {
    x: 55,
    y: 95,
  })
})

test('element percent drag state preserves target metadata', () => {
  const dragState = createElementPercentDragState(
    9,
    12,
    18,
    50,
    60,
    {
      targetId: 'rating-badge',
      targetKind: 'branding',
    },
  )

  assert.equal(dragState.pointerId, 9)
  assert.equal(dragState.targetId, 'rating-badge')
  assert.equal(dragState.targetKind, 'branding')
  assert.equal(dragState.startX, 50)
  assert.equal(dragState.startY, 60)
})

test('drag point range clamps percent and offset coordinate spaces', () => {
  assert.deepEqual(
    clampDragPointToRange({ x: -12, y: 140 }, PERCENT_DRAG_POINT_RANGE),
    {
      x: 0,
      y: 100,
    },
  )
  assert.deepEqual(
    clampDragPointToRange({ x: -140, y: 150 }, OFFSET_DRAG_POINT_RANGE),
    {
      x: -100,
      y: 100,
    },
  )
})

test('pixel drag adapter preserves raw pointer pixel movement', () => {
  const dragState = createPixelDragState(12, 100, 150, {
    x: -20,
    y: 35,
  })

  assert.deepEqual(getDraggedPixelOffset(dragState, 130, 110), {
    x: 10,
    y: -5,
  })
})

test('pixel drag adapter can compensate for preview viewport scale', () => {
  const dragState = createPixelDragState(12, 100, 150, {
    x: -20,
    y: 35,
  })

  assert.deepEqual(getDraggedPixelOffset(dragState, 130, 110, 2), {
    x: -5,
    y: 15,
  })
})

test('Case reserved-artwork drag uses outer viewport containment ranges', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const slot = {
    ...setCaseInsertImageSlotImage(
      createDefaultCaseInsertImageSlot('cover-artwork-1', 'Artwork 1', {
        enabled: true,
        fit: 'cover',
        layout: { scale: 1, x: 50, y: 50 },
      }),
      {
        imageDataUrl: 'data:image/png;base64,wide',
        imageSize: { width: 1600, height: 900 },
      },
    ),
    reservedArtworkViewport: {
      kind: 'sbls/case-insert-artwork-viewport' as const,
      formatVersion: 1 as const,
      templateId: 'jewelCase' as const,
      templateRevision: null,
      coordinateBasis: 'frontSafe' as const,
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    },
  }
  const placement = getCaseInsertArtworkViewportDragPlacement({
    owner: 'cover',
    slot,
    layout,
  })
  const replacementPlacement = getCaseInsertArtworkViewportDragPlacement({
    owner: 'cover',
    slot: {
      ...slot,
      imageSize: { width: 1200, height: 900 },
    },
    layout,
  })

  assert.ok(placement)
  assert.deepEqual(replacementPlacement, placement)
  assert.deepEqual(placement.pointRange, {
    minX: 13,
    maxX: 87,
    minY: 8,
    maxY: 92,
  })
  assert.deepEqual(
    clampDragPointToRange({ x: -20, y: 140 }, placement.pointRange),
    { x: 13, y: 92 },
  )
})

test('Case Spine viewport drag remains side-owned and rotation-aware', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
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
  const leftPlacement = getCaseInsertArtworkViewportDragPlacement({
    owner: 'left-spine',
    slot: createSlot('left'),
    layout,
  })
  const rightPlacement = getCaseInsertArtworkViewportDragPlacement({
    owner: 'right-spine',
    slot: createSlot('right'),
    layout,
  })

  assert.ok(leftPlacement)
  assert.ok(rightPlacement)
  assert.equal(leftPlacement.region.x < rightPlacement.region.x, true)
  assert.deepEqual(leftPlacement.pointRange, rightPlacement.pointRange)
  assert.equal(leftPlacement.pointRange.minX > 20, true)
  assert.equal(leftPlacement.pointRange.maxX < 80, true)
})

test('Case drag leaves null viewports on the exact legacy percent path', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const legacySlot = setCaseInsertImageSlotImage(
    createDefaultCaseInsertImageSlot('cover-artwork-legacy', 'Legacy artwork', {
      enabled: true,
      fit: 'cover',
      layout: { scale: 1, x: 50, y: 50 },
    }),
    {
      imageDataUrl: 'data:image/png;base64,legacy',
      imageSize: { width: 1600, height: 900 },
    },
  )

  assert.equal(
    getCaseInsertArtworkViewportDragPlacement({
      owner: 'cover',
      slot: legacySlot,
      layout,
    }),
    null,
  )
  assert.deepEqual(PERCENT_DRAG_POINT_RANGE, {
    minX: 0,
    maxX: 100,
    minY: 0,
    maxY: 100,
  })
})
