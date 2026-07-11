import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import type { DiscRolePresetId } from '../layout/discRolePresets.ts'
import {
  DISC_GUIDED_LAYOUT_DEFINITIONS,
  DISC_GUIDED_LAYOUT_IDS,
  getDiscGuidedLayoutDefinition,
  getDiscGuidedLayoutIdForRolePreset,
  getDiscGuidedSlotGeometry,
  isDiscGuidedRectGeometry,
  parseDiscGuidedRectGeometry,
  type DiscGuidedRectGeometry,
} from './discGuidedLayouts.ts'

const CLASSIC_LAYOUT_ID = 'disc:guided-layout:classic-top-title'
const GAME_TITLE_SLOT_ID = 'disc:guided:game-title:primary'

const VALID_GEOMETRY: DiscGuidedRectGeometry = {
  kind: 'rect',
  centerXPercent: 50,
  centerYPercent: 19.5,
  widthPercent: 62,
  heightPercent: 16,
  contentAlignment: {
    horizontal: 'center',
    vertical: 'center',
  },
}

test('defines one stable initial guided-layout identity', () => {
  assert.deepEqual(DISC_GUIDED_LAYOUT_IDS, [CLASSIC_LAYOUT_ID])
  assert.equal(new Set(DISC_GUIDED_LAYOUT_IDS).size, 1)
  assert.equal(DISC_GUIDED_LAYOUT_DEFINITIONS.length, 1)
  assert.equal(
    new Set(DISC_GUIDED_LAYOUT_DEFINITIONS.map(({ id }) => id)).size,
    DISC_GUIDED_LAYOUT_DEFINITIONS.length,
  )
})

test('maps only Classic Top Title to the initial guided layout', () => {
  assert.equal(
    getDiscGuidedLayoutIdForRolePreset('classic-top-title'),
    CLASSIC_LAYOUT_ID,
  )

  for (const unmappedPresetId of [
    'centered-logo-archive',
    'clean-metadata-footer',
  ] as const satisfies readonly DiscRolePresetId[]) {
    assert.equal(getDiscGuidedLayoutIdForRolePreset(unmappedPresetId), null)
  }
})

test('Classic Top Title defines only normalized Game Title geometry', () => {
  const definition = getDiscGuidedLayoutDefinition(CLASSIC_LAYOUT_ID)

  assert.ok(definition)
  assert.equal(definition.baseRolePresetId, 'classic-top-title')
  assert.deepEqual(Object.keys(definition.slots), [GAME_TITLE_SLOT_ID])
  assert.deepEqual(definition.slots[GAME_TITLE_SLOT_ID], VALID_GEOMETRY)
  assert.equal(
    definition.slots['disc:guided:background-image:primary'],
    undefined,
  )
})

test('valid geometry parses to a defensive frozen value', () => {
  const result = parseDiscGuidedRectGeometry(VALID_GEOMETRY)

  assert.equal(result.ok, true)
  assert.equal(isDiscGuidedRectGeometry(VALID_GEOMETRY), true)

  if (!result.ok) return

  assert.deepEqual(result.value, VALID_GEOMETRY)
  assert.notEqual(result.value, VALID_GEOMETRY)
  assert.equal(Object.isFrozen(result.value), true)
  assert.equal(Object.isFrozen(result.value.contentAlignment), true)
})

test('geometry rejects non-finite numeric fields without throwing', () => {
  const numericFields = [
    'centerXPercent',
    'centerYPercent',
    'widthPercent',
    'heightPercent',
    'rotationDegrees',
  ] as const

  for (const field of numericFields) {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.doesNotThrow(() => parseDiscGuidedRectGeometry({
        ...VALID_GEOMETRY,
        [field]: value,
      }))
      assert.equal(isDiscGuidedRectGeometry({
        ...VALID_GEOMETRY,
        [field]: value,
      }), false)
    }
  }
})

test('geometry rejects invalid centers and dimensions', () => {
  for (const field of ['centerXPercent', 'centerYPercent'] as const) {
    for (const value of [-0.01, 100.01]) {
      assert.deepEqual(
        parseDiscGuidedRectGeometry({ ...VALID_GEOMETRY, [field]: value }),
        { ok: false, error: 'invalid-center' },
      )
    }
  }

  for (const field of ['widthPercent', 'heightPercent'] as const) {
    for (const value of [-1, 0, 100.01]) {
      assert.deepEqual(
        parseDiscGuidedRectGeometry({ ...VALID_GEOMETRY, [field]: value }),
        { ok: false, error: 'invalid-size' },
      )
    }
  }
})

test('geometry rejects malformed alignment and unexpected fields', () => {
  for (const contentAlignment of [
    null,
    {},
    { horizontal: 'middle', vertical: 'center' },
    { horizontal: 'center', vertical: 'middle' },
    { horizontal: 'center', vertical: 'center', domId: 'title' },
  ]) {
    assert.deepEqual(
      parseDiscGuidedRectGeometry({ ...VALID_GEOMETRY, contentAlignment }),
      { ok: false, error: 'invalid-alignment' },
    )
  }

  assert.deepEqual(
    parseDiscGuidedRectGeometry({ ...VALID_GEOMETRY, viewportWidth: 800 }),
    { ok: false, error: 'unexpected-field' },
  )
})

test('malformed unknown geometry fails safely', () => {
  const invalidValues = [
    null,
    undefined,
    'rect',
    [],
    {},
    { ...VALID_GEOMETRY, kind: 'arc' },
  ]

  for (const value of invalidValues) {
    assert.doesNotThrow(() => parseDiscGuidedRectGeometry(value))
    assert.equal(parseDiscGuidedRectGeometry(value).ok, false)
  }
})

test('layout and slot lookup fail safely and return immutable definitions', () => {
  const definition = getDiscGuidedLayoutDefinition(CLASSIC_LAYOUT_ID)
  const geometry = getDiscGuidedSlotGeometry(
    CLASSIC_LAYOUT_ID,
    GAME_TITLE_SLOT_ID,
  )

  assert.ok(definition)
  assert.ok(geometry)
  assert.equal(Object.isFrozen(DISC_GUIDED_LAYOUT_IDS), true)
  assert.equal(Object.isFrozen(DISC_GUIDED_LAYOUT_DEFINITIONS), true)
  assert.equal(Object.isFrozen(definition), true)
  assert.equal(Object.isFrozen(definition.slots), true)
  assert.equal(Object.isFrozen(geometry), true)
  assert.equal(getDiscGuidedLayoutDefinition('disc:guided-layout:unknown'), null)
  assert.equal(
    getDiscGuidedSlotGeometry(CLASSIC_LAYOUT_ID, 'disc:guided:missing'),
    null,
  )
  assert.equal(
    getDiscGuidedSlotGeometry('disc:guided-layout:unknown', GAME_TITLE_SLOT_ID),
    null,
  )
})

test('source has no UI, persistence, renderer, export, Case Insert, or interaction dependencies', () => {
  const source = readFileSync(
    new URL('./discGuidedLayouts.ts', import.meta.url),
    'utf8',
  )
  const forbiddenSource = [
    'react',
    'components/',
    'App.tsx',
    'DiscPreview',
    'PreviewElementOverlay',
    'editorRoleFocus',
    'caseInsert',
    'createProjectSnapshot',
    'savedProjectNormalization',
    'restoreProject',
    'render/',
    'export/',
    'steam/',
    'network',
    'domId',
    'smokeId',
    'getBoundingClientRect',
    'offsetWidth',
    'offsetHeight',
    'window.',
    'document.',
    'px',
  ]

  for (const forbidden of forbiddenSource) {
    assert.equal(source.includes(forbidden), false, `unexpected source: ${forbidden}`)
  }
})
