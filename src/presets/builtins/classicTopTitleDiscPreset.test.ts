import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  CLASSIC_TOP_TITLE_DISC_PRESET,
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
} from './classicTopTitleDiscPreset.ts'
import { parseDiscPresetDefinition } from '../discPresetDefinition.ts'

const SLOT_ORDER = [
  'disc:guided:game-title:primary',
  'disc:guided:background-image:primary',
  'disc:guided:rating-badge:primary',
  'disc:guided:media-format-mark:primary',
  'disc:guided:operating-system-marks:group',
  'disc:guided:developer-logo:primary',
  'disc:guided:publisher-logo:primary',
  'disc:guided:legal-text:copyright',
]

test('Classic is the exact first built-in serializable Disc preset', () => {
  assert.equal(CLASSIC_TOP_TITLE_DISC_PRESET_ID, 'builtin:disc-preset:classic-top-title')
  assert.equal(CLASSIC_TOP_TITLE_DISC_PRESET.kind, 'sbls/disc-preset')
  assert.equal(CLASSIC_TOP_TITLE_DISC_PRESET.formatVersion, 1)
  assert.equal(CLASSIC_TOP_TITLE_DISC_PRESET.revision, 1)
  assert.equal(CLASSIC_TOP_TITLE_DISC_PRESET.surface, 'disc')
  assert.deepEqual(CLASSIC_TOP_TITLE_DISC_PRESET.compatibility, {
    mode: 'any-disc-template',
    onConflict: 'resolve',
  })
  assert.deepEqual(
    CLASSIC_TOP_TITLE_DISC_PRESET.slots.map(({ id }) => id),
    SLOT_ORDER,
  )
})

test('Classic owns exact content action layer and placement data', () => {
  assert.deepEqual(CLASSIC_TOP_TITLE_DISC_PRESET.slots.map((slot) => ({
    id: slot.id,
    content: Object.values(slot.contentRegion),
    action: Object.values(slot.actionRegion ?? slot.contentRegion),
    layer: slot.visualLayer,
    targets: slot.placements.map(({ target }) => target),
  })), [
    { id: SLOT_ORDER[0], content: [50, 19.5, 62, 16], action: [50, 19.5, 62, 16], layer: 'foreground', targets: ['game-title.artwork', 'game-title.text'] },
    { id: SLOT_ORDER[1], content: [50, 50, 92, 92], action: [50, 34, 34, 8], layer: 'background', targets: ['background.primary'] },
    { id: SLOT_ORDER[2], content: [79, 62, 20, 14], action: [79, 62, 20, 14], layer: 'foreground', targets: ['rating.primary'] },
    { id: SLOT_ORDER[3], content: [80, 76, 22, 9], action: [80, 76, 22, 9], layer: 'foreground', targets: ['media-format.primary'] },
    { id: SLOT_ORDER[4], content: [50, 73, 28, 10], action: [50, 73, 28, 10], layer: 'foreground', targets: ['operating-system-marks.enabled'] },
    { id: SLOT_ORDER[5], content: [21, 62, 26, 9], action: [21, 62, 26, 9], layer: 'foreground', targets: ['developer-logo.primary'] },
    { id: SLOT_ORDER[6], content: [21, 74, 26, 9], action: [21, 74, 26, 9], layer: 'foreground', targets: ['publisher-logo.primary'] },
    { id: SLOT_ORDER[7], content: [50, 85, 46, 8], action: [50, 85, 46, 8], layer: 'foreground', targets: ['legal.copyright'] },
  ])
})

test('Classic round trips through canonical JSON without runtime values', () => {
  const json = JSON.stringify(CLASSIC_TOP_TITLE_DISC_PRESET)
  const reparsed = parseDiscPresetDefinition(JSON.parse(json))
  assert.equal(reparsed.ok, true)
  if (!reparsed.ok) return
  assert.deepEqual(reparsed.value, CLASSIC_TOP_TITLE_DISC_PRESET)
  assert.equal(JSON.stringify(reparsed.value), json)
  assert.doesNotMatch(json, /function|undefined|\[object (Map|Set)\]/)
})

test('guided geometry imports Classic instead of declaring coordinate constants', () => {
  const guidedSource = readFileSync(
    new URL('../../guidedPresets/discGuidedLayouts.ts', import.meta.url),
    'utf8',
  )
  const builtinSource = readFileSync(
    new URL('./classicTopTitleDiscPreset.ts', import.meta.url),
    'utf8',
  )
  assert.match(guidedSource, /CLASSIC_TOP_TITLE_DISC_PRESET/)
  assert.doesNotMatch(guidedSource, /CLASSIC_(RATING|MEDIA_FORMAT|LEGAL)_GEOMETRY/)
  assert.doesNotMatch(guidedSource, /centerXPercent:\s*(21|50|79|80)/)
  assert.doesNotMatch(
    builtinSource,
    /React|App\.tsx|components|document\.|window\.|projectSchema|renderer|exportPng|caseInsert|fetch\(|localStorage|node:fs|@tauri-apps/i,
  )
})
