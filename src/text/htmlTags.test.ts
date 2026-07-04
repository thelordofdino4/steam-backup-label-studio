import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isClosingTag,
  parseTagAttributes,
  parseTagName,
} from './htmlTags.ts'

test('HTML tag helpers parse tag names without owning allow-list policy', () => {
  assert.equal(parseTagName('<SPAN style="color:red">'), 'span')
  assert.equal(parseTagName('</ Strong >'), 'strong')
  assert.equal(parseTagName('<!-- ignored -->'), '')
  assert.equal(parseTagName('<!doctype html>'), '')
})

test('HTML tag helpers detect closing tags using the same parser shape', () => {
  assert.equal(isClosingTag('</span>'), true)
  assert.equal(isClosingTag('< /span>'), true)
  assert.equal(isClosingTag('<span />'), false)
  assert.equal(isClosingTag('plain text'), false)
})

test('HTML tag helpers parse and entity-decode quoted and unquoted attributes', () => {
  assert.deepEqual(
    parseTagAttributes(
      '<span STYLE="color:Blue" data-name=\'Steam &amp; Serif\' title=Backup&nbsp;Label disabled>',
    ),
    {
      'data-name': 'Steam & Serif',
      style: 'color:Blue',
      title: 'Backup Label',
    },
  )
})
