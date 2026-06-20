import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatInlinePreviewPointSizeValue,
  getInlinePreviewPointSizeCommitValue,
  getInlinePreviewPointSizeLiveValue,
  getNearestInlinePreviewPointSizeOptionIndex,
  parseInlinePreviewPointSizeDraft,
  stepInlinePreviewPointSizeValue,
} from './inlinePreviewPointSizeControl.ts'

const config = {
  max: 96,
  min: 6,
  step: 0.25,
}

test('point-size drafts allow temporary empty and invalid states', () => {
  assert.equal(parseInlinePreviewPointSizeDraft(''), null)
  assert.equal(parseInlinePreviewPointSizeDraft('   '), null)
  assert.equal(parseInlinePreviewPointSizeDraft('abc'), null)
  assert.equal(getInlinePreviewPointSizeLiveValue('', config), null)
  assert.equal(getInlinePreviewPointSizeLiveValue('100', config), null)
})

test('point-size drafts expose valid live values without snapping to presets', () => {
  assert.equal(getInlinePreviewPointSizeLiveValue('11.5', config), 11.5)
  assert.equal(getInlinePreviewPointSizeLiveValue('13', config), 13)
})

test('point-size drafts commit valid values and clamp out-of-range values', () => {
  assert.equal(
    getInlinePreviewPointSizeCommitValue({
      ...config,
      currentValue: 12,
      draft: '14.5',
    }),
    14.5,
  )
  assert.equal(
    getInlinePreviewPointSizeCommitValue({
      ...config,
      currentValue: 12,
      draft: '',
    }),
    12,
  )
  assert.equal(
    getInlinePreviewPointSizeCommitValue({
      ...config,
      currentValue: 12,
      draft: '100',
    }),
    96,
  )
})

test('point-size stepping repeats precisely inside bounds', () => {
  assert.equal(
    stepInlinePreviewPointSizeValue({
      ...config,
      direction: 1,
      value: 12,
    }),
    12.25,
  )
  assert.equal(
    stepInlinePreviewPointSizeValue({
      ...config,
      direction: -1,
      value: 6,
    }),
    6,
  )
})

test('point-size display preserves manual decimal values', () => {
  assert.equal(formatInlinePreviewPointSizeValue(12), '12')
  assert.equal(formatInlinePreviewPointSizeValue(11.5), '11.5')
  assert.equal(formatInlinePreviewPointSizeValue(11.25), '11.25')
})

test('point-size preset lookup uses current draft without forcing a snap', () => {
  const options = [8, 9, 10, 11, 12, 14, 16]

  assert.equal(
    getNearestInlinePreviewPointSizeOptionIndex({
      draft: '13',
      options,
      value: 12,
    }),
    4,
  )
  assert.equal(
    getNearestInlinePreviewPointSizeOptionIndex({
      draft: '',
      options,
      value: 16,
    }),
    6,
  )
})
