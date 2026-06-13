import assert from 'node:assert/strict'
import test from 'node:test'
import { getImageCandidateRanking } from './imageCandidateRanking.ts'

test('image candidate ranking labels strong background art', () => {
  const ranking = getImageCandidateRanking({
    height: 1080,
    kind: 'background',
    target: 'background',
    width: 1920,
  })

  assert.equal(ranking.qualityLabel, 'Best for background')
  assert.equal(ranking.qualityTone, 'good')
  assert.ok(ranking.details.includes('Dimensions: 1920 x 1080px'))
  assert.ok(ranking.details.includes('Print quality: medium'))
})

test('image candidate ranking warns for heavy crop and tiny print assets', () => {
  const cropped = getImageCandidateRanking({
    height: 1800,
    kind: 'library',
    target: 'background',
    width: 1200,
  })
  const tiny = getImageCandidateRanking({
    height: 240,
    kind: 'background',
    target: 'background',
    width: 320,
  })

  assert.equal(cropped.qualityLabel, 'Crops heavily')
  assert.equal(cropped.qualityTone, 'warning')
  assert.equal(tiny.qualityLabel, 'Too small for print')
  assert.equal(tiny.qualityTone, 'warning')
})

test('image candidate ranking labels vector logo candidates', () => {
  const ranking = getImageCandidateRanking({
    contentKind: 'logo',
    isVector: true,
    target: 'logo',
  })

  assert.equal(ranking.qualityLabel, 'Good for logo')
  assert.equal(ranking.qualityTone, 'good')
  assert.ok(ranking.details.includes('Print quality: vector'))
})
