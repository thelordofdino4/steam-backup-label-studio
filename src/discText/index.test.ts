import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextLayout,
  normalizeDiscTextLayout,
  updateDiscTextVisualAvoidance,
} from './index.ts'
import { getDefaultDiscTextPointSize } from './pointSize.ts'
import { discTemplates } from '../templates/discTemplates.ts'

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

test('disc text layouts backfill point sizes from legacy scale values', () => {
  const restored = normalizeDiscTextLayout(
    {
      title: {
        scale: 1.2,
      },
      copyright: {
        mode: 'curved',
        scale: 0.92,
      },
    },
    'top',
    discTemplates.standardPrintableDisc,
  )

  assert.equal(
    restored.title.fontSizePt,
    getDefaultDiscTextPointSize(
      'title',
      1.2,
      discTemplates.standardPrintableDisc,
    ),
  )
  assert.equal(
    restored.copyright.fontSizePt,
    getDefaultDiscTextPointSize(
      'copyright',
      0.92,
      discTemplates.standardPrintableDisc,
      'curved',
    ),
  )
})

test('disc text layout normalization preserves explicit point sizes', () => {
  const restored = normalizeDiscTextLayout(
    {
      title: {
        fontSizePt: 18.25,
        scale: 1.2,
      },
      copyright: {
        fontSizePt: 5.25,
        mode: 'curved',
        scale: 1.8,
      },
    },
    'top',
    discTemplates.standardPrintableDisc,
  )

  assert.equal(restored.title.fontSizePt, 18.25)
  assert.equal(restored.title.scale, 1.2)
  assert.equal(restored.copyright.fontSizePt, 5.25)
  assert.equal(restored.copyright.scale, 1.8)
})

test('updating disc text visual avoidance preserves existing layout fields', () => {
  const layout = createDefaultDiscTextLayout('top')
  const updated = updateDiscTextVisualAvoidance(layout, 'customNote', true)

  assert.equal(updated.customNote.avoidVisualElements, true)
  assert.equal(updated.customNote.x, layout.customNote.x)
  assert.equal(updated.customNote.y, layout.customNote.y)
  assert.equal(updated.customNote.width, layout.customNote.width)
  assert.equal(updated.customNote.scale, layout.customNote.scale)
  assert.equal(updated.customNote.fontSizePt, layout.customNote.fontSizePt)
  assert.strictEqual(updated.title, layout.title)
})
