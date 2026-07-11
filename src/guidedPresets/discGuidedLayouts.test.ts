import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import type { DiscRolePresetId } from '../layout/discRolePresets.ts'
import {
  DISC_GUIDED_LAYOUT_DEFINITIONS,
  DISC_GUIDED_LAYOUT_IDS,
  getDiscGuidedLayoutDefinition,
  getDiscGuidedLayoutIdForRolePreset,
  getDiscGuidedLayoutSlotDefinition,
  getDiscGuidedSlotGeometry,
  isDiscGuidedRectGeometry,
  parseDiscGuidedRectGeometry,
  type DiscGuidedRectGeometry,
} from './discGuidedLayouts.ts'

const CLASSIC_LAYOUT_ID = 'disc:guided-layout:classic-top-title'
const GAME_TITLE_SLOT_ID = 'disc:guided:game-title:primary'
const CLASSIC_SLOT_ORDER = [
  'disc:guided:background-image:primary',
  GAME_TITLE_SLOT_ID,
  'disc:guided:rating:primary',
  'disc:guided:company-logo:primary',
  'disc:guided:legal-text:copyright',
] as const

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

test('Classic Top Title defines the five required slots in visual-layer order', () => {
  const definition = getDiscGuidedLayoutDefinition(CLASSIC_LAYOUT_ID)

  assert.ok(definition)
  assert.equal(definition.baseRolePresetId, 'classic-top-title')
  assert.deepEqual(definition.slotOrder, CLASSIC_SLOT_ORDER)
  assert.deepEqual(Object.keys(definition.slots), CLASSIC_SLOT_ORDER)
  assert.deepEqual(
    definition.slotOrder.map((slotId) => ({
      slotId,
      label: definition.slots[slotId]?.label,
      setupKind: definition.slots[slotId]?.setupKind,
      visualLayer: definition.slots[slotId]?.visualLayer,
    })),
    [
      {
        slotId: 'disc:guided:background-image:primary',
        label: 'Background Image',
        setupKind: 'background',
        visualLayer: 'background',
      },
      {
        slotId: GAME_TITLE_SLOT_ID,
        label: 'Game Title',
        setupKind: 'game-title-choice',
        visualLayer: 'foreground',
      },
      {
        slotId: 'disc:guided:rating:primary',
        label: 'Game Info Logos',
        setupKind: 'rating',
        visualLayer: 'foreground',
      },
      {
        slotId: 'disc:guided:company-logo:primary',
        label: 'Company Logos',
        setupKind: 'company-logo-choice',
        visualLayer: 'foreground',
      },
      {
        slotId: 'disc:guided:legal-text:copyright',
        label: 'Legal Info',
        setupKind: 'legal',
        visualLayer: 'foreground',
      },
    ],
  )
})

test('Classic Top Title uses exact normalized visual and action geometry', () => {
  const expected = {
    'disc:guided:background-image:primary': {
      visual: [50, 50, 92, 92],
      action: [50, 36, 34, 10],
    },
    [GAME_TITLE_SLOT_ID]: {
      visual: [50, 19.5, 62, 16],
      action: [50, 19.5, 62, 16],
    },
    'disc:guided:rating:primary': {
      visual: [78, 68, 20, 18],
      action: [78, 68, 20, 18],
    },
    'disc:guided:company-logo:primary': {
      visual: [22, 69, 28, 22],
      action: [22, 69, 28, 22],
    },
    'disc:guided:legal-text:copyright': {
      visual: [50, 88, 64, 12],
      action: [50, 88, 64, 12],
    },
  } as const

  for (const slotId of CLASSIC_SLOT_ORDER) {
    const slot = getDiscGuidedLayoutSlotDefinition(CLASSIC_LAYOUT_ID, slotId)

    assert.ok(slot)
    assert.deepEqual([
      slot.visualGeometry.centerXPercent,
      slot.visualGeometry.centerYPercent,
      slot.visualGeometry.widthPercent,
      slot.visualGeometry.heightPercent,
    ], expected[slotId].visual)
    assert.deepEqual([
      slot.actionGeometry.centerXPercent,
      slot.actionGeometry.centerYPercent,
      slot.actionGeometry.widthPercent,
      slot.actionGeometry.heightPercent,
    ], expected[slotId].action)
    assert.equal(isDiscGuidedRectGeometry(slot.visualGeometry), true)
    assert.equal(isDiscGuidedRectGeometry(slot.actionGeometry), true)
  }

  const background = getDiscGuidedLayoutSlotDefinition(
    CLASSIC_LAYOUT_ID,
    'disc:guided:background-image:primary',
  )
  assert.ok(background)
  assert.notDeepEqual(background.visualGeometry, background.actionGeometry)
})

function getBounds(geometry: DiscGuidedRectGeometry) {
  return {
    left: geometry.centerXPercent - geometry.widthPercent / 2,
    right: geometry.centerXPercent + geometry.widthPercent / 2,
    top: geometry.centerYPercent - geometry.heightPercent / 2,
    bottom: geometry.centerYPercent + geometry.heightPercent / 2,
  }
}

test('foreground rectangles do not overlap and background underlays all of them', () => {
  const slots = CLASSIC_SLOT_ORDER.map((slotId) =>
    getDiscGuidedLayoutSlotDefinition(CLASSIC_LAYOUT_ID, slotId),
  )
  assert.ok(slots.every(Boolean))

  const background = slots[0]!
  const foreground = slots.slice(1).map((slot) => slot!)
  const backgroundBounds = getBounds(background.visualGeometry)

  for (let firstIndex = 0; firstIndex < foreground.length; firstIndex += 1) {
    const firstBounds = getBounds(foreground[firstIndex]!.visualGeometry)

    assert.ok(firstBounds.left >= backgroundBounds.left)
    assert.ok(firstBounds.right <= backgroundBounds.right)
    assert.ok(firstBounds.top >= backgroundBounds.top)
    assert.ok(firstBounds.bottom <= backgroundBounds.bottom)

    for (let secondIndex = firstIndex + 1;
      secondIndex < foreground.length;
      secondIndex += 1) {
      const secondBounds = getBounds(foreground[secondIndex]!.visualGeometry)
      const overlaps = firstBounds.left < secondBounds.right &&
        firstBounds.right > secondBounds.left &&
        firstBounds.top < secondBounds.bottom &&
        firstBounds.bottom > secondBounds.top

      assert.equal(overlaps, false)
    }
  }
})

test('Game Info Logos is scoped only to the primary Rating slot', () => {
  const definition = getDiscGuidedLayoutDefinition(CLASSIC_LAYOUT_ID)

  assert.ok(definition)
  assert.equal(
    definition.slots['disc:guided:rating:primary']?.setupKind,
    'rating',
  )
  assert.equal(
    definition.slotOrder.some((slotId) =>
      slotId.includes('media') ||
      slotId.includes('platform') ||
      slotId.includes('technical')),
    false,
  )
})

test('slot population metadata observes existing owners without running imports', () => {
  const definition = getDiscGuidedLayoutDefinition(CLASSIC_LAYOUT_ID)

  assert.ok(definition)
  assert.deepEqual(
    definition.slotOrder.map((slotId) =>
      definition.slots[slotId]?.populationSource),
    [
      'none',
      'existing-steam-import',
      'accepted-metadata',
      'existing-owner-only',
      'accepted-metadata',
    ],
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
  assert.equal(Object.isFrozen(definition.slotOrder), true)
  assert.equal(Object.isFrozen(definition.slots), true)
  assert.equal(
    Object.isFrozen(definition.slots[GAME_TITLE_SLOT_ID]),
    true,
  )
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
  assert.equal(
    getDiscGuidedLayoutSlotDefinition(CLASSIC_LAYOUT_ID, 'disc:guided:missing'),
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
