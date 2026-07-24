import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { getDiscPresetScaleControlRange } from './discPresetScaleControlRange.ts'

test('preset scale controls retain nominal bounds when the fit is already representable', () => {
  assert.deepEqual(
    getDiscPresetScaleControlRange({
      currentScale: 1.3333333333333333,
      nominalMin: 0.25,
      nominalMax: 2,
    }),
    { min: 0.25, max: 2 },
  )
})

test('preset scale controls include fitted values beyond either nominal boundary', () => {
  assert.deepEqual(
    getDiscPresetScaleControlRange({
      currentScale: 0.04,
      nominalMin: 0.1,
      nominalMax: 2,
    }),
    { min: 0.04, max: 2 },
  )
  assert.deepEqual(
    getDiscPresetScaleControlRange({
      currentScale: 28 / 12,
      nominalMin: 0.25,
      nominalMax: 2,
    }),
    { min: 0.25, max: 28 / 12 },
  )
})

test('preset scale controls do not promote invalid owner values into their ranges', () => {
  for (const currentScale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(
      getDiscPresetScaleControlRange({
        currentScale,
        nominalMin: 0.25,
        nominalMax: 2,
      }),
      { min: 0.25, max: 2 },
    )
  }
})

test('every guided Classic image owner opts into current-fit scale ranges', () => {
  const sources = [
    '../components/sidebar/artwork/BackgroundArtworkControls.tsx',
    '../components/sidebar/artwork/TitleArtworkControls.tsx',
    '../components/sidebar/branding/LogoAssetControls.tsx',
    '../components/sidebar/branding/MediaMarkControls.tsx',
    '../components/sidebar/branding/PlatformMarkControls.tsx',
    '../components/sidebar/branding/RatingBadgeControls.tsx',
  ]

  for (const sourcePath of sources) {
    const source = readFileSync(new URL(sourcePath, import.meta.url), 'utf8')
    const callCount = source.match(/getDiscPresetScaleControlRange\(\{/g)?.length ?? 0

    assert.equal(
      callCount,
      1,
      `${sourcePath} must include its guided scale in the manual control range exactly once.`,
    )
  }
})
