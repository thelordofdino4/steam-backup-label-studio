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
  parseDiscGuidedRectGeometry,
  type DiscGuidedRectGeometry,
} from './discGuidedLayouts.ts'

const LAYOUT_ID = 'disc:guided-layout:classic-top-title'
const SLOT_ORDER = [
  'disc:guided:game-title:primary',
  'disc:guided:background-image:primary',
  'disc:guided:rating-badge:primary',
  'disc:guided:media-format-mark:primary',
  'disc:guided:operating-system-marks:group',
  'disc:guided:developer-logo:primary',
  'disc:guided:publisher-logo:primary',
  'disc:guided:legal-text:copyright',
] as const

const EXPECTED = [
  ['Game Title', 'game-title-choice', 'foreground', [50, 19.5, 62, 16], [50, 19.5, 62, 16]],
  ['Background Image', 'background', 'background', [50, 50, 92, 92], [50, 34, 34, 8]],
  ['Rating Badge', 'rating-badge', 'foreground', [79, 62, 20, 14], [79, 62, 20, 14]],
  ['Media Format Mark', 'media-format-mark', 'foreground', [80, 76, 22, 9], [80, 76, 22, 9]],
  ['Operating System Marks', 'operating-system-marks', 'foreground', [50, 73, 28, 10], [50, 73, 28, 10]],
  ['Developer Logo', 'developer-logo', 'foreground', [21, 62, 26, 9], [21, 62, 26, 9]],
  ['Publisher Logo', 'publisher-logo', 'foreground', [21, 74, 26, 9], [21, 74, 26, 9]],
  ['Copyright / Legal Text', 'legal-text', 'foreground', [50, 89, 64, 8], [50, 89, 64, 8]],
] as const

function tuple(geometry: DiscGuidedRectGeometry) {
  return [
    geometry.centerXPercent,
    geometry.centerYPercent,
    geometry.widthPercent,
    geometry.heightPercent,
  ]
}

function bounds(geometry: DiscGuidedRectGeometry) {
  return {
    left: geometry.centerXPercent - geometry.widthPercent / 2,
    right: geometry.centerXPercent + geometry.widthPercent / 2,
    top: geometry.centerYPercent - geometry.heightPercent / 2,
    bottom: geometry.centerYPercent + geometry.heightPercent / 2,
  }
}

test('maps only Classic Top Title to one stable guided layout', () => {
  assert.deepEqual(DISC_GUIDED_LAYOUT_IDS, [LAYOUT_ID])
  assert.equal(DISC_GUIDED_LAYOUT_DEFINITIONS.length, 1)
  assert.equal(getDiscGuidedLayoutIdForRolePreset('classic-top-title'), LAYOUT_ID)

  for (const id of ['centered-logo-archive', 'clean-metadata-footer'] as const satisfies readonly DiscRolePresetId[]) {
    assert.equal(getDiscGuidedLayoutIdForRolePreset(id), null)
  }
})

test('Classic defines exactly eight concrete slots in product order', () => {
  const layout = getDiscGuidedLayoutDefinition(LAYOUT_ID)
  assert.ok(layout)
  assert.deepEqual(layout.slotOrder, SLOT_ORDER)
  assert.deepEqual(Object.keys(layout.slots), [
    'disc:guided:background-image:primary',
    'disc:guided:game-title:primary',
    ...SLOT_ORDER.slice(2),
  ])
  assert.equal(layout.slotOrder.length, 8)
  assert.doesNotMatch(layout.slotOrder.join(' '), /rating:primary|company-logo:primary/)
})

test('Classic uses exact labels setup kinds layers and geometry', () => {
  assert.deepEqual(SLOT_ORDER.map((slotId) => {
    const slot = getDiscGuidedLayoutSlotDefinition(LAYOUT_ID, slotId)
    assert.ok(slot)
    return [
      slot.label,
      slot.setupKind,
      slot.visualLayer,
      tuple(slot.visualGeometry),
      tuple(slot.actionGeometry),
    ]
  }), EXPECTED)
})

test('the seven foreground regions do not overlap', () => {
  const foreground = SLOT_ORDER.flatMap((slotId) => {
    const slot = getDiscGuidedLayoutSlotDefinition(LAYOUT_ID, slotId)
    return slot?.visualLayer === 'foreground' ? [slot.visualGeometry] : []
  })
  assert.equal(foreground.length, 7)

  for (let first = 0; first < foreground.length; first += 1) {
    for (let second = first + 1; second < foreground.length; second += 1) {
      const a = bounds(foreground[first]!)
      const b = bounds(foreground[second]!)
      const overlaps = a.left < b.right && a.right > b.left &&
        a.top < b.bottom && a.bottom > b.top
      assert.equal(overlaps, false)
    }
  }
})

test('all geometry is normalized and Background keeps distinct visual/action regions', () => {
  for (const slotId of SLOT_ORDER) {
    const slot = getDiscGuidedLayoutSlotDefinition(LAYOUT_ID, slotId)
    assert.ok(slot)
    for (const geometry of [slot.visualGeometry, slot.actionGeometry]) {
      const result = parseDiscGuidedRectGeometry(geometry)
      assert.equal(result.ok, true)
      const region = bounds(geometry)
      assert.ok(region.left >= 0 && region.right <= 100)
      assert.ok(region.top >= 0 && region.bottom <= 100)
    }
  }

  const background = getDiscGuidedLayoutSlotDefinition(
    LAYOUT_ID,
    'disc:guided:background-image:primary',
  )
  assert.ok(background)
  assert.notDeepEqual(background.visualGeometry, background.actionGeometry)
})

test('guided geometry remains pure normalized editor guidance', () => {
  const source = readFileSync(new URL('./discGuidedLayouts.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /projectSchema|savedProject|renderer|caseInsert|fetch\(/i)
  assert.doesNotMatch(source, /Game Info Logos|Company Logos/)
})
