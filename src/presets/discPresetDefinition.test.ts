import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { CLASSIC_TOP_TITLE_DISC_PRESET } from './builtins/classicTopTitleDiscPreset.ts'
import {
  DISC_PRESET_MAX_DESCRIPTION_LENGTH,
  DISC_PRESET_MAX_NAME_LENGTH,
  DISC_PRESET_MAX_SLOTS,
  isBuiltInDiscPresetId,
  isUserDiscPresetId,
  parseDiscPresetDefinition,
  type DiscPresetDefinitionParseErrorCode,
} from './discPresetDefinition.ts'

function mutableClassic(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(CLASSIC_TOP_TITLE_DISC_PRESET)) as Record<string, unknown>
}

function expectFailure(
  value: unknown,
  code: DiscPresetDefinitionParseErrorCode,
) {
  const result = parseDiscPresetDefinition(value)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, code)
}

test('parses Classic and reconstructs immutable trusted data', () => {
  const result = parseDiscPresetDefinition(mutableClassic())
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.value.id, 'builtin:disc-preset:classic-top-title')
  assert.equal(result.value.formatVersion, 1)
  assert.equal(result.value.revision, 1)
  assert.equal(result.value.slots.length, 8)
  assert.ok(Object.isFrozen(result.value))
  assert.ok(Object.isFrozen(result.value.slots))
  assert.ok(Object.isFrozen(result.value.slots[0]?.contentRegion))
  assert.ok(Object.isFrozen(result.value.slots[0]?.placements))
})

test('accepts stable built-in and future user UUID namespaces', () => {
  assert.equal(isBuiltInDiscPresetId('builtin:disc-preset:classic-top-title'), true)
  assert.equal(
    isUserDiscPresetId('user:disc-preset:123e4567-e89b-42d3-a456-426614174000'),
    true,
  )

  const user = mutableClassic()
  user.id = 'user:disc-preset:123e4567-e89b-42d3-a456-426614174000'
  user.name = 'Renamed without changing identity'
  const result = parseDiscPresetDefinition(user)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.value.id, user.id)

  for (const id of [
    'classic-top-title',
    'builtin:disc-preset:Has Spaces',
    'user:disc-preset:not-a-uuid',
    'file:C:/preset.json',
  ]) {
    const invalid = mutableClassic()
    invalid.id = id
    expectFailure(invalid, 'invalid-id')
  }
})

test('rejects unsupported formats and invalid revisions', () => {
  for (const formatVersion of [0, 2, '1']) {
    const value = mutableClassic()
    value.formatVersion = formatVersion
    expectFailure(value, 'unsupported-format-version')
  }

  for (const revision of [0, -1, Number.MAX_SAFE_INTEGER + 1, 1.5]) {
    const value = mutableClassic()
    value.revision = revision
    expectFailure(value, 'invalid-revision')
  }
})

test('rejects invalid regions without clamping nominal geometry', () => {
  for (const [field, value] of [
    ['centerXPercent', Number.NaN],
    ['centerYPercent', Number.POSITIVE_INFINITY],
    ['centerXPercent', -1],
    ['centerYPercent', 101],
    ['widthPercent', 0],
    ['heightPercent', -1],
    ['widthPercent', 101],
  ] as const) {
    const definition = mutableClassic()
    const slots = definition.slots as Array<Record<string, unknown>>
    const region = slots[0]?.contentRegion as Record<string, unknown>
    region[field] = value
    expectFailure(definition, 'invalid-region')
  }

  const action = mutableClassic()
  const actionSlots = action.slots as Array<Record<string, unknown>>
  const actionRegion = actionSlots[1]?.actionRegion as Record<string, unknown>
  actionRegion.heightPercent = 0
  expectFailure(action, 'invalid-region')
})

test('rejects invalid slot catalogs and visual layers', () => {
  const duplicate = mutableClassic()
  const duplicateSlots = duplicate.slots as unknown[]
  duplicateSlots[1] = structuredClone(duplicateSlots[0])
  expectFailure(duplicate, 'duplicate-slot')

  const unknown = mutableClassic()
  const unknownSlots = unknown.slots as Array<Record<string, unknown>>
  unknownSlots[0]!.id = 'disc:guided:future-slot:primary'
  expectFailure(unknown, 'unsupported-slot')

  const excessive = mutableClassic()
  excessive.slots = Array.from(
    { length: DISC_PRESET_MAX_SLOTS + 1 },
    () => structuredClone((mutableClassic().slots as unknown[])[0]),
  )
  expectFailure(excessive, 'too-many-slots')

  const layer = mutableClassic()
  const layerSlots = layer.slots as Array<Record<string, unknown>>
  layerSlots[0]!.visualLayer = 'overlay'
  expectFailure(layer, 'invalid-visual-layer')
})

test('validates placement kinds targets compatibility and uniqueness', () => {
  const unknownKind = mutableClassic()
  const unknownKindSlots = unknownKind.slots as Array<Record<string, unknown>>
  unknownKindSlots[0]!.placements = [{ kind: 'script', target: 'game-title.text' }]
  expectFailure(unknownKind, 'unsupported-placement')

  const unsupportedTarget = mutableClassic()
  const unsupportedSlots = unsupportedTarget.slots as Array<Record<string, unknown>>
  unsupportedSlots[0]!.placements = [{
    kind: 'point',
    target: 'project.owner.layout.x',
    size: { mode: 'fixed-scale', scale: 1 },
  }]
  expectFailure(unsupportedTarget, 'unsupported-target')

  const mismatch = mutableClassic()
  const mismatchSlots = mismatch.slots as Array<Record<string, unknown>>
  mismatchSlots[2]!.placements = [{
    kind: 'point',
    target: 'media-format.primary',
    size: { mode: 'fixed-scale', scale: 1 },
  }]
  expectFailure(mismatch, 'target-slot-mismatch')

  const duplicate = mutableClassic()
  const duplicateSlots = duplicate.slots as Array<Record<string, unknown>>
  const firstPlacement = structuredClone(
    (duplicateSlots[0]!.placements as unknown[])[0],
  )
  duplicateSlots[0]!.placements = [firstPlacement, structuredClone(firstPlacement)]
  expectFailure(duplicate, 'duplicate-target')

  const curved = mutableClassic()
  const curvedSlots = curved.slots as Array<Record<string, unknown>>
  const legalPlacement = (curvedSlots[7]!.placements as Array<Record<string, unknown>>)[0]!
  legalPlacement.mode = 'curved'
  expectFailure(curved, 'invalid-placement')
})

test('accepts Game Title multi-intent and OS group placement', () => {
  const result = parseDiscPresetDefinition(mutableClassic())
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(
    result.value.slots[0]?.placements.map(({ kind, target }) => [kind, target]),
    [
      ['point', 'game-title.artwork'],
      ['text', 'game-title.text'],
    ],
  )
  assert.deepEqual(result.value.slots[4]?.placements, [
    { kind: 'group', target: 'operating-system-marks.enabled' },
  ])
})

test('enforces bounded strings and strict object fields without throwing', () => {
  const longName = mutableClassic()
  longName.name = 'x'.repeat(DISC_PRESET_MAX_NAME_LENGTH + 1)
  expectFailure(longName, 'invalid-name')

  const longDescription = mutableClassic()
  longDescription.description = 'x'.repeat(DISC_PRESET_MAX_DESCRIPTION_LENGTH + 1)
  expectFailure(longDescription, 'invalid-description')

  const extra = mutableClassic()
  extra.__proto_payload__ = { polluted: true }
  expectFailure(extra, 'unexpected-field')

  for (const malformed of [null, [], 'preset', 42, { kind: 'sbls/disc-preset' }]) {
    assert.doesNotThrow(() => parseDiscPresetDefinition(malformed))
    assert.equal(parseDiscPresetDefinition(malformed).ok, false)
  }
})

test('preset definition source stays isolated from app and runtime side effects', () => {
  const source = readFileSync(new URL('./discPresetDefinition.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(
    source,
    /React|App\.tsx|components|document\.|window\.|projectSchema|createProjectSnapshot|restoreProject|renderer|exportPng|caseInsert|fetch\(|localStorage|sessionStorage|eval\(|Function\(/i,
  )
  assert.doesNotMatch(source, /node:fs|@tauri-apps|https?:\/\//i)
})
