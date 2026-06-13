import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAdditionalLogoAssetLabel,
  createLogoAssetSummary,
  getLogoAssetEmptyHint,
  getLogoAssetImageFallbackLabel,
  getLogoAssetImageLabel,
  getLogoAssetKindLabel,
  getLogoAssetUploadActionLabel,
  getPrimaryLogoAssetLabel,
  normalizeLogoAssetLabel,
} from './logoAsset.ts'

test('logo asset labels are shared across disc and insert adapters', () => {
  assert.equal(getLogoAssetKindLabel('developer'), 'Developer')
  assert.equal(getLogoAssetKindLabel('publisher'), 'Publisher')
  assert.equal(getPrimaryLogoAssetLabel('developer'), 'Developer logo')
  assert.equal(createAdditionalLogoAssetLabel('publisher', 1), 'Additional publisher 2')
  assert.equal(
    normalizeLogoAssetLabel('', createAdditionalLogoAssetLabel('developer', 0)),
    'Additional developer 1',
  )
})

test('logo asset control text keeps one logo suffix regardless of label shape', () => {
  assert.equal(getLogoAssetImageLabel('Developer'), 'Developer logo')
  assert.equal(getLogoAssetImageLabel('Developer logo'), 'Developer logo')
  assert.equal(
    getLogoAssetImageFallbackLabel('Publisher logo'),
    'Publisher logo image',
  )
  assert.equal(
    getLogoAssetUploadActionLabel({ hasImage: false, label: 'Publisher logo' }),
    'Choose publisher logo',
  )
  assert.match(
    getLogoAssetEmptyHint({
      label: 'Developer logo',
      mentionsCandidateSearch: true,
    }),
    /search logo candidates/,
  )
})

test('logo asset summary matches the shared optional visual wording', () => {
  assert.equal(
    createLogoAssetSummary({
      enabled: true,
      hasImage: false,
      scale: 1.25,
    }),
    'shown · built-in default · scale 1.25',
  )
})
