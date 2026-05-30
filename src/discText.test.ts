import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextLayout,
  normalizeDiscTextLayout,
  updateDiscTextVisualAvoidance,
} from './discText.ts'

test('disc text visual avoidance defaults off and restores saved opt-in state', () => {
  const defaults = normalizeDiscTextLayout(undefined, 'top')
  const restored = normalizeDiscTextLayout(
    {
      title: {
        avoidVisualElements: true,
      },
      subtitle: {
        y: 25,
      },
    },
    'top',
  )

  assert.equal(defaults.title.avoidVisualElements, false)
  assert.equal(defaults.subtitle.avoidVisualElements, false)
  assert.equal(restored.title.avoidVisualElements, true)
  assert.equal(restored.subtitle.avoidVisualElements, false)
  assert.equal(restored.subtitle.y, 25)
})

test('updating disc text visual avoidance preserves existing layout fields', () => {
  const layout = createDefaultDiscTextLayout('top')
  const updated = updateDiscTextVisualAvoidance(layout, 'customNote', true)

  assert.equal(updated.customNote.avoidVisualElements, true)
  assert.equal(updated.customNote.x, layout.customNote.x)
  assert.equal(updated.customNote.y, layout.customNote.y)
  assert.equal(updated.customNote.width, layout.customNote.width)
  assert.equal(updated.customNote.scale, layout.customNote.scale)
  assert.strictEqual(updated.title, layout.title)
})
