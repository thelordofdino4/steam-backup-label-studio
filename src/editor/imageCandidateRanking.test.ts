import assert from 'node:assert/strict'
import test from 'node:test'
import { getImageCandidateRanking } from './imageCandidateRanking.ts'

test('image candidate ranking labels strong background art', () => {
  const ranking = getImageCandidateRanking({
    dimensionEvidence: 'measured',
    height: 1080,
    kind: 'background',
    target: 'background',
    width: 1920,
  })

  assert.equal(ranking.qualityLabel, 'Best for background')
  assert.equal(ranking.qualityTone, 'good')
  assert.ok(ranking.details.includes('Measured dimensions: 1920 x 1080px'))
  assert.ok(ranking.details.includes('Print quality estimate: medium'))
})

test('image candidate ranking warns for heavy crop and tiny print assets', () => {
  const cropped = getImageCandidateRanking({
    dimensionEvidence: 'measured',
    height: 1800,
    kind: 'library',
    target: 'background',
    width: 1200,
  })
  const tiny = getImageCandidateRanking({
    dimensionEvidence: 'measured',
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


for (const target of ['background', 'logo', 'supportingArtwork'] as const) {
  test(`${target}: measured, estimated and unknown evidence remain distinct`, () => {
    const input = { target, width: 1920, height: 1080 }
    const measured = getImageCandidateRanking({ ...input, dimensionEvidence: 'measured' })
    const estimated = getImageCandidateRanking({ ...input, dimensionEvidence: 'estimated' })
    const unspecified = getImageCandidateRanking(input)
    const unknown = getImageCandidateRanking({ target, dimensionEvidence: 'measured' })
    assert.equal(measured.dimensionEvidence, 'measured')
    assert.ok(measured.details.includes('Measured dimensions: 1920 x 1080px'))
    assert.ok(measured.details.includes('Aspect ratio: 1.78:1'))
    assert.ok(measured.details.some(detail => detail.startsWith('Print quality estimate: ')))
    assert.equal(estimated.dimensionEvidence, 'estimated')
    assert.equal(estimated.qualityLabel, 'Resolution estimated')
    assert.equal(estimated.qualityTone, 'neutral')
    assert.ok(estimated.details.includes('Estimated dimensions: 1920 x 1080px'))
    assert.ok(estimated.details.includes('Estimated aspect ratio: 1.78:1'))
    assert.ok(estimated.details.includes('Print quality: unverified (estimated dimensions)'))
    assert.deepEqual(unspecified, estimated)
    assert.equal(unknown.dimensionEvidence, 'unknown')
    assert.equal(unknown.qualityLabel, 'Resolution unknown')
    assert.equal(unknown.qualityTone, 'neutral')
    assert.ok(unknown.details.includes('Dimensions unknown'))
    assert.ok(unknown.details.includes('Print quality: unknown dimensions'))
  })
}

test('evidence labels preserve the established destination ranking scores', () => {
  // Captured from the production ranking owner before evidence labels changed.
  const expected = {
    background: [85.8, 18.066666666666663, 62],
    logo: [15.8, -51.93333333333334, 16],
    supportingArtwork: [57.8, -9.933333333333337, 34],
  }
  const sizes = [[1920, 1080], [320, 240], [1200, 1800]]
  for (const target of ['background', 'logo', 'supportingArtwork'] as const) {
    for (const [index, [width, height]] of sizes.entries()) {
      for (const dimensionEvidence of ['measured', 'estimated', undefined] as const) {
        const result = getImageCandidateRanking({
          target, kind: 'background', width, height, baseScore: 7, dimensionEvidence,
        })
        assert.equal(result.score, expected[target][index])
        if (dimensionEvidence !== 'measured') {
          assert.equal(result.qualityLabel, 'Resolution estimated')
          assert.equal(result.qualityTone, 'neutral')
        }
      }
    }
  }
})

test('invalid dimensions cannot be promoted by an explicit measured or estimated claim', () => {
  for (const dimensionEvidence of ['measured', 'estimated'] as const) {
    for (const width of [undefined, null, 0, -1, Infinity, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const result = getImageCandidateRanking({ target: 'background', dimensionEvidence, width, height: 1080 })
      assert.equal(result.dimensionEvidence, 'unknown')
      assert.equal(result.qualityLabel, 'Resolution unknown')
      assert.ok(result.details.includes('Dimensions unknown'))
    }
  }
})


test('estimated vector metadata does not become measured aspect or print evidence', () => {
  const result = getImageCandidateRanking({
    target: 'logo', contentKind: 'logo', isVector: true, width: 960, height: 480,
  })
  assert.equal(result.dimensionEvidence, 'estimated')
  assert.equal(result.qualityLabel, 'Resolution estimated')
  assert.equal(result.qualityTone, 'neutral')
  assert.ok(result.details.includes('Estimated aspect ratio: 2.00:1'))
  assert.ok(result.details.includes('Print quality: unverified (estimated dimensions)'))
})
