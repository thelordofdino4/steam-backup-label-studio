import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkMarkdown } from './check-docs.mjs'

const inspect = (text, exists = () => true) => checkMarkdown('/repo/docs/example.md', text, exists)

test('local links resolve relative to the document; remote URLs and anchors are not filesystem paths', () => {
  const checked = []
  const errors = inspect('[source](../src/owner.ts#entry) [remote](https://example.test/page) [heading](#title) [space](<folder/a%20b.md>)', target => {
    checked.push(target.replaceAll('\\', '/'))
    return !target.endsWith('owner.ts')
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /missing local link target/)
  assert.equal(checked.length, 2)
  assert.ok(checked[0].endsWith('/repo/src/owner.ts'))
  assert.ok(checked[1].endsWith('/repo/docs/folder/a b.md'))
})

test('fenced examples do not create false links, tables or stale claims; fences must match', () => {
  assert.deepEqual(inspect('````md\n```\n[old](missing)\nLicense not chosen yet.\n````', () => false), [])
  assert.match(inspect('~~~md\nexample\n```')[0], /unclosed ~ fence/)
})

test('tables accept escaped pipes and reject missing cells', () => {
  assert.deepEqual(inspect('| A | B |\n| --- | --- |\n| a\\|b | c |'), [])
  const errors = inspect('| A | B |\n| --- | --- |\n| missing |')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /1 cells; expected 2/)
})

test('known stale current-state markers fail without rejecting corrected history descriptions', () => {
  assert.equal(inspect('Guide Legend remains in the sidebar today.').length, 1)
  assert.deepEqual(inspect('Guide Legend is preview-local; older sidebar wording is historical.'), [])
})

test('malformed percent encoding yields a diagnostic instead of aborting the scan', () => {
  assert.match(inspect('[broken](a%zz.md)')[0], /invalid local link encoding/)
})
