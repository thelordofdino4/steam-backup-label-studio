import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import type {
  ProjectCaseInsertImageSlot,
} from '../project/projectTypes.ts'
import {
  getImageFitWarnings,
  getImageSlotDataWarnings,
  getRenderedImageSlotWarnings,
} from './caseInsertPreflightImageWarnings.ts'

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
