import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dialogSource = readFileSync(
  new URL('./ProjectReplacementDialog.tsx', import.meta.url),
  'utf8',
)

test('replacement dialog exposes one modal name, description, and three explicit decisions', () => {
  assert.match(dialogSource, /role="dialog"/)
  assert.match(dialogSource, /aria-modal="true"/)
  assert.match(dialogSource, /aria-labelledby="project-replacement-title"/)
  assert.match(dialogSource, /aria-describedby="project-replacement-description"/)
  assert.match(dialogSource, />\s*Save\s*</)
  assert.match(dialogSource, />\s*Discard Changes\s*</)
  assert.match(dialogSource, />\s*Cancel\s*</)
  assert.match(dialogSource, /className="project-replacement-discard"/)
})

test('replacement dialog owns initial focus, contained traversal, Escape, and restoration', () => {
  assert.match(dialogSource, /saveButtonRef\.current\?\.focus\(\)/)
  assert.match(dialogSource, /event\.key === 'Escape'/)
  assert.match(dialogSource, /onDecision\('cancel'\)/)
  assert.match(dialogSource, /event\.key !== 'Tab'/)
  assert.match(dialogSource, /event\.shiftKey/)
  assert.match(dialogSource, /last\.focus\(\)/)
  assert.match(dialogSource, /first\.focus\(\)/)
  assert.match(dialogSource, /previouslyFocused\?\.isConnected/)
  assert.match(dialogSource, /previouslyFocused\.focus\(\)/)
})

test('replacement presentation contains no lifecycle, Save, or project mutation owner', () => {
  for (const forbidden of [
    'commitState',
    'dispatch(',
    'project.save',
    'cleanBaseline',
    'currentPath',
    'setProject',
    'write',
  ]) {
    assert.equal(dialogSource.includes(forbidden), false, forbidden)
  }
})
