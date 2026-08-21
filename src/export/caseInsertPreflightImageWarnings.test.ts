import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import { createCaseInsertPngExportLayout } from '../caseInsert/exportLayout.ts'
import { createDefaultProjectJewelCaseState } from '../project/projectCaseInsert.ts'
import type {
  BackgroundImageSize,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertReservedArtworkViewportCoordinateBasis,
} from '../project/projectTypes.ts'
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
} from '../render/caseInsertArtworkViewportRenderArtifact.ts'
import {
  getImageFitWarnings,
  getImageSlotDataWarnings,
  getRenderedImageSlotWarnings,
  getSafeEdgeWarnings,
  getSpineImageSlotWarnings,
} from './caseInsertPreflightImageWarnings.ts'
import { buildUpscaleWarnings } from './preflightWarnings.ts'

function enabledSlot(
  overrides: Partial<ProjectCaseInsertImageSlot> = {},
): ProjectCaseInsertImageSlot {
  return {
    ...createDefaultCaseInsertImageSlot('slot-1', 'Slot 1', {
      enabled: true,
    }),
    ...overrides,
  }
}

function viewportSlot(options: {
  coordinateBasis: ProjectCaseInsertReservedArtworkViewportCoordinateBasis
  fit: 'contain' | 'cover' | 'crop'
  imageSize: BackgroundImageSize
  x?: number
  y?: number
  rotation?: number
}): ProjectCaseInsertImageSlot {
  const slot = enabledSlot({
    fit: options.fit,
    imageDataUrl: 'data:image/png;base64,viewport-artwork',
    imageSize: options.imageSize,
  })

  return {
    ...slot,
    layout: {
      ...slot.layout,
      x: options.x ?? 50,
      y: options.y ?? 50,
      rotation: options.rotation ?? 0,
    },
    reservedArtworkViewport: {
      kind: 'sbls/case-insert-artwork-viewport',
      formatVersion: 1,
      templateId: 'jewelCase',
      templateRevision: null,
      coordinateBasis: options.coordinateBasis,
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 75, yPercent: 25 },
      zoom: options.fit === 'crop' ? 2 : 1,
    },
  }
}

test('case insert image warnings preserve missing image and text fallback copy', () => {
  assert.deepEqual(
    getImageSlotDataWarnings('Game logo', enabledSlot()),
    ['Game logo is enabled, but no image is selected; it will not render.'],
  )
  assert.deepEqual(
    getImageSlotDataWarnings('Spine logo', enabledSlot(), true),
    ['Spine logo has no image selected; text fallback will export instead.'],
  )
  assert.deepEqual(
    getImageSlotDataWarnings(
      'Background',
      enabledSlot(),
      false,
      { warnMissingImage: false },
    ),
    [],
  )
})

test('case insert image fit warnings preserve unresolved fit and empty-space copy', () => {
  const slot = enabledSlot({
    imageDataUrl: 'data:image/png;base64,test',
    imageSize: { width: 1000, height: 1000 },
  })

  assert.deepEqual(
    getImageFitWarnings('Cover background', slot, null),
    ['Cover background is enabled, but export could not resolve its print fit.'],
  )
  assert.deepEqual(
    getImageFitWarnings(
      'Cover background',
      slot,
      {
        cropOffset: { x: 0, y: 0 },
        fit: 'contain',
        hasEmptySpace: true,
        imageRect: { x: 0, y: 0, width: 500, height: 500 },
        isCropped: false,
        region: { x: 0, y: 0, width: 1000, height: 1000 },
        scale: 0.5,
        sourceRect: { x: 0, y: 0, width: 1000, height: 1000 },
        visibleRect: { x: 0, y: 0, width: 500, height: 500 },
      },
      { allowEmptySpaceWarning: true },
    ),
    ['Cover background does not cover its print region; blank paper will remain visible.'],
  )
})

test('case insert rendered image warnings preserve safe-edge warning copy', () => {
  const slot = enabledSlot({
    imageDataUrl: 'data:image/png;base64,test',
    imageSize: { width: 1000, height: 1000 },
  })
  const warnings = getRenderedImageSlotWarnings({
    slot,
    label: 'Artwork',
    rect: { x: 5, y: 5, width: 20, height: 20 },
    safeBounds: { x: 0, y: 0, width: 100, height: 100 },
    edge: { regionLabel: 'cover safe zone' },
  })

  assert.deepEqual(warnings, [
    'Artwork is very close to the left/top edge of the cover safe zone; inspect trim and fold clearance before printing.',
  ])
})

test('viewport image warnings use visible crop pixels and the rendered destination', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const layout = createCaseInsertPngExportLayout(project, 'tray', { dpi: 300 })
  const slot = viewportSlot({
    coordinateBasis: 'backPanelSafe',
    fit: 'crop',
    imageSize: {
      width: 100,
      height: 100,
      contentBounds: { x: 10, y: 20, width: 80, height: 60 },
    },
  })
  const viewportResult = resolveCaseInsertArtworkViewportRenderArtifact({
    owner: 'tray',
    slot,
    layout,
  })
  assert.equal(viewportResult.status, 'resolved')
  if (viewportResult.status !== 'resolved') return

  const warnings = getRenderedImageSlotWarnings({
    slot,
    label: 'Screenshot',
    rect: { x: 0, y: 0, width: 1, height: 1 },
    safeBounds: null,
    viewportResult,
  })

  assert.deepEqual(
    warnings,
    buildUpscaleWarnings(
      'Screenshot',
      viewportResult.artifact.visibleSourceRect,
      viewportResult.artifact.destinationRect,
    ),
  )
  assert.notDeepEqual(
    warnings,
    buildUpscaleWarnings(
      'Screenshot',
      slot.imageSize!,
      { width: 1, height: 1 },
    ),
  )
})

test('viewport contain warnings use active content bounds and the inner destination', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const layout = createCaseInsertPngExportLayout(project, 'cover', { dpi: 300 })
  const slot = viewportSlot({
    coordinateBasis: 'frontSafe',
    fit: 'contain',
    imageSize: {
      width: 300,
      height: 200,
      contentBounds: { x: 20, y: 10, width: 60, height: 40 },
    },
  })
  const viewportResult = resolveCaseInsertArtworkViewportRenderArtifact({
    owner: 'cover',
    slot,
    layout,
  })
  assert.equal(viewportResult.status, 'resolved')
  if (viewportResult.status !== 'resolved') return

  assert.deepEqual(
    getRenderedImageSlotWarnings({
      slot,
      label: 'Cover artwork',
      rect: null,
      safeBounds: null,
      viewportResult,
    }),
    buildUpscaleWarnings(
      'Cover artwork',
      viewportResult.artifact.visibleSourceRect,
      viewportResult.artifact.destinationRect,
    ),
  )
  assert.deepEqual(viewportResult.artifact.visibleSourceRect, {
    x: 20,
    y: 10,
    width: 60,
    height: 40,
  })
  assert.ok(
    viewportResult.artifact.destinationRect.width <
      viewportResult.artifact.localFrameRect.width ||
    viewportResult.artifact.destinationRect.height <
      viewportResult.artifact.localFrameRect.height,
  )
})

test('viewport spine warnings use local sampling dimensions and bounding geometry for edges', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const layout = createCaseInsertPngExportLayout(project, 'tray', { dpi: 300 })
  const slot = viewportSlot({
    coordinateBasis: 'leftSpineSafe',
    fit: 'cover',
    imageSize: { width: 20, height: 20 },
    x: 0,
    y: 0,
    rotation: 90,
  })
  const viewportResult = resolveCaseInsertArtworkViewportRenderArtifact({
    owner: 'left-spine',
    slot,
    layout,
  })
  assert.equal(viewportResult.status, 'resolved')
  if (viewportResult.status !== 'resolved') return

  const actualSafeBounds = {
    x: viewportResult.artifact.boundingRect.x - 1,
    y: viewportResult.artifact.boundingRect.y - 1,
    width: viewportResult.artifact.boundingRect.width + 2,
    height: viewportResult.artifact.boundingRect.height + 2,
  }

  const warnings = getSpineImageSlotWarnings({
    slot,
    label: 'Left spine artwork',
    layout: { width: 1, height: 1 },
    hasTextFallback: false,
    viewportResult,
    edge: { regionLabel: 'left spine safe zone' },
    safeBounds: actualSafeBounds,
  })

  assert.deepEqual(warnings, [
    ...buildUpscaleWarnings(
      'Left spine artwork',
      viewportResult.artifact.visibleSourceRect,
      viewportResult.artifact.destinationRect,
    ),
    ...getSafeEdgeWarnings(
      'Left spine artwork',
      viewportResult.artifact.boundingRect,
      actualSafeBounds,
      { regionLabel: 'left spine safe zone' },
    ),
  ])
  assert.notDeepEqual(
    getSafeEdgeWarnings(
      'Left spine artwork',
      viewportResult.artifact.boundingRect,
      actualSafeBounds,
      { regionLabel: 'left spine safe zone' },
    ),
    getSafeEdgeWarnings(
      'Left spine artwork',
      viewportResult.artifact.boundingRect,
      viewportResult.artifact.basisRect,
      { regionLabel: 'left spine safe zone' },
    ),
  )
})

test('all-transparent viewport artwork produces no placement or resolution warnings', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const layout = createCaseInsertPngExportLayout(project, 'tray', { dpi: 300 })
  const slot = viewportSlot({
    coordinateBasis: 'backPanelSafe',
    fit: 'cover',
    imageSize: {
      width: 100,
      height: 100,
      contentBounds: { x: 0, y: 0, width: 0, height: 0 },
    },
  })
  const viewportResult = resolveCaseInsertArtworkViewportRenderArtifact({
    owner: 'tray',
    slot,
    layout,
  })
  assert.equal(viewportResult.status, 'empty')

  assert.deepEqual(
    getRenderedImageSlotWarnings({
      slot,
      label: 'Screenshot',
      rect: null,
      safeBounds: null,
      viewportResult,
    }),
    [],
  )
})
