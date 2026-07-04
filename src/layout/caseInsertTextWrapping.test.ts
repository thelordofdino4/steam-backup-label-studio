import assert from 'node:assert/strict'
import test from 'node:test'
import {
  wrapCaseInsertTextLines,
} from './caseInsertTextWrapping.ts'

function measureTextAsCharacters(text: string) {
  return Array.from(text).length
}

test('case insert text wrapping preserves typed whitespace and newlines', () => {
  assert.deepEqual(
    wrapCaseInsertTextLines(
      ' hello  world ',
      80,
      '10px test',
      measureTextAsCharacters,
    ),
    [' hello  world '],
  )
  assert.deepEqual(
    wrapCaseInsertTextLines(
      'alpha\n\n beta ',
      80,
      '10px test',
      measureTextAsCharacters,
    ),
    ['alpha', '', ' beta '],
  )
})

test('case insert text wrapping breaks at the measured boundary without dropping words', () => {
  const lines = wrapCaseInsertTextLines(
    'hello hello hello hello',
    11,
    '10px test',
    measureTextAsCharacters,
  )

  assert.deepEqual(lines, ['hello hello', 'hello hello'])
})
