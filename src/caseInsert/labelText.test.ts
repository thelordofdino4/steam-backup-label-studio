import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeCaseInsertLabel,
} from './labelText.ts'

test('case insert label normalization trims labels and preserves locale lowercase matching', () => {
  assert.equal(normalizeCaseInsertLabel('  Developer Logo  '), 'developer logo')
  assert.equal(normalizeCaseInsertLabel('PUBLISHER'), 'publisher')
})
