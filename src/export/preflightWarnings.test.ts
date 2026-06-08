import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GUIDE_MARKS_EXPORT_WARNING,
  buildGuideExportWarnings,
  buildLayoutValueWarnings,
  buildUpscaleWarnings,
  createBundledAssetWarning,
  createCustomMarkMissingImageWarning,
  createMissingBackgroundWarning,
  createMissingImageWarning,
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

test('shared bundled asset warnings keep feature descriptors consistent', () => {
  assert.equal(
    createBundledAssetWarning('Developer logo', 'logo'),
    'Developer logo uses bundled generic logo artwork.',
  )
  assert.equal(
    createBundledAssetWarning('ESRB E', 'ratingBadge'),
    'ESRB E rating badge uses bundled rating artwork.',
  )
  assert.equal(
    createBundledAssetWarning('Windows', 'operatingSystemMark'),
    'Windows operating system mark uses bundled generic artwork.',
  )
  assert.equal(
    createCustomMarkMissingImageWarning('PC', 'operatingSystemMark'),
    'Custom PC operating system mark is selected, but no custom image is uploaded; the bundled generic artwork will export.',
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
