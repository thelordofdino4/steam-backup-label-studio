import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GUIDE_MARKS_EXPORT_WARNING,
  buildGuideExportWarnings,
  buildLayoutValueWarnings,
  buildUpscaleWarnings,
  createCustomMarkMissingImageWarning,
  createMissingBackgroundWarning,
  createMissingImageWarning,
  formatMillimeters,
} from './preflightWarnings.ts'

test('shared preflight builders create guide, background, and missing-image warnings', () => {
  assert.deepEqual(buildGuideExportWarnings(false), [])
  assert.deepEqual(buildGuideExportWarnings(true), [GUIDE_MARKS_EXPORT_WARNING])
  assert.equal(
    createMissingBackgroundWarning(
      null,
      'the export will use the default blank disc fill',
    ),
    'No background image is selected; the export will use the default blank disc fill.',
  )
  assert.equal(
    createMissingBackgroundWarning(
      'Cover Sheet',
      'uncovered areas will export as blank white',
    ),
    'Cover Sheet has no background image; uncovered areas will export as blank white.',
  )
  assert.equal(
    createMissingImageWarning('Artwork 1'),
    'Artwork 1 is enabled, but no image is selected; it will not render.',
  )
})

test('shared custom mark missing-image warnings keep feature descriptors consistent', () => {
  assert.equal(
    createCustomMarkMissingImageWarning('PC', 'operatingSystemMark'),
    'Custom PC operating system mark is selected, but no custom image is uploaded.',
  )
  assert.equal(
    createCustomMarkMissingImageWarning('ESRB E', 'ratingBadge'),
    'Custom ESRB E rating badge is selected, but no custom image is uploaded.',
  )
})

test('shared preflight builders create layout and resolution-risk warnings', () => {
  assert.deepEqual(buildLayoutValueWarnings('Artwork 1', {
    x: 50,
    y: 50,
    scale: 1,
  }), [])
  assert.deepEqual(buildLayoutValueWarnings('Artwork 1', {
    x: 120,
    y: 50,
    scale: 0,
  }), [
    'Artwork 1 placement is outside the safe control range and will be clamped during export.',
    'Artwork 1 scale is invalid and will use a fallback size.',
  ])
  assert.deepEqual(buildUpscaleWarnings(
    'Tray Card background',
    { width: 100, height: 100 },
    { width: 300, height: 240 },
  ), [
    'Tray Card background is 100 x 100px, but exports around 300 x 240px; it may look soft in print.',
  ])
})

test('shared preflight formatter keeps compact millimeter values', () => {
  assert.equal(formatMillimeters(120), '120')
  assert.equal(formatMillimeters(120.5), '120.5')
})
