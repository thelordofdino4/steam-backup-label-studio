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

for (const target of ['background', 'logo', 'supportingArtwork'] as const) {
  test(`${target}: unknown raster resolution is neutral even when content hints are promising`, () => {
    const ranking = getImageCandidateRanking({ target, kind: 'logo', contentKind: 'logo', transparencyHint: true })
    assert.equal(ranking.qualityLabel, 'Resolution unknown')
    assert.equal(ranking.qualityTone, 'neutral')
    assert.ok(ranking.details.includes('Dimensions unknown'))
    assert.ok(ranking.details.includes('Print quality: unknown dimensions'))
    assert.ok(Number.isFinite(ranking.score))
  })
}

test('invalid pixel dimensions never become false aspect, crop or print-quality evidence', () => {
  for (const width of [0, -1, NaN, Infinity, -Infinity, 12.5, Number.MAX_SAFE_INTEGER + 1]) {
    for (const dimensions of [{ width, height: 1080 }, { width: 1920, height: width }]) {
      const ranking = getImageCandidateRanking({ target: 'background', ...dimensions })
      assert.equal(ranking.qualityLabel, 'Resolution unknown')
      assert.ok(ranking.details.includes('Aspect ratio unknown'))
      assert.doesNotMatch(ranking.details.join(' '), /NaN|Infinity|12.5|9007199254740992/)
      assert.ok(Number.isFinite(ranking.score))
    }
  }
})

test('nonfinite discovery scores cannot poison otherwise valid ranking comparisons', () => {
  const input = { target: 'background', width: 1920, height: 1080 } as const
  const expected = getImageCandidateRanking(input)
  for (const baseScore of [NaN, Infinity, -Infinity]) assert.deepEqual(getImageCandidateRanking({ ...input, baseScore }), expected)
  assert.equal(getImageCandidateRanking({ ...input, baseScore: 15 }).score, expected.score + 15)
})
